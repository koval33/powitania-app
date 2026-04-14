#!/usr/bin/env node
/**
 * Poprawka 31 opisów seoDescription > 160 znaków w data-seed/voices.json
 *
 * Strategia:
 * 1. Zastosuj generyczne regex replacements (języki → kody ISO, krótsze frazy).
 * 2. Dla profili które dalej są > 160 — zastosuj ręczne override z `MANUAL_OVERRIDES`.
 * 3. Zwaliduj końcowe długości, zgłoś problemy, zapisz plik.
 *
 * Uruchomienie:
 *   node scripts/fix-long-seo-descriptions.js
 *   node scripts/fix-long-seo-descriptions.js --dry-run   (pokaż zmiany bez zapisu)
 */

const fs = require('fs');
const path = require('path');

const VOICES_PATH = path.join(__dirname, '..', 'data-seed', 'voices.json');
const DRY_RUN = process.argv.includes('--dry-run');
const MAX_LEN = 160;
const MIN_LEN = 120;

// ============================================================
// 1. Generyczne regex replacements — skracanie fraz językowych
// ============================================================
const REPLACEMENTS = [
  // Frazy "nagrania w języku X i Y" → "nagrania XX, YY"
  [/nagrania w języku polskim, angielskim i niemieckim/g, 'nagrania PL, EN, DE'],
  [/nagrania w języku angielskim, francuskim i niemieckim/g, 'nagrania EN, FR, DE'],
  [/nagrania w języku polskim i angielskim/g, 'nagrania PL, EN'],
  [/nagrania w języku polskim i niemieckim/g, 'nagrania PL, DE'],
  [/nagrania w języku rosyjskim i ukraińskim/g, 'nagrania RU, UA'],
  [/nagrania w języku polskim/g, 'nagrania PL'],

  // "w języku X i Y" (bez "nagrania" na początku) → "w PL, EN"
  [/w języku polskim, angielskim i niemieckim/g, 'w PL, EN, DE'],
  [/w języku polskim i angielskim/g, 'w PL, EN'],
  [/w języku rosyjskim i ukraińskim/g, 'w RU, UA'],
  [/w języku polskim i niemieckim/g, 'w PL, DE'],

  // Nagrania w dowolnym przypadku (miejscowik/narzędnik) — "nagraniach polskich i X"
  [/nagraniach polskich i niemieckich/g, 'nagraniach PL, DE'],
  [/nagraniach polskich i angielskich/g, 'nagraniach PL, EN'],

  // Lektor natywny — skracanie przydawek
  [/natywnej lektorki języka niemieckiego/g, 'natywnej lektorki DE'],
  [/natywnego lektora rosyjskiego/g, 'natywnego lektora RU'],
  [/natywnej lektorki angielskiej i duńskiej/g, 'natywnej lektorki EN, DA'],
  [/natywnej lektorki czeskiej/g, 'natywnej lektorki CS'],
  [/natywna hebrajska lektorka/g, 'natywna lektorka HE'],
  [/natywny lektor włoski/g, 'natywny lektor IT'],
  [/natywny lektor tajski/g, 'natywny lektor TH'],
  [/brytyjski lektor angielski/g, 'brytyjski lektor EN'],
  [/argentyńska lektorka/g, 'lektorka AR'],

  // Specjalne frazy z długich opisów
  [/specjalność: język portugalski iberyjski i brazylijski/g, 'język portugalski PT i BR'],
  [/język hiszpański \(AR i ES\) i angielski/g, 'hiszpański AR, ES i EN'],

  // 4 zastosowania → 3 (redukcja)
  [/IVR, reklama, narracja, audiobook\./g, 'IVR, reklama, narracja.'],
  [/Reklama, narracja, audiobook, dubbing\./g, 'Reklama, narracja, dubbing.'],
];

