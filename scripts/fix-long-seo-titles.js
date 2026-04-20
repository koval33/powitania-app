#!/usr/bin/env node
/**
 * Poprawka 52 tytułów seoTitle > 60 znaków w data-seed/voices.json
 *
 * Google obcina tytuły > 60 zn w SERP (desktop; na mobile dalej ~60-65).
 * Wszystkie te 52 tytuły są z pierwszej partii 90 (lektorzy rozpoznawalni - wysoki CTR).
 *
 * Strategia: override po ID (każdy z 52 dostaje ręcznie dobrany, skrócony tytuł).
 * Każdy nowy tytuł ≤ 60 zn, zachowuje kluczowe słowa i "| powitania.pl".
 *
 * Uruchomienie:
 *   node scripts/fix-long-seo-titles.js --dry-run   (podgląd)
 *   node scripts/fix-long-seo-titles.js             (zapis)
 */

const fs = require('fs');
const path = require('path');

const VOICES_PATH = path.join(__dirname, '..', 'data-seed', 'voices.json');
const DRY_RUN = process.argv.includes('--dry-run');
const MAX_LEN = 60;

// ============================================================
// Override po ID - 52 ręcznie skrócone tytuły
// Każdy zachowuje kluczowe słowa (TV/radio/brand names/years)
// ============================================================
const TITLE_OVERRIDES = {
  'andrzej-ferenc':          'Andrzej Ferenc - znany głos polskiej TV | powitania.pl',
  'carla':                   'Carla - nagradzana lektorka native EN | powitania.pl',
  'maciej-jablonski':        'Maciej Jabłoński - prezenter TVP, trener | powitania.pl',
  'krzysztof-studio':        'Krzysztof - lektor z własnym studiem, 24h | powitania.pl',
  'michal-reklamowy':        'Michał - lektor reklamowy, 20+ lat | powitania.pl',
  'bartosz':                 'Bartosz - mocny głos lektorski, 10 lat | powitania.pl',
  'marcin-weteran':          'Marcin - wszechstronny lektor, 30 lat | powitania.pl',
  'zofia':                   'Zofia - aktorka PWSF Łódź, uczennica Gajosa | powitania.pl',
  'kuba-bielak':             'Kuba Bielak - lektor TVN Turbo, radio i TV | powitania.pl',
  'beata':                   'Beata - ciepła barwa wzbudzająca zaufanie | powitania.pl',
  'alicja-wszechstronna':    'Alicja - zmysłowy, zabawny, zadziorny głos | powitania.pl',
  'aleksander':              'Aleksander - muzyk, charakterystyczny głos | powitania.pl',
  'kamila':                  'Kamila - energia i femme fatale w głosie | powitania.pl',
  'zbigniew-moskal':         'Zbigniew Moskal - niski głos z reklam | powitania.pl',
  'jaroslaw':                'Jarosław - aktorska interpretacja, 50+ lat | powitania.pl',
  'maciek':                  'Maciek - młody, ciepły, wszechstronny głos | powitania.pl',
  'przemyslaw':              'Przemysław - dynamiczny głos do reklam | powitania.pl',
  'aleksandra':              'Aleksandra - dziennikarka radiowa, 20 lat | powitania.pl',
  'krzysztof-ekspresowy':    'Krzysztof - doświadczony lektor, 24h | powitania.pl',
  'agnieszka-dubbing':       'Agnieszka - aktorka, szeptanki i dubbing | powitania.pl',
  'pawel-szwajgier':         'Paweł Szwajgier - kabaret, bajki i scenki | powitania.pl',
  'janek':                   'Janek - lektor radiowy, konferansjer | powitania.pl',
  'blazej':                  'Błażej - lektor radiowy, dynamiczny głos | powitania.pl',
  'stanislaw-olejniczak':    'Stanisław Olejniczak - głos filmowy | powitania.pl',
  'katarzyna':               'Katarzyna - dziennikarka radiowa, 8 lat | powitania.pl',
  'katarzyna-tv':            'Katarzyna - dziennikarka TV, ciepła barwa | powitania.pl',
  'filip':                   'Filip - DJ radiowy od 2010, Radio Lublin | powitania.pl',
  'maciej-szeptanka':        'Maciej - szeptanka, głos Netflixa i HBO | powitania.pl',
  'beata-tadla':             'Beata Tadla - dziennikarka telewizyjna | powitania.pl',
  'michal-wszechstronny':    'Michał - wszechstronny lektor | powitania.pl',
  'magdalena':               'Magdalena - ciepły alt, realizacja 24h | powitania.pl',
  'anita':                   'Anita - doświadczona lektorka, jasny głos | powitania.pl',
  'konstancja':              'Konstancja - native British i American EN | powitania.pl',
  'kinga':                   'Kinga - lektorka, wokalistka, wesoły głos | powitania.pl',
  'natalia-wszechstronna':   'Natalia - spoty, eventy, trailery, IVR | powitania.pl',
  'robert':                  'Robert - lektor radiowy od 2007, dynamiczny | powitania.pl',
  'bruno':                   'Bruno - młody głos, spoty reklamowe | powitania.pl',
  'michal-dj':               'Michał - DJ, producent, spoty i zajawki | powitania.pl',
  'anna-samusionek':         'Anna Samusionek - niski aksamitny głos | powitania.pl',
  'zuzanna':                 'Zuzanna - ciepły, melodyjny głos | powitania.pl',
  'magda':                   'Magda - aktorka teatralna, audiobooki | powitania.pl',
  'olga':                    'Olga - duże zdolności interpretacyjne | powitania.pl',
  'anna-narracja':           'Anna - dojrzały ciepły głos, narracje | powitania.pl',
  'malgorzata':              'Małgorzata - 29 lat, RMF FM i Meloradio | powitania.pl',
  'katarzyna-skolimowska':   'Katarzyna Skolimowska - aktorka PWST | powitania.pl',
  'jacek-brzostynski':       'Jacek Brzostyński - lektor filmowy | powitania.pl',
  'kim-dubbing':              'Kim - aktorka, dubbing i audiobooki | powitania.pl',
  'lukasz-reklamy':          'Łukasz - lektor od 2012, IKEA i Coca-Cola | powitania.pl',
  'mateusz-wszechstronny':   'Mateusz - wszechstronny głos i dynamika | powitania.pl',
  'michal':                  'Michał - czytelny głos w średnicy | powitania.pl',
  'daniel':                  'Daniel - głos reklamowy PL, EN | powitania.pl',
  'marcin':                  'Marcin - lektor szeptany, 20+ lat | powitania.pl',
};

