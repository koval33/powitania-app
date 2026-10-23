/**
 * Wycena zamowienia w panelu klienta - PODGLAD liczony w przegladarce.
 *
 * To jest lustro app/panel_wycena.py z CRM (zal. 5 umowy ramowej). Zrodlem
 * prawdy o kwocie jest CRM: przy wysylce przelicza zamowienie niezaleznie,
 * a roznica wzgledem tego podgladu ustawia flage "rozbieznosc wyceny".
 * Oba silniki sa sprawdzane tymi samymi przykladami
 * (optimum_CRM/tests/panel_przyklady.json) - patrz scripts/test-panel-pricing.js.
 *
 * Plik dziala w przegladarce (window.PanelPricing) i w Node (module.exports),
 * zeby serwer i formularz liczyly dokladnie tym samym kodem.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.PanelPricing = factory();
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var POLA = {
    tv_internet: 'Telewizja i Internet',
    radio_ogolnopolskie: 'Radio o zasięgu ogólnopolskim',
    internet: 'Internet (bez telewizji)'
  };
  var DLUGOSCI = {
    tv_internet: ['15', '30'],
    radio_ogolnopolskie: ['15', '30'],   // 15 s od 22.10.2026 (samodzielny spot, nie skrot)
    internet: ['60', '120']
  };
  var POLE_PROFILU = {
    'tv_internet|15': 'spot_tv_national',
    'tv_internet|30': 'spot_tv_national',
    'radio_ogolnopolskie|15': 'spot_radio_national_15',
    'radio_ogolnopolskie|30': 'spot_radio_national',
    'internet|60': 'spot_social_1min',
    'internet|120': 'spot_social_2min'
  };
  // Profil ma jedna stawke radiowa (30 s): radio 15 s = 75% w gore do pelnych 50 zl,
  // chyba ze profil ma wlasna (jak STAWKA_POCHODNA_PROFILU w panel_wycena.py).
  var STAWKA_POCHODNA_PROFILU = {
    'radio_ogolnopolskie|15': ['spot_radio_national', 75, 50]
  };
  var TYPY = ['spot', 'wersja_pochodna', 'dogrywka'];
  var UDZWIEKOWIENIA = ['brak', 'powierzona', 'kreatywne'];
  var TRYBY = ['standard', 'ekspres', 'weekend'];
  var DOMYSLNE = {
    waluta: 'PLN',
    wersja_pochodna_proc: 50,
    dogrywka_proc: 50,
    udzwiekowienie: { powierzona: 150, kreatywne: 300 },
    sesja_zdalna: 150,
    ekspres_proc: 50,
    weekend_proc: 50,
    przedluzenie_licencji_proc: 50,
    vat_proc: 23
  };

  function BladWyceny(msg) { this.name = 'BladWyceny'; this.message = msg; }
  BladWyceny.prototype = Object.create(Error.prototype);

  function proc(kwota, procent) { return Math.round(kwota * procent / 100); }

  function parametry(cennik) {
    var p = JSON.parse(JSON.stringify(DOMYSLNE));
    cennik = cennik || {};
    Object.keys(cennik).forEach(function (k) {
      if (k === 'lektorzy') return;
      if (k === 'udzwiekowienie' && cennik[k] && typeof cennik[k] === 'object') {
        Object.keys(cennik[k]).forEach(function (u) { p.udzwiekowienie[u] = cennik[k][u]; });
      } else if (k in p) p[k] = cennik[k];
    });
    return p;
  }

  /** Stawka lektora spoza cennika klienta z jego profilu (prices z voices.json) albo null. */
  function stawkaZProfilu(prices, pole, dlugosc) {
    prices = prices || {};
    var k = pole + '|' + String(dlugosc || '');
    var wlasna = POLE_PROFILU[k] ? prices[POLE_PROFILU[k]] : undefined;
    if (typeof wlasna === 'number' && wlasna > 0) return Math.round(wlasna);
    var poch = STAWKA_POCHODNA_PROFILU[k];
    if (poch && typeof prices[poch[0]] === 'number' && prices[poch[0]] > 0) {
      return Math.ceil(prices[poch[0]] * poch[1] / 100 / poch[2]) * poch[2];
    }
    return null;
  }

  function stawkaBazowa(cennik, poz) {
    var lektorId = String(poz.lektor_id || '').trim();
    var pole = poz.pole, dl = String(poz.dlugosc || '');
    if (!POLA[pole]) throw new BladWyceny('Nieznane pole eksploatacji: ' + pole);
    if (DLUGOSCI[pole].indexOf(dl) < 0) throw new BladWyceny('Długość ' + dl + ' s nie występuje na polu ' + POLA[pole]);
    var lektorzy = (cennik && cennik.lektorzy) || {};
    var zUmowy = lektorzy[lektorId];
    if (zUmowy) {
      var kw = ((zUmowy.stawki || {})[pole] || {})[dl];
      if (typeof kw === 'number') return [kw, 'umowa'];
    }
    // Kwota wpisana recznie przez Optimum przy korekcie - ma pierwszenstwo
    // przed cena ukryta i stawka profilu (jak w CRM).
    if (typeof poz.kwota_reczna === 'number' && poz.kwota_reczna > 0) return [Math.round(poz.kwota_reczna), 'optimum'];
    if (poz.cena_ukryta) return [null, 'wycena'];
    if (typeof poz.stawka_profilu === 'number' && poz.stawka_profilu > 0) return [Math.round(poz.stawka_profilu), 'profil'];
    return [null, 'wycena'];
  }

  function klasyfikujWersje(poz, bazowa) {
    if (!bazowa) return ['spot', ['Wersja pochodna musi wskazywać spot reklamowy z tego zamówienia. Pozycja policzona jako osobny spot reklamowy.']];
    if (bazowa.typ !== 'spot') return ['spot', ['Wersja pochodna może odnosić się tylko do spotu reklamowego, nie do innej wersji. Pozycja policzona jako osobny spot reklamowy.']];
    if (String(poz.lektor_id || '') !== String(bazowa.lektor_id || '')) return ['spot', ['Inny lektor niż w spocie bazowym - według cennika to osobny spot reklamowy, nie wersja pochodna.']];
    if (poz.pole !== bazowa.pole) return ['spot', ['Inne pole eksploatacji niż w spocie bazowym - według cennika to osobny spot reklamowy, nie wersja pochodna.']];
    if (parseInt(poz.dlugosc || 0, 10) > parseInt(bazowa.dlugosc || 0, 10)) return ['spot', ['Wersja pochodna nie może być dłuższa od spotu bazowego. Pozycja policzona jako osobny spot reklamowy.']];
    return ['wersja_pochodna', []];
  }

  function policz(cennik, zamowienie) {
    var p = parametry(cennik);
    var we = (zamowienie && zamowienie.pozycje) || [];
    if (!we.length) throw new BladWyceny('Zamówienie nie ma żadnej pozycji');
    var tryb = (zamowienie && zamowienie.tryb_realizacji) || 'standard';
    if (TRYBY.indexOf(tryb) < 0) throw new BladWyceny('Nieznany tryb realizacji: ' + tryb);

    var poId = {};
    we.forEach(function (poz, i) {
      if (TYPY.indexOf(poz.typ) < 0) throw new BladWyceny('Pozycja ' + (i + 1) + ': nieznany typ ' + poz.typ);
      if (UDZWIEKOWIENIA.indexOf(poz.udzwiekowienie || 'brak') < 0) throw new BladWyceny('Pozycja ' + (i + 1) + ': nieznane udźwiękowienie');
      poId[String(poz.id || ('p' + (i + 1)))] = poz;
    });

    var pozycje = [], blokady = [];
    var sumaStawek = 0, sumaUdz = 0, wymagaWyceny = false;
    var licznik = { spoty: 0, wersje: 0, dogrywki: 0, udzwiekowienia: 0 };

    we.forEach(function (poz, i) {
      var pozId = String(poz.id || ('p' + (i + 1)));
      var typ = poz.typ, komunikaty = [], przeklasyfikowano = false;
      var kwota = null, zrodlo = null, r, bazowa;

      if (typ === 'wersja_pochodna') {
        bazowa = poId[String(poz.bazowa_id || '')];
        r = klasyfikujWersje(poz, bazowa); typ = r[0]; komunikaty = r[1];
        przeklasyfikowano = typ === 'spot';
        if (typ === 'wersja_pochodna') {
          r = stawkaBazowa(cennik, bazowa);
          if (r[0] === null) { kwota = null; zrodlo = 'wycena'; }
          else { kwota = proc(r[0], p.wersja_pochodna_proc); zrodlo = r[1]; }
        }
      }
      if (typ === 'spot') { r = stawkaBazowa(cennik, poz); kwota = r[0]; zrodlo = r[1]; }
      if (typ === 'dogrywka') {
        bazowa = poId[String(poz.bazowa_id || '')];
        if (bazowa) {
          var kwBazy = null, zr = 'wycena';
          if (bazowa.typ === 'spot') { r = stawkaBazowa(cennik, bazowa); kwBazy = r[0]; zr = r[1]; }
          else if (bazowa.typ === 'wersja_pochodna') {
            var b2 = poId[String(bazowa.bazowa_id || '')];
            if (b2) { r = stawkaBazowa(cennik, b2); kwBazy = r[0] === null ? null : proc(r[0], p.wersja_pochodna_proc); zr = r[1]; }
          }
          kwota = kwBazy === null ? null : proc(kwBazy, p.dogrywka_proc);
          zrodlo = kwota === null ? 'wycena' : zr;
        } else if (typeof poz.kwota_bazowa === 'number' && poz.kwota_bazowa > 0) {
          kwota = proc(poz.kwota_bazowa, p.dogrywka_proc); zrodlo = 'poprzednie_zamowienie';
        } else {
          kwota = null; zrodlo = 'wycena';
          komunikaty.push('Dogrywka bez wskazanej wersji bazowej - kwotę ustali Optimum.');
        }
      }

      var okres = String(poz.okres || '12');
      if (kwota !== null && okres === '24') kwota += proc(kwota, p.przedluzenie_licencji_proc);

      var udz = poz.udzwiekowienie || 'brak';
      var kwotaUdz = udz !== 'brak' ? Math.round(p.udzwiekowienie[udz] || 0) : 0;
      if (kwotaUdz) { licznik.udzwiekowienia += 1; sumaUdz += kwotaUdz; }

      if (kwota === null) {
        wymagaWyceny = true;
        if (!komunikaty.length) komunikaty.push('Lektor z wyceną indywidualną - kwotę wpisze Optimum.');
      } else sumaStawek += kwota;

      if (typ === 'spot') licznik.spoty += 1; else if (typ === 'wersja_pochodna') licznik.wersje += 1; else licznik.dogrywki += 1;

      // Licencja wyłączna jest normą w tej umowie (decyzja z 19.10.2026) i nie
      // blokuje wysyłki; blokada zostaje tylko dla terytorium poza Polską.
      var licencja = String(poz.licencja || 'wylaczna').trim();
      var ter = String(poz.terytorium || 'Polska').trim();
      if (ter.toLowerCase() !== 'polska') blokady.push('Pozycja ' + (i + 1) + ': terytorium "' + ter + '" wymaga wyceny indywidualnej.');

      pozycje.push({
        id: pozId, typ_zgloszony: poz.typ, typ: typ, przeklasyfikowano: przeklasyfikowano,
        lektor_id: poz.lektor_id, pole: poz.pole, dlugosc: String(poz.dlugosc || ''),
        kwota_netto: kwota, zrodlo_stawki: zrodlo, udzwiekowienie: udz, kwota_udzwiekowienia: kwotaUdz,
        okres: okres, licencja: licencja, terytorium: ter, komunikaty: komunikaty
      });
    });

    var doplaty = [];
    if (zamowienie.sesja_zdalna) doplaty.push({ kod: 'sesja_zdalna', nazwa: 'Sesja zdalna z udziałem Zamawiającego', kwota: Math.round(p.sesja_zdalna) });
    // Ekspres/weekend: +50% wartosci calego zamowienia (stawki + udzwiekowienie + sesja zdalna),
    // bez samej doplaty - zal. 5 po poprawkach umowy z 23.10.2026 (jak panel_wycena.py).
    var podstawaTrybu = sumaStawek + sumaUdz + doplaty.reduce(function (s, d) { return s + d.kwota; }, 0);
    if (tryb === 'ekspres') doplaty.push({ kod: 'ekspres', nazwa: 'Realizacja ekspresowa (ten sam dzień), +50% wartości zamówienia', kwota: proc(podstawaTrybu, p.ekspres_proc) });
    else if (tryb === 'weekend') doplaty.push({ kod: 'weekend', nazwa: 'Praca w weekend lub dzień wolny, +50% wartości zamówienia', kwota: proc(podstawaTrybu, p.weekend_proc) });

    var sumaDoplat = doplaty.reduce(function (s, d) { return s + d.kwota; }, 0);
    var sumaNetto = sumaStawek + sumaUdz + sumaDoplat;
    var vat = proc(sumaNetto, p.vat_proc);

    return {
      waluta: p.waluta, pozycje: pozycje, doplaty: doplaty, podsumowanie: licznik,
      suma_stawek: sumaStawek, suma_udzwiekowien: sumaUdz,
      suma_netto: wymagaWyceny ? null : sumaNetto,
      vat: wymagaWyceny ? null : vat,
      suma_brutto: wymagaWyceny ? null : sumaNetto + vat,
      wymaga_wyceny: wymagaWyceny, blokady: blokady
    };
  }

  function opisPozycji(poz) {
    var typ = { spot: 'Spot reklamowy', wersja_pochodna: 'Wersja pochodna', dogrywka: 'Dogrywka' }[poz.typ] || poz.typ || '';
    var pole = POLA[poz.pole] || poz.pole || '';
    var dl = poz.dlugosc ? parseInt(poz.dlugosc, 10) : 0;
    var dlTxt = dl ? (dl < 60 ? 'do ' + dl + ' s' : 'do ' + Math.floor(dl / 60) + ' min') : '';
    return [typ, pole, dlTxt].filter(Boolean).join(', ');
  }

  function zl(kwota) {
    if (kwota === null || kwota === undefined) return 'wycena indywidualna';
    return String(Math.round(kwota)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' zł';
  }

  return { POLA: POLA, DLUGOSCI: DLUGOSCI, POLE_PROFILU: POLE_PROFILU, TYPY: TYPY,
           UDZWIEKOWIENIA: UDZWIEKOWIENIA, TRYBY: TRYBY, DOMYSLNE: DOMYSLNE,
           BladWyceny: BladWyceny, policz: policz, stawkaBazowa: stawkaBazowa, stawkaZProfilu: stawkaZProfilu,
           opisPozycji: opisPozycji, zl: zl };
}));
