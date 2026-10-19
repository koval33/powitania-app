/**
 * Formularz nowego zamowienia w panelu klienta.
 *
 * Pozycje sa dodawane dynamicznie z <template>, wycena podgladowa liczy sie
 * w przegladarce przez PanelPricing (ten sam kod, co po stronie serwera),
 * a wysylka idzie JSON-em na POST /panel/zamowienia/. Serwer i CRM licza
 * kwote jeszcze raz - to, co widac tutaj, jest podgladem.
 */
(function () {
  'use strict';
  var PP = window.PanelPricing;
  var konf = JSON.parse(document.getElementById('panel-konfiguracja').textContent);
  var cennik = konf.cennik || {};
  var lektorzy = konf.lektorzy || [];
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
  var wysylka = false;

  function el(rodzic, sel) { return rodzic.querySelector(sel); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function opcja(select, wartosc, tekst, grupa) {
    var o = document.createElement('option');
    o.value = wartosc; o.textContent = tekst;
    (grupa || select).appendChild(o);
    return o;
  }

  // Kwota sesji zdalnej z cennika (domyslnie 150)
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
    select.innerHTML = '';
    (PP.DLUGOSCI[pole] || []).forEach(function (dl) {
      var n = parseInt(dl, 10);
      opcja(select, dl, n < 60 ? 'do ' + n + ' s' : 'do ' + Math.floor(n / 60) + ' min');
    });
    if (poprzednia && Array.prototype.some.call(select.options, function (o) { return o.value === poprzednia; })) select.value = poprzednia;
  }

  function wiersze() { return Array.prototype.slice.call(kontener.querySelectorAll('.pozycja')); }

  /** Select "dotyczy spotu": spoty z tego zamowienia + (dla dogrywki) opcja "z wczesniejszego zamowienia". */
  function odswiezBazowe() {
    var w = wiersze();
    w.forEach(function (row, idx) {
      var typ = row.getAttribute('data-typ');
      if (typ === 'spot') return;
      var sel = el(row, '[name="bazowa_id"]');
      var poprzednia = sel.value;
      sel.innerHTML = '';
      w.forEach(function (inny, j) {
        if (j === idx) return;
        var tInny = inny.getAttribute('data-typ');
        if (tInny !== 'spot' && !(typ === 'dogrywka' && tInny === 'wersja_pochodna')) return;
        var lek = lektorPoId[el(inny, '[name="lektor_id"]').value];
        opcja(sel, 'p' + (j + 1), 'Pozycja ' + (j + 1) + ': ' + NAZWY_TYPOW[tInny] + ', ' + (lek ? lek.nazwa : ''));
      });
      if (typ === 'dogrywka') opcja(sel, 'poprzednie', 'wersja z wcześniejszego Zamówienia (podaj stawkę)');
      if (!sel.options.length) opcja(sel, '', 'brak spotu w zamówieniu - dodaj go najpierw');
      if (poprzednia && Array.prototype.some.call(sel.options, function (o) { return o.value === poprzednia; })) sel.value = poprzednia;
      el(row, '.pole-kwota-bazowa').classList.toggle('hidden', !(typ === 'dogrywka' && sel.value === 'poprzednie'));
    });
  }

  function dodajPozycje(typ) {
    var frag = szablon.content.cloneNode(true);
    var row = frag.querySelector('.pozycja');
    row.setAttribute('data-typ', typ);
    el(row, '.poz-typ').textContent = NAZWY_TYPOW[typ];
    wypelnijLektorow(el(row, '[name="lektor_id"]'));
    wypelnijPola(el(row, '[name="pole"]'));
    wypelnijDlugosci(el(row, '[name="dlugosc"]'), el(row, '[name="pole"]').value);
    if (typ !== 'spot') el(row, '.pole-bazowa').classList.remove('hidden');
    if (typ === 'wersja_pochodna') el(row, '.pole-opis-wersji').classList.remove('hidden');

    // Wersja/dogrywka dziedziczy lektora i pole z ostatniego spotu - tak
    // najczesciej wyglada zamowienie i tak jest tanio (50%).
    var ostatniSpot = wiersze().filter(function (r) { return r.getAttribute('data-typ') === 'spot'; }).pop();
    if (typ !== 'spot' && ostatniSpot) {
      el(row, '[name="lektor_id"]').value = el(ostatniSpot, '[name="lektor_id"]').value;
      el(row, '[name="pole"]').value = el(ostatniSpot, '[name="pole"]').value;
      wypelnijDlugosci(el(row, '[name="dlugosc"]'), el(row, '[name="pole"]').value);
      el(row, '[name="dlugosc"]').value = el(ostatniSpot, '[name="dlugosc"]').value;
    }

    el(row, '[name="pole"]').addEventListener('change', function () {
      wypelnijDlugosci(el(row, '[name="dlugosc"]'), this.value, true);
      przelicz();
    });
    el(row, '.poz-usun').addEventListener('click', function () { row.remove(); przelicz(); });
    row.addEventListener('input', przelicz);
    row.addEventListener('change', przelicz);
    kontener.appendChild(frag);
    przelicz();
  }

  function zbierzPozycje() {
    return wiersze().map(function (row, i) {
      var typ = row.getAttribute('data-typ');
      var lek = lektorPoId[el(row, '[name="lektor_id"]').value] || {};
      var pole = el(row, '[name="pole"]').value, dl = el(row, '[name="dlugosc"]').value;
      var poz = {
        id: 'p' + (i + 1), typ: typ, lektor_id: lek.id, pole: pole, dlugosc: dl,
        udzwiekowienie: el(row, '[name="udzwiekowienie"]').value,
        okres: el(row, '[name="okres"]').value,
        licencja: el(row, '[name="licencja"]').value,
        terytorium: el(row, '[name="terytorium"]').value.trim() || 'Polska',
        uwagi: el(row, '[name="uwagi"]').value.trim()
      };
      if (typ !== 'spot') {
        var baz = el(row, '[name="bazowa_id"]').value;
        if (/^p\d+$/.test(baz)) poz.bazowa_id = baz;
        if (typ === 'dogrywka' && baz === 'poprzednie') poz.kwota_bazowa = Number(el(row, '[name="kwota_bazowa"]').value) || 0;
      }
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
    w.forEach(function (row, i) { el(row, '.poz-nr').textContent = i + 1; });
    odswiezBazowe();
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
      el(row, '.poz-zrodlo').textContent = zr + (p.przeklasyfikowano ? ' (pozycja liczona jako spot)' : '');
      if (p.typ !== row.getAttribute('data-typ')) el(row, '.poz-typ').textContent = NAZWY_TYPOW[row.getAttribute('data-typ')] + ' liczona jako ' + NAZWY_TYPOW[p.typ].toLowerCase();
      else el(row, '.poz-typ').textContent = NAZWY_TYPOW[p.typ];
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
    btn.addEventListener('click', function () { dodajPozycje(this.getAttribute('data-dodaj')); });
  });
  form.querySelectorAll('button[type="submit"]').forEach(function (btn) {
    btn.addEventListener('click', function (ev) { ev.preventDefault(); wyslij(this.getAttribute('data-wyslij') === '1'); });
  });
  form.addEventListener('submit', function (ev) { ev.preventDefault(); });
  form.tryb_realizacji.addEventListener('change', przelicz);
  form.sesja_zdalna.addEventListener('change', przelicz);

  // Nie zaczynaj od pustej strony - pierwszy spot jest zawsze.
  dodajPozycje('spot');
})();