// ============================================================
// 2. Ręczne override — dla profili których regex nie wystarczy
// ============================================================
// Format: { name: 'Lektor', new: 'Nowy pełny opis' }
// Stosowane PO regex replacements jeśli dalej > 160 znaków.
const MANUAL_OVERRIDES = {
  'Hubert': 'Hubert — 30–50 lat, ciepła barwa i ciekawy tembr, doświadczenie prezentera radiowego. IVR, reklama, audiobook. Próbka + wycena w 48h. powitania.pl od 2001 roku.',
  'Maciej': 'Maciej — 20–30 lat, wszechstronny głos do dubbingu i reklam, nagrania PL, EN. IVR, reklama, audiobook. Próbka + wycena w 48h. powitania.pl od 2001 roku.',
  'Andrzej': 'Andrzej — 20–30 lat, sympatyczny głos w przyjemnym odbiorze, nagrania PL, EN. IVR, reklama, audiobook. Próbka + wycena w 48h. powitania.pl od 2001 roku.',
  'Krzysztof': 'Krzysztof — 30–50 lat, lektor z dyplomem filologii angielskiej, nagrania PL, EN. IVR, reklama, narracja. Próbka + wycena w 48h. powitania.pl od 2001 roku.',
  'Dariusz': 'Dariusz — 50+ lat, doświadczony mistrz mowy polskiej, radio, reklama i dubbing. IVR, reklama, narracja. Próbka + wycena w 48h. powitania.pl od 2001 roku.',
  'Andy': 'Andy — 30–50 lat, brytyjski lektor EN w Polsce, łatwa wymowa polskich nazw. IVR, reklama, audiobook. Próbka + wycena w 48h. powitania.pl od 2001 roku.',
  'Joanna': 'Joanna — 30–50 lat, wszechstronna barwa rozpoznawalna z wielu kampanii reklamowych. Reklama, narracja, audiobook. Próbka + wycena w 48h. powitania.pl od 2001 roku.',
  'Dorota': 'Dorota — 30–50 lat, aktorka teatralna i TV, znakomita do audiobooków i narracji. IVR, narracja, audiobook. Próbka + wycena w 48h. powitania.pl od 2001 roku.',
  'Joachim': 'Joachim — 20–30 lat, rzadki natywny lektor PL, DE. IVR, reklama, narracja, audiobook. Próbka + wycena w 48h. powitania.pl od 2001 roku.',
  'Jacek Kurowski': 'Jacek Kurowski — 30–50 lat, głos doświadczonego dziennikarza sportowego. IVR, reklama, narracja. Próbka + wycena w 48h. powitania.pl od 2001 roku.',
  'Jessica': 'Jessica — 30–50 lat, wyrazista i pełna barwa, nagrania EN, FR, DE. IVR, reklama, narracja. Próbka + wycena. powitania.pl od 2001 roku.',
  'Piotr 4': 'Piotr 4 — 30–50 lat, wszechstronny głos aktora do reklam, gier i Teatru PR. IVR, reklama, audiobook. Próbka + wycena w 48h. powitania.pl od 2001 roku.',
  'Bill': 'Bill — 50+ lat, jeden z najbardziej rozpoznawalnych głosów USA, trailery filmowe. IVR, reklama, narracja. Próbka + wycena w 72h. powitania.pl od 2001 roku.',
  'David 2': 'David 2 — 30–50 lat, lektor wielojęzyczny, portugalski PT i BR. IVR, reklama, narracja. Próbka + wycena. powitania.pl od 2001 roku.',
  'Mateusz': 'Mateusz — 30–50 lat, sprawdzony głos promosów i reportaży, znany z Orange Sport. IVR, reklama, narracja. Próbka + wycena w 48h. powitania.pl od 2001 roku.',
  'Natalia': 'Natalia — 20–30 lat, lektorka AR z 13-letnim stażem, hiszpański AR, ES i EN. Reklama, narracja. Próbka + wycena. powitania.pl od 2001 roku.',
  'Kritsada': 'Kritsada — 30–50 lat, doświadczony natywny lektor TH, były prezenter BBC Thai. IVR, reklama, narracja. Próbka + wycena. powitania.pl od 2001 roku.',
  'Jarosław': 'Jarosław — 50+ lat, doświadczony aktor i lektor, ciepły tembr z aktorską interpretacją. Reklama, narracja. Próbka + wycena w 48h. powitania.pl od 2001 roku.',
  'Marcin': 'Marcin — 30–50 lat, charakterystyczny szeptany styl, 20+ lat w branży lektorskiej. IVR, reklama, narracja. Próbka + wycena w 48h. powitania.pl od 2001 roku.',
  'Joanna': 'Joanna — 30–50 lat, wszechstronna barwa głosu z wielu kampanii reklamowych. Reklama, narracja, audiobook. Próbka + wycena w 48h. powitania.pl od 2001 roku.',
  'Agnieszka': 'Agnieszka — 50+ lat, dojrzały i głęboki głos do reportażu, publicystyki i bajek. IVR, reklama, narracja. Próbka + wycena w 48h. powitania.pl od 2001 roku.',
};