// ============================================================
// Logika
// ============================================================

function main() {
  const voices = JSON.parse(fs.readFileSync(VOICES_PATH, 'utf8'));

  const longBefore = voices.filter(v => v.seoTitle && v.seoTitle.length > MAX_LEN);
  console.log(`\n📊 Przed: ${longBefore.length} tytułów > ${MAX_LEN} znaków`);

  let applied = 0;
  let skipped = 0;
  let stillBad = 0;
  const changes = [];
  const unmatched = [];
  const tooLongOverrides = [];

  voices.forEach(v => {
    const override = TITLE_OVERRIDES[v.id];
    if (!override) return;

    if (override.length > MAX_LEN) {
      tooLongOverrides.push({ id: v.id, len: override.length, val: override });
      return;
    }

    if (v.seoTitle === override) {
      skipped++;
      return;
    }

    changes.push({
      id: v.id,
      name: v.name,
      before: v.seoTitle,
      after: override,
      beforeLen: v.seoTitle.length,
      afterLen: override.length,
    });
    v.seoTitle = override;
    applied++;
  });

  // Nie znaleziono ID z override'a w voices.json
  const voiceIds = new Set(voices.map(v => v.id));
  Object.keys(TITLE_OVERRIDES).forEach(id => {
    if (!voiceIds.has(id)) unmatched.push(id);
  });

  // Raport
  console.log(`\n--- ZMIANY (${applied}) ---`);
  changes.forEach(c => {
    console.log(`[${c.beforeLen}→${c.afterLen}] ${c.id} (${c.name})`);
    console.log(`  PRZED: ${c.before}`);
    console.log(`   PO:   ${c.after}`);
  });

  if (tooLongOverrides.length > 0) {
    console.log(`\n❌ Override'y same > ${MAX_LEN} zn (bug w skrypcie):`);
    tooLongOverrides.forEach(o => console.log(`  [${o.len}] ${o.id}: ${o.val}`));
  }

  if (unmatched.length > 0) {
    console.log(`\n⚠️  Override'y dla nieznanych ID (literówka?):`);
    unmatched.forEach(id => console.log(`  ${id}`));
  }

  // Post-check: ile jeszcze > MAX_LEN
  const longAfter = voices.filter(v => v.seoTitle && v.seoTitle.length > MAX_LEN);
  if (longAfter.length > 0) {
    console.log(`\n⚠️  Dalej > ${MAX_LEN} zn (brak override'a):`);
    longAfter.forEach(v => console.log(`  [${v.seoTitle.length}] ${v.id}: ${v.seoTitle}`));
  }

  console.log(`\n📊 Po: ${longAfter.length} tytułów > ${MAX_LEN} znaków`);
  console.log(`   Zastosowano: ${applied} / pominięto (bez zmian): ${skipped}`);

  // Zapis
  if (DRY_RUN) {
    console.log('\n🔍 DRY RUN - nic nie zapisano. Usuń --dry-run by zapisać.');
    return;
  }

  if (applied === 0) {
    console.log('\n✨ Brak zmian do zapisania.');
    return;
  }

  fs.writeFileSync(VOICES_PATH, JSON.stringify(voices, null, 2) + '\n', 'utf8');
  console.log(`\n💾 Zapisano ${applied} zmian do ${VOICES_PATH}`);
}

main();
