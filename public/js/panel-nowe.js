/**
 * Formularz nowego zamowienia w panelu klienta.
 *
 * Pozycje sa dodawane dynamicznie z <template>. Spot reklamowy jest karta
 * nadrzedna; wersje pochodne i dogrywki dodaje sie przyciskiem PRZY SPOCIE
 * i siedza w jego karcie (zagniezdzone), wiec "do ktorego spotu" wynika
 * z miejsca, a nie z selecta. Dogrywka do wczesniejszego Zamowienia jest
 * osobna karta z kwota tamtej wersji.
 *
 * Wycena podgladowa liczy sie w przegladarce przez PanelPricing (ten sam
 * kod, co po stronie serwera), a wysylka idzie JSON-em na POST
 * /panel/zamowienia/. Serwer i CRM licza kwote jeszcze raz.
 */
(function () {
  'use strict';
  var PP = window.PanelPricing;
  var konf = JSON.parse(document.getElementById('panel-konfiguracja').textContent);
  var cennik = konf.cennik || {};
  var lektorzy = konf.lektorzy || [];
  var podpowiedzi = konf.podpowiedzi || {};   // klient koncowy -> {scenariusz} z poprzednich zamowien
  var lektorPoId = {};
  lektorzy.forEach(function (l) { lektorPoId[l.id] = l; });

  var form = document.getElementById('panel-nowe');
  var kontener = document.getElementById('pozycje');
  var puste = document.getElementById('pozycje-puste');
  var szablon = document.getElementById('szablon-pozycji');
  var elPodsumowanie = document.getElementById('podsumowanie');
  var elBlokady = document.getElementById('blokady');
  var elBlad = document.getElementById('blad');
  var NAZWY_TYPOW = { spot: 'Spot reklamowy', wersja_pochodna: 'Wersja pochodna', dogrywka: 'Dogrywka' };
  // Pola, ktore pozycja podrzedna dziedziczy po swoim spocie (nie ma ich w karcie).
  var DZIEDZICZONE = ['lektor_id', 'pole', 'licencja', 'terytorium', 'okres'];
  // Radio ma 15 i 30 s; typowy spot radiowy to 30 s, wiec on jest domyslny (TV zostaje jak byla).
  var DOMYSLNA_DLUGOSC = { radio_ogolnopolskie: '30' };
  var wysylka = false;

  // Pola karty szukamy po ':scope >', zeby karta spotu nie trafila w pola
  // swoich pozycji podrzednych (sa w tym samym poddrzewie).
  function el(row, sel) { return row.querySelector(':scope > ' + sel) || row.querySelector(':scope > :not(.podrzedne) ' + sel); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function opcja(select, wartosc, tekst, grupa) {
    var o = document.createElement('option');
    o.value = wartosc; o.textContent = tekst;
    (grupa || select).appendChild(o);
    return o;
  }

  var kwSesja = document.querySelector('[data-kwota="sesja_zdalna"]');
  if (kwSesja) kwSesja.textContent = PP.zl(typeof cennik.sesja_zdalna === 'number' ? cennik.sesja_zdalna : 150);

  function wypelnijLektorow(select) {
    select.innerHTML = '';
    var zUmowy = lektorzy.filter(function (l) { return l.z_umowy; });
    var reszta = lektorzy.filter(function (l) { return !l.z_umowy; });
    if (zUmowy.length) {
      var g1 = document.createElement('optgroup'); g1.label = 'Stawki z umowy';
      zUmowy.forEach(function (l) { opcja(select, l.id, l.nazwa, g1); });
      select.appendChild(g1);
    }
    var g2 = document.createElement('optgroup'); g2.label = 'Pozostali lektorzy powitania.pl (stawka z profilu)';
    reszta.forEach(function (l) { opcja(select, l.id, l.nazwa + (l.cena_ukryta ? ' (wycena indywidualna)' : ''), g2); });
    select.appendChild(g2);
  }

  function wypelnijPola(select) {
    select.innerHTML = '';
    Object.keys(PP.POLA).forEach(function (p) { opcja(select, p, PP.POLA[p]); });
  }

  function wypelnijDlugosci(select, pole, zachowaj) {
    var poprzednia = zachowaj ? select.value : null;
    var tenSamWybor = select.getAttribute('data-pole') === pole;
    select.setAttribute('data-pole', pole);
    select.innerHTML = '';
    (PP.DLUGOSCI[pole] || []).forEach(function (dl) {
      var n = parseInt(dl, 10);
      opcja(select, dl, n < 60 ? 'do ' + n + ' s' : 'do ' + Math.floor(n / 60) + ' min');
    });
    var istnieje = function (v) { return Array.prototype.some.call(select.options, function (o) { return o.value === v; }); };
    // Zmiana pola na takie, ktore ma domyslna dlugosc (radio -> 30 s), wygrywa z poprzednim
    // wyborem: "15 s" z telewizji nie powinno sie przeniesc na radio.
    if (poprzednia && istnieje(poprzednia) && (tenSamWybor || !DOMYSLNA_DLUGOSC[pole])) select.value = poprzednia;
    else if (DOMYSLNA_DLUGOSC[pole] && istnieje(DOMYSLNA_DLUGOSC[pole])) select.value = DOMYSLNA_DLUGOSC[pole];
  }

  /** Wszystkie karty w kolejnosci dokumentu: spot, jego pozycje podrzedne, kolejny spot... */
  function wiersze() { return Array.prototype.slice.call(kontener.querySelectorAll('.pozycja')); }
  function rodzic(row) { var r = row.parentElement && row.parentElement.closest('.pozycja'); return r || null; }

  /**
   * @param {string} typ spot | wersja_pochodna | dogrywka
   * @param {Element|null} nadrzedna karta spotu, pod ktora wchodzi wersja/dogrywka
   */
  function dodajPozycje(typ, nadrzedna) {
    var frag = szablon.content.cloneNode(true);
    var row = frag.querySelector('.pozycja');
    row.setAttribute('data-typ', typ);
    el(row, '.poz-typ').textContent = NAZWY_TYPOW[typ];
    wypelnijLektorow(el(row, '[name="lektor_id"]'));
    wypelnijPola(el(row, '[name="pole"]'));
    wypelnijDlugosci(el(row, '[name="dlugosc"]'), el(row, '[name="pole"]').value);

    if (typ === 'spot') {
      el(row, '.poz-akcje').classList.remove('hidden');
      el(row, '.poz-akcje').querySelectorAll('[data-dodaj-do]').forEach(function (btn) {
        btn.addEventListener('click', function () { dodajPozycje(this.getAttribute('data-dodaj-do'), row); });
      });
    } else {
      // Pozycja podrzedna: lzejsza karta, bez wlasnych pozycji podrzednych
      // i bez przyciskow spotu; dziedziczy lektora/pole/dlugosc po spocie -
      // tak najczesciej wyglada zamowienie i tak jest tanio (50%).
      row.classList.remove('bg-white');
      row.classList.add('bg-gray-50');
      el(row, '.podrzedne').remove();
      el(row, '.poz-akcje').remove();
      if (nadrzedna) {
        // Wersja pochodna z definicji (zal. 5) ma tego samego lektora, to samo
        // pole i licencje co spot - te pola nie sa edytowane, tylko dziedziczone
        // (zbierzPozycje bierze je ze spotu). Zostaje dlugosc (moze byc krotsza),
        // udzwiekowienie i opis.
        DZIEDZICZONE.forEach(function (n) { el(row, '[name="' + n + '"]').parentElement.classList.add('hidden'); });
        wypelnijDlugosci(el(row, '[name="dlugosc"]'), el(nadrzedna, '[name="pole"]').value);
        el(row, '[name="dlugosc"]').value = el(nadrzedna, '[name="dlugosc"]').value;
        el(row, '[name="udzwiekowienie"]').value = el(nadrzedna, '[name="udzwiekowienie"]').value;
        el(row, '[name="scenariusz"]').value = el(nadrzedna, '[name="scenariusz"]').value;
        el(row, '[name="muzyka"]').value = el(nadrzedna, '[name="muzyka"]').value;
        if (typ === 'dogrywka') {
          // Dogrywka nie ma wlasnej metryczki - pola metryczkowe zostaja przy wersji
          el(row, '[name="dlugosc"]').parentElement.classList.add('hidden');
          ['nazwa', 'scenariusz', 'muzyka'].forEach(function (n) { el(row, '[name="' + n + '"]').parentElement.classList.add('hidden'); });
        }
      } else if (typ === 'dogrywka') {
        el(row, '.pole-kwota-bazowa').classList.remove('hidden');
      }
      if (typ === 'wersja_pochodna') el(row, '.pole-opis-wersji').classList.remove('hidden');
    }

    el(row, '[name="pole"]').addEventListener('change', function () {
      wypelnijDlugosci(el(row, '[name="dlugosc"]'), this.value, true);
      var pole = this.value;
      if (typ === 'spot') {
        el(row, '.podrzedne').querySelectorAll('.pozycja').forEach(function (dz) {
          wypelnijDlugosci(el(dz, '[name="dlugosc"]'), pole, true);
        });
      }
      przelicz();
    });
    // Muzyka powierzona: pole tytul/kompozytor tylko gdy udzwiekowienie = powierzona
    var udzSel = el(row, '[name="udzwiekowienie"]');
    function pokazMuzyke() { el(row, '.pole-muzyka').classList.toggle('hidden', udzSel.value !== 'powierzona' || typ === 'dogrywka'); }
    udzSel.addEventListener('change', pokazMuzyke);
    pokazMuzyke();
    if (typ === 'spot' && !el(row, '[name="scenariusz"]').value) podpowiedzScenariusz(row);
    el(row, '.poz-usun').addEventListener('click', function () {
      var nad = rodzic(row);
      row.remove();
      if (nad) pokazPodrzedne(nad);
      przelicz();
    });
    row.addEventListener('input', przelicz);
    row.addEventListener('change', przelicz);

    if (nadrzedna) {
      el(nadrzedna, '.podrzedne').appendChild(frag);
      pokazPodrzedne(nadrzedna);
    } else {
      kontener.appendChild(frag);
    }
    przelicz();
    el(row, '[name="lektor_id"]').focus();
  }

  /** Scenariusz z poprzedniego zamowienia dla tego klienta koncowego - tylko w puste pole. */
  function podpowiedzScenariusz(row) {
    var kk = form.klient_koncowy.value.trim();
    var pod = podpowiedzi[kk];
    if (pod && pod.scenariusz && !el(row, '[name="scenariusz"]').value) el(row, '[name="scenariusz"]').value = pod.scenariusz;
  }

  function pokazPodrzedne(spot) {
    var p = el(spot, '.podrzedne');
    p.classList.toggle('hidden', !p.querySelector('.pozycja'));
  }

  function zbierzPozycje() {
    var w = wiersze();
    return w.map(function (row, i) {
      var typ = row.getAttribute('data-typ');
      var nad = rodzic(row);
      var zrodloPol = nad || row;   // pozycja podrzedna dziedziczy lektora, pole, licencje... po spocie
      var lek = lektorPoId[el(zrodloPol, '[name="lektor_id"]').value] || {};
      var pole = el(zrodloPol, '[name="pole"]').value;
      var dl = (nad && typ === 'dogrywka') ? el(nad, '[name="dlugosc"]').value : el(row, '[name="dlugosc"]').value;
      var poz = {
        id: 'p' + (i + 1), typ: typ, lektor_id: lek.id, pole: pole, dlugosc: dl,
        udzwiekowienie: el(row, '[name="udzwiekowienie"]').value,
        okres: el(zrodloPol, '[name="okres"]').value,
        licencja: el(zrodloPol, '[name="licencja"]').value,
        terytorium: el(zrodloPol, '[name="terytorium"]').value.trim() || 'Polska',
        uwagi: el(row, '[name="uwagi"]').value.trim(),
        tekst: el(row, '[name="tekst"]').value.trim(),
        nazwa: el(row, '[name="nazwa"]').value.trim(),
        scenariusz: el(row, '[name="scenariusz"]').value.trim(),
        muzyka: el(row, '[name="muzyka"]').value.trim()
      };
      if (nad) poz.bazowa_id = 'p' + (w.indexOf(nad) + 1);
      else if (typ === 'dogrywka') poz.kwota_bazowa = Number(el(row, '[name="kwota_bazowa"]').value) || 0;
      if (typ === 'wersja_pochodna') poz.opis_wersji = el(row, '[name="opis_wersji"]').value.trim();
      // Dane do podgladu - serwer i tak dopisze je sam z voices.json.
      if (!lek.z_umowy) {
        poz.cena_ukryta = Boolean(lek.cena_ukryta);
        var sp = (lek.stawki_profilu || {})[pole + '|' + dl];
        if (!lek.cena_ukryta && typeof sp === 'number') poz.stawka_profilu = sp;
      }
      return poz;
    });
  }

  function przelicz() {
    var w = wiersze();
    puste.classList.toggle('hidden', w.length > 0);
    w.forEach(function (row, i) {
      el(row, '.poz-nr').textContent = i + 1;
      var nad = rodzic(row);
      var typ = row.getAttribute('data-typ');
      el(row, '.poz-typ').textContent = NAZWY_TYPOW[typ] + (nad ? ' do spotu ' + (w.indexOf(nad) + 1) : (typ === 'dogrywka' ? ' do wcześniejszego Zamówienia' : ''));
    });
    elBlad.classList.add('hidden');
    if (!w.length) {
      elPodsumowanie.innerHTML = '<p class="text-gray-500">Dodaj pozycje, żeby zobaczyć wycenę.</p>';
      elBlokady.classList.add('hidden');
      return null;
    }
    var pozycje = zbierzPozycje();
    var wynik;
    try {
      wynik = PP.policz(cennik, {
        pozycje: pozycje,
        tryb_realizacji: form.tryb_realizacji.value,
        sesja_zdalna: form.sesja_zdalna.checked
      });
    } catch (e) {
      elBlad.textContent = e.message || 'Nie udało się policzyć wyceny.';
      elBlad.classList.remove('hidden');
      return null;
    }
    wynik.pozycje.forEach(function (p, i) {
      var row = w[i];
      el(row, '.poz-kwota').textContent = PP.zl(p.kwota_netto) + (p.kwota_udzwiekowienia ? ' + ' + PP.zl(p.kwota_udzwiekowienia) : '');
      el(row, '.poz-komunikaty').innerHTML = p.komunikaty.map(function (k) { return '<p>' + esc(k) + '</p>'; }).join('');
      var zr = { umowa: 'stawka z umowy ramowej', profil: 'stawka z profilu lektora na powitania.pl', poprzednie_zamowienie: 'stawka z wcześniejszego Zamówienia', optimum: 'kwota ustalona przez Optimum', wycena: 'kwotę ustali Optimum przy akceptacji' }[p.zrodlo_stawki] || '';
      el(row, '.poz-zrodlo').textContent = zr + (p.przeklasyfikowano ? ' (pozycja liczona jako osobny spot)' : '');
    });

    var html = '';
    var pods = wynik.podsumowanie;
    html += '<div class="flex justify-between"><span>' + pods.spoty + ' spot(y), ' + pods.wersje + ' wersje pochodne, ' + pods.dogrywki + ' dogrywki</span><span>' + PP.zl(wynik.suma_stawek) + '</span></div>';
    if (wynik.suma_udzwiekowien) html += '<div class="flex justify-between"><span>Udźwiękowienie (' + pods.udzwiekowienia + ' wersji)</span><span>' + PP.zl(wynik.suma_udzwiekowien) + '</span></div>';
    wynik.doplaty.forEach(function (d) { html += '<div class="flex justify-between"><span>' + esc(d.nazwa) + '</span><span>' + PP.zl(d.kwota) + '</span></div>'; });
    if (wynik.wymaga_wyceny) {
      html += '<div class="flex justify-between font-bold text-gray-900 text-base pt-2"><span>Razem netto</span><span>wycena indywidualna</span></div>';
      html += '<p class="text-xs text-gray-500">Co najmniej jedna pozycja nie ma kwoty z cennika. Optimum uzupełni ją przy akceptacji, a Ty zobaczysz pełną kwotę przed potwierdzeniem.</p>';
    } else {
      html += '<div class="flex justify-between font-bold text-gray-900 text-base pt-2"><span>Razem netto</span><span>' + PP.zl(wynik.suma_netto) + '</span></div>';
      html += '<div class="flex justify-between"><span>VAT 23%</span><span>' + PP.zl(wynik.vat) + '</span></div>';
      html += '<div class="flex justify-between"><span>Razem brutto</span><span>' + PP.zl(wynik.suma_brutto) + '</span></div>';
    }
    elPodsumowanie.innerHTML = html;
    if (wynik.blokady.length) {
      elBlokady.innerHTML = wynik.blokady.map(function (b) { return '<p>' + esc(b) + '</p>'; }).join('') + '<p class="mt-1">Wysyłka do akceptacji wymaga komentarza w uwagach do zamówienia.</p>';
      elBlokady.classList.remove('hidden');
    } else elBlokady.classList.add('hidden');
    return wynik;
  }

  function pokazBlad(msg) {
    elBlad.textContent = msg;
    elBlad.classList.remove('hidden');
    elBlad.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function wyslij(czyWyslac) {
    if (wysylka) return;
    var wymagane = [['klient_koncowy', 'Klient końcowy'], ['projekt', 'Nazwa projektu'], ['termin_realizacji', 'Termin dostarczenia nagrań']];
    for (var i = 0; i < wymagane.length; i++) {
      if (!form[wymagane[i][0]].value.trim()) { pokazBlad('Pole "' + wymagane[i][1] + '" jest wymagane.'); form[wymagane[i][0]].focus(); return; }
    }
    if (!wiersze().length) { pokazBlad('Dodaj co najmniej jedną pozycję.'); return; }
    var wynik = przelicz();
    if (!wynik) return;
    if (czyWyslac && wynik.blokady.length && !form.uwagi_klienta.value.trim()) {
      pokazBlad('Zamówienie ma pozycje wymagające ustaleń z Optimum. Dopisz komentarz w uwagach albo zapisz jako szkic.');
      return;
    }
    var dane = {
      klient_koncowy: form.klient_koncowy.value.trim(),
      projekt: form.projekt.value.trim(),
      termin_realizacji: form.termin_realizacji.value,
      termin_sesji: form.termin_sesji.value || null,
      data_emisji: form.data_emisji.value || null,
      tryb_realizacji: form.tryb_realizacji.value,
      sesja_zdalna: form.sesja_zdalna.checked,
      uwagi_klienta: form.uwagi_klienta.value.trim(),
      pozycje: zbierzPozycje(),
      suma_podglad: wynik.suma_netto,
      wyslij: czyWyslac
    };
    wysylka = true;
    var przyciski = form.querySelectorAll('button[type="submit"]');
    przyciski.forEach(function (b) { b.disabled = true; b.classList.add('opacity-50'); });
    fetch('/panel/zamowienia/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify(dane)
    }).then(function (r) { return r.json().catch(function () { return { ok: false, error: 'Błąd serwera (' + r.status + ')' }; }); })
      .then(function (odp) {
        if (odp.ok && odp.redirect) { window.location.href = odp.redirect; return; }
        if (odp.redirect && !odp.ok) { window.location.href = odp.redirect + '?next=' + encodeURIComponent('/panel/zamowienia/nowe/'); return; }
        throw new Error(odp.error || 'Nie udało się zapisać zamówienia.');
      })
      .catch(function (e) {
        wysylka = false;
        przyciski.forEach(function (b) { b.disabled = false; b.classList.remove('opacity-50'); });
        pokazBlad(e.message);
      });
  }

  document.querySelectorAll('[data-dodaj]').forEach(function (btn) {
    btn.addEventListener('click', function () { dodajPozycje(this.getAttribute('data-dodaj'), null); });
  });
  form.querySelectorAll('button[type="submit"]').forEach(function (btn) {
    btn.addEventListener('click', function (ev) { ev.preventDefault(); wyslij(this.getAttribute('data-wyslij') === '1'); });
  });
  form.addEventListener('submit', function (ev) { ev.preventDefault(); });
  form.klient_koncowy.addEventListener('change', function () {
    wiersze().forEach(function (row) { if (row.getAttribute('data-typ') === 'spot') podpowiedzScenariusz(row); });
  });
  form.tryb_realizacji.addEventListener('change', przelicz);
  form.sesja_zdalna.addEventListener('change', przelicz);

  // Nie zaczynaj od pustej strony - pierwszy spot jest zawsze.
  dodajPozycje('spot', null);
})();