// ============================================================
// Logika
// ============================================================

function applyReplacements(text) {
  let out = text;
  for (const [pattern, replacement] of REPLACEMENTS) {
    out = out.replace(pattern, replacement);
  }
  return out;
}

function main() {
  const voices = JSON.parse(fs.readFileSync(VOICES_PATH, 'utf8'));

  const tooLongBefore = voices.filter(v => v.seoDescription && v.seoDescription.length > MAX_LEN);
  console.log(`\n📊 Przed: ${tooLongBefore.length} opisów > ${MAX_LEN} znaków\n`);

  let regexFixed = 0;
  let manualFixed = 0;
  const stillBad = [];
  const changes = [];

  voices.forEach(v => {
    if (!v.seoDescription) return;
    const before = v.seoDescription;
    if (before.length <= MAX_LEN) return;

    // Krok 1: generyczne regex
    let after = applyReplacements(before);

    // Krok 2: ręczne override jeśli dalej za długie
    if (after.length > MAX_LEN && MANUAL_OVERRIDES[v.name]) {
      after = MANUAL_OVERRIDES[v.name];
      manualFixed++;
    } else if (after.length <= MAX_LEN) {
      regexFixed++;
    }

    if (after !== before) {
      changes.push({ name: v.name, beforeLen: before.length, afterLen: after.length, after });
      v.seoDescription = after;
    }

    if (after.length > MAX_LEN) {
      stillBad.push({ name: v.name, len: after.length, text: after });
    }
  });

  // Raport
  console.log(`✅ Naprawione przez regex:    ${regexFixed}`);
  console.log(`✅ Naprawione przez override: ${manualFixed}`);
  console.log(`❌ Dalej > ${MAX_LEN} zn:            ${stillBad.length}`);

  console.log('\n--- ZMIANY ---');
  changes.forEach(c => {
    console.log(`[${c.beforeLen}→${c.afterLen}] ${c.name}`);
    console.log(`  → ${c.after}`);
  });

  if (stillBad.length > 0) {
    console.log('\n--- DALEJ ZA DŁUGIE (wymaga ręcznej edycji w MANUAL_OVERRIDES) ---');
    stillBad.forEach(s => console.log(`[${s.len}] ${s.name} | ${s.text}`));
  }

  // Walidacja też krótkich
  const tooShort = voices.filter(v => v.seoDescription && v.seoDescription.length < MIN_LEN);
  if (tooShort.length > 0) {
    console.log(`\n⚠️  ${tooShort.length} opisów < ${MIN_LEN} zn (info):`);
    tooShort.forEach(v => console.log(`  [${v.seoDescription.length}] ${v.name}`));
  }

  // Zapis
  if (DRY_RUN) {
    console.log('\n🔍 DRY RUN — nic nie zapisano. Usuń --dry-run by zapisać.');
    return;
  }

  if (changes.length === 0) {
    console.log('\n✨ Brak zmian do zapisania.');
    return;
  }

  fs.writeFileSync(VOICES_PATH, JSON.stringify(voices, null, 2) + '\n', 'utf8');
  console.log(`\n💾 Zapisano ${changes.length} zmian do ${VOICES_PATH}`);
}

main();
