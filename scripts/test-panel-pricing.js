#!/usr/bin/env node
'use strict';
/**
 * Lustro testow CRM dla wyceny panelu: te same przyklady
 * (optimum_CRM/tests/panel_przyklady.json) musza dac te same liczby
 * w public/js/panel-pricing.js. Uruchom: npm run test:panel-pricing
 *
 * Plik przykladow szukany obok repo CRM; gdy go nie ma (np. CI bez CRM),
 * uzywana jest kopia tests/panel_przyklady.json w tym repo.
 */
const fs = require('fs');
const path = require('path');
const assert = require('assert');
const PP = require('../public/js/panel-pricing.js');

const kandydaci = [
  path.join(__dirname, '..', '..', 'optimum_CRM', 'tests', 'panel_przyklady.json'),
  path.join(__dirname, '..', 'tests', 'panel_przyklady.json'),
];
const plik = kandydaci.find(f => fs.existsSync(f));
if (!plik) { console.error('Brak panel_przyklady.json'); process.exit(2); }
const dane = JSON.parse(fs.readFileSync(plik, 'utf8'));
const cennik = dane.cennik_white_bits;

let ok = 0, bledy = 0;
for (const prz of dane.przyklady) {
  try {
    const w = PP.policz(cennik, prz.zamowienie);
    const o = prz.oczekiwane;
    assert.deepStrictEqual(w.pozycje.map(p => p.kwota_netto), o.kwoty, 'kwoty');
    if (o.typy) assert.deepStrictEqual(w.pozycje.map(p => p.typ), o.typy, 'typy');
    if (o.przeklasyfikowano) assert.deepStrictEqual(w.pozycje.map(p => p.przeklasyfikowano), o.przeklasyfikowano, 'przeklasyfikowano');
    if (o.zrodla) assert.deepStrictEqual(w.pozycje.map(p => p.zrodlo_stawki), o.zrodla, 'zrodla');
    for (const k of ['suma_netto', 'vat', 'suma_brutto', 'suma_stawek', 'suma_udzwiekowien', 'wymaga_wyceny', 'podsumowanie']) {
      if (k in o) assert.deepStrictEqual(w[k], o[k], k);
    }
    if (o.doplaty) {
      const d = {}; w.doplaty.forEach(x => { d[x.kod] = x.kwota; });
      assert.deepStrictEqual(d, o.doplaty, 'doplaty');
    }
    if ('liczba_blokad' in o) assert.strictEqual(w.blokady.length, o.liczba_blokad, 'blokady');
    if (o.licencje) assert.deepStrictEqual(w.pozycje.map(p => p.licencja), o.licencje, 'licencje');
    ok++;
    console.log('  ok   ' + prz.nazwa);
  } catch (e) {
    bledy++;
    console.log('  BLAD ' + prz.nazwa + '\n       ' + e.message);
  }
}
// bledy walidacji musza byc BladWyceny, nie TypeError
// stawki profilu (lektor spoza cennika) - te same przypadki co tests/test_panel_wycena.py
for (const c of ((dane.stawki_profilu || {}).przypadki || [])) {
  try {
    assert.strictEqual(PP.stawkaZProfilu(c.profil, c.pole, c.dlugosc), c.oczekiwana);
    ok++;
  } catch (e) {
    bledy++;
    console.log('  BLAD stawka profilu ' + JSON.stringify(c) + '\n       ' + e.message);
  }
}
assert.throws(() => PP.policz(cennik, { pozycje: [] }), PP.BladWyceny);
assert.throws(() => PP.policz(cennik, { pozycje: [{ typ: 'spot', lektor_id: 'janusz', pole: 'kino', dlugosc: '30' }] }), PP.BladWyceny);
assert.strictEqual(PP.zl(3250), '3 250 zł');
assert.strictEqual(PP.zl(null), 'wycena indywidualna');
console.log(`\n${ok} przykladow i stawek OK, ${bledy} bledow (zrodlo: ${path.relative(process.cwd(), plik)})`);
process.exit(bledy ? 1 : 0);
