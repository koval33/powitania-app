#!/usr/bin/env node
/**
 * Pilnuje, żeby lib/pricing.js nie rozjechał się z kalkulatorem na stronie.
 *
 * Kalkulator w views/lektor.ejs zostaje nietknięty (strona produkcyjna działa),
 * więc tabela progów i dodatków istnieje w dwóch miejscach. Duplikat sam w sobie
 * nie jest groźny - groźne jest, gdy ktoś zmieni jedno i zapomni o drugim,
 * a automat zacznie wysyłać klientom nieaktualne stawki.
 *
 * Ten skrypt czyta OBA pliki i porównuje: pola cennika w progach, ich etykiety
 * oraz ceny dodatków o stałej kwocie. Kończy się błędem, gdy coś się różni.
 *
 * Uruchomienie:  node scripts/check-pricing-parity.js
 */

const fs = require('fs');
const path = require('path');

const EJS_PATH = path.join(__dirname, '..', 'views', 'lektor.ejs');
const lib = require('../lib/pricing.js');

const ejs = fs.readFileSync(EJS_PATH, 'utf8');
const start = ejs.indexOf('var PRICING_MAP');
if (start === -1) {
  fail('Nie znalazłem PRICING_MAP w views/lektor.ejs - zmieniła się nazwa albo plik.');
}
const block = ejs.slice(start, ejs.indexOf('\n};', start));

const problems = [];

// --- progi: pary (field, label) w kolejności występowania ---
const ejsTiers = [...block.matchAll(/\{\s*max:\s*([^,]+),\s*field:\s*'([^']+)',\s*label:\s*'([^']+)'/g)]
  .map(m => ({ max: m[1].trim(), field: m[2], label: m[3] }));

const libTiers = [];
for (const [key, svc] of Object.entries(lib.PRICING_MAP)) {
  for (const t of svc.tiers || []) {
    libTiers.push({ max: String(t.max === Infinity ? 'Infinity' : t.max), field: t.field, label: t.label, svc: key });
  }
}

for (const t of libTiers) {
  const hit = ejsTiers.find(e => e.field === t.field && e.label === t.label);
  if (!hit) {
    problems.push(`próg "${t.field}" / "${t.label}" (${t.svc}) nie ma odpowiednika w lektor.ejs`);
  } else if (hit.max !== t.max) {
    problems.push(`próg "${t.field}": strona ma max=${hit.max}, lib ma max=${t.max}`);
  }
}

// --- opcje wyboru (spoty) ---
const ejsOptions = [...block.matchAll(/\{\s*field:\s*'(spot_[^']+)',\s*label:\s*'([^']+)'/g)]
  .map(m => ({ field: m[1], label: m[2] }));
for (const [key, svc] of Object.entries(lib.PRICING_MAP)) {
  for (const o of svc.options || []) {
    const hit = ejsOptions.find(e => e.field === o.field);
    if (!hit) problems.push(`opcja "${o.field}" (${key}) nie ma odpowiednika w lektor.ejs`);
    else if (hit.label !== o.label) {
      problems.push(`opcja "${o.field}": strona ma "${hit.label}", lib ma "${o.label}"`);
    }
  }
}

// --- dodatki o stałej cenie ---
for (const [field, addon] of Object.entries(lib.FIXED_ADDONS)) {
  const re = new RegExp(`field:\\s*'${field}'[^}]*?price:\\s*(\\d+)`);
  const m = block.match(re);
  if (!m) {
    problems.push(`dodatek "${field}" nie występuje w lektor.ejs`);
  } else if (Number(m[1]) !== addon.price) {
    problems.push(`dodatek "${field}": strona ma ${m[1]} zł, lib ma ${addon.price} zł`);
  }
}

// --- tryb ekspresowy ---
if (!/\*\s*1\.5\s*\/\s*10\s*\)\s*\*\s*10/.test(ejs)) {
  problems.push('nie znalazłem na stronie reguły ekspresu (+50%, zaokrąglenie do 10 zł) - '
    + 'sprawdź, czy lib/pricing.js expressPrice() nadal ją odwzorowuje');
}

if (problems.length) {
  console.error('Cennik rozjechał się między stroną a lib/pricing.js:\n');
  problems.forEach(p => console.error('  - ' + p));
  console.error('\nZmień OBA miejsca albo popraw to, które jest nieaktualne.');
  process.exit(1);
}

console.log(`OK - cennik zgodny (${libTiers.length} progów, ` +
  `${Object.keys(lib.FIXED_ADDONS).length} dodatków stałych).`);

function fail(msg) {
  console.error(msg);
  process.exit(1);
}
