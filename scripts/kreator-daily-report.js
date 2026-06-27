#!/usr/bin/env node
/**
 * Generate a daily usage report for the Kreator feature.
 *
 * Usage:
 *   node scripts/kreator-daily-report.js [YYYY-MM-DD]
 *
 * If no date is given, it reports on yesterday's data.
 *
 * ZRODLO DANYCH:
 *   Logi kreatora powstaja na PRODUKCJI. Lokalnie katalog logow jest pusty,
 *   dlatego skrypt domyslnie probuje pobrac logi z prod endpointu
 *   /admin/kreator/export/ (basic auth admin:PROD_ADMIN_PASSWORD) - tak samo
 *   jak scripts/pull-from-prod.js pobiera voices.json.
 *
 *   - PROD_ADMIN_PASSWORD ustawione  -> pobiera z produkcji (+ cache lokalnie).
 *   - brak hasla / flaga --local     -> czyta tylko lokalne logi.
 *   - gdy pobranie z prod sie nie uda -> fallback na lokalne logi.
 *
 * Output: human-readable summary printed to stdout.
 */

const fs = require('fs');
const path = require('path');
const { readLog, LOG_DIR } = require('../lib/kreator-logger');

const PROD_URL = process.env.PROD_URL || 'https://www.powitania.pl';
const USE_LOCAL = process.argv.includes('--local');

/**
 * Pobiera logi dnia z produkcji i cache'uje je lokalnie (do LOG_DIR).
 * Zwraca tablice wpisow albo null gdy sie nie udalo / brak hasla.
 */
async function fetchFromProd(dateStr) {
  const password = process.env.PROD_ADMIN_PASSWORD;
  if (!password || USE_LOCAL) return null;

  const authHeader = 'Basic ' + Buffer.from('admin:' + password).toString('base64');
  const url = PROD_URL + '/admin/kreator/export/?date=' + dateStr;

  try {
    const r = await fetch(url, { headers: { Authorization: authHeader } });
    if (!r.ok) {
      console.error('[prod] Nie udalo sie pobrac logow (HTTP ' + r.status + ') - uzywam lokalnych.');
      return null;
    }
    const data = await r.json();
    const entries = Array.isArray(data.entries) ? data.entries : [];

    // Cache lokalnie (jsonl) - przyszle uruchomienia --local maja dane.
    try {
      if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });
      const cacheFile = path.join(LOG_DIR, dateStr + '.jsonl');
      fs.writeFileSync(cacheFile, entries.map(function(e) { return JSON.stringify(e); }).join('\n') + (entries.length ? '\n' : ''), 'utf8');
    } catch (e) {
      console.error('[prod] Nie udalo sie zapisac cache logow:', e.message);
    }

    return entries;
  } catch (e) {
    console.error('[prod] Blad pobierania z produkcji (' + e.message + ') - uzywam lokalnych.');
    return null;
  }
}

/**
 * Zwraca wpisy dla danego dnia: z produkcji (gdy dostepne) albo lokalne.
 */
async function getEntries(dateStr) {
  const prod = await fetchFromProd(dateStr);
  if (prod !== null) return prod;
  return readLog(dateStr);
}

// ── Helpers ────────────────────────────────────────────────────────────

function fmtMs(ms) {
  if (ms == null) return '-';
  if (ms < 1000) return ms + ' ms';
  return (ms / 1000).toFixed(1) + ' s';
}

function percent(n, total) {
  if (!total) return '0%';
  return (n / total * 100).toFixed(1) + '%';
}

function truncate(str, len) {
  if (!str) return '';
  str = str.replace(/\n/g, ' ').trim();
  return str.length > len ? str.substring(0, len) + '…' : str;
}

function median(arr) {
  if (!arr.length) return null;
  var sorted = arr.slice().sort(function(a, b) { return a - b; });
  var mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function groupBy(entries, key) {
  var groups = {};
  entries.forEach(function(e) {
    var val = e[key] || '(brak)';
    if (!groups[val]) groups[val] = [];
    groups[val].push(e);
  });
  return groups;
}

// ── Main report ────────────────────────────────────────────────────────

function generateReport(dateStr, entries) {
  if (!entries) entries = readLog(dateStr);

  var lines = [];
  lines.push('═══════════════════════════════════════════════════════');
  lines.push('  RAPORT KREATORA - ' + dateStr);
  lines.push('═══════════════════════════════════════════════════════');
  lines.push('');

  if (!entries.length) {
    lines.push('Brak danych - kreator nie był używany tego dnia.');
    return lines.join('\n');
  }

  // ── 1. Podsumowanie ogólne ──
  var generates = entries.filter(function(e) { return e.action === 'generate'; });
  var optimizes = entries.filter(function(e) { return e.action === 'optimize'; });
  var successes = entries.filter(function(e) { return e.ok === true; });
  var failures  = entries.filter(function(e) { return e.ok === false; });

  lines.push('📊 PODSUMOWANIE');
  lines.push('───────────────────────────────────────────────────────');
  lines.push('  Łącznie wywołań:    ' + entries.length);
  lines.push('  Generowanie:        ' + generates.length);
  lines.push('  Optymalizacja:      ' + optimizes.length);
  lines.push('  Sukces:             ' + successes.length + ' (' + percent(successes.length, entries.length) + ')');
  lines.push('  Błędy:              ' + failures.length + ' (' + percent(failures.length, entries.length) + ')');
  lines.push('');

  // ── 2. Czasy odpowiedzi ──
  var times = entries.filter(function(e) { return e.responseTimeMs; }).map(function(e) { return e.responseTimeMs; });
  if (times.length) {
    var avgTime = Math.round(times.reduce(function(a, b) { return a + b; }, 0) / times.length);
    var minTime = Math.min.apply(null, times);
    var maxTime = Math.max.apply(null, times);
    var medTime = median(times);

    lines.push('⏱  CZASY ODPOWIEDZI');
    lines.push('───────────────────────────────────────────────────────');
    lines.push('  Średni:    ' + fmtMs(avgTime));
    lines.push('  Mediana:   ' + fmtMs(medTime));
    lines.push('  Min:       ' + fmtMs(minTime));
    lines.push('  Max:       ' + fmtMs(maxTime));
    lines.push('');

    // Wolne odpowiedzi (>10s)
    var slow = entries.filter(function(e) { return e.responseTimeMs && e.responseTimeMs > 10000; });
    if (slow.length) {
      lines.push('  ⚠️  Wolne odpowiedzi (>10s): ' + slow.length);
      slow.forEach(function(e) {
        lines.push('    • ' + e.ts.substring(11, 19) + ' - ' + fmtMs(e.responseTimeMs) + ' - ' + (e.serviceType || '?') + ' (' + (e.lang || 'pl') + ')');
      });
      lines.push('');
    }
  }

  // ── 3. Tokeny / koszty ──
  var tokensIn  = entries.reduce(function(s, e) { return s + (e.tokensIn || 0); }, 0);
  var tokensOut = entries.reduce(function(s, e) { return s + (e.tokensOut || 0); }, 0);
  if (tokensIn || tokensOut) {
    lines.push('🔢 TOKENY');
    lines.push('───────────────────────────────────────────────────────');
    lines.push('  Input:     ' + tokensIn.toLocaleString('pl'));
    lines.push('  Output:    ' + tokensOut.toLocaleString('pl'));
    lines.push('  Łącznie:   ' + (tokensIn + tokensOut).toLocaleString('pl'));
    lines.push('');
  }

  // ── 4. Wybory użytkowników ──
  lines.push('🎯 CO WYBIERANO');
  lines.push('───────────────────────────────────────────────────────');

  // Język
  var byLang = groupBy(entries, 'lang');
  lines.push('  Język:');
  Object.keys(byLang).sort().forEach(function(lang) {
    lines.push('    ' + lang + ': ' + byLang[lang].length + ' (' + percent(byLang[lang].length, entries.length) + ')');
  });

  // Typ usługi
  var byService = groupBy(entries, 'serviceType');
  lines.push('  Typ usługi:');
  Object.keys(byService).sort().forEach(function(svc) {
    lines.push('    ' + svc + ': ' + byService[svc].length);
  });

  // Branża (tylko generate)
  if (generates.length) {
    var byIndustry = groupBy(generates, 'industry');
    lines.push('  Branża (generate):');
    Object.keys(byIndustry).sort().forEach(function(ind) {
      lines.push('    ' + ind + ': ' + byIndustry[ind].length);
    });
  }

  // Ton
  var byTone = groupBy(generates.filter(function(e) { return e.tone; }), 'tone');
  if (Object.keys(byTone).length) {
    lines.push('  Ton:');
    Object.keys(byTone).sort().forEach(function(t) {
      lines.push('    ' + t + ': ' + byTone[t].length);
    });
  }

  // Cel
  var byCel = groupBy(generates.filter(function(e) { return e.goal; }), 'goal');
  if (Object.keys(byCel).length) {
    lines.push('  Cel:');
    Object.keys(byCel).sort().forEach(function(g) {
      lines.push('    ' + g + ': ' + byCel[g].length);
    });
  }

  lines.push('');

  // ── 5. Firmy / klienci ──
  var companies = generates.filter(function(e) { return e.company; });
  if (companies.length) {
    lines.push('🏢 FIRMY');
    lines.push('───────────────────────────────────────────────────────');
    var byCompany = groupBy(companies, 'company');
    Object.keys(byCompany).forEach(function(c) {
      lines.push('  • ' + c + ' (' + byCompany[c].length + 'x) - ' + (byCompany[c][0].serviceType || ''));
    });
    lines.push('');
  }

  // ── 6. Unikalni użytkownicy (hashed IP) ──
  var uniqueIPs = {};
  entries.forEach(function(e) { if (e.ip) uniqueIPs[e.ip] = true; });
  lines.push('👤 UNIKALNI UŻYTKOWNICY: ' + Object.keys(uniqueIPs).length + ' (na podst. hashed IP)');
  lines.push('');

  // ── 7. Wygenerowane teksty ──
  var successEntries = entries.filter(function(e) { return e.ok && e.generatedText; });
  if (successEntries.length) {
    lines.push('📝 WYGENEROWANE TEKSTY');
    lines.push('───────────────────────────────────────────────────────');
    successEntries.forEach(function(e, i) {
      var header = '  [' + (i + 1) + '] ' + e.ts.substring(11, 19) + ' | ' +
        (e.action || '?') + ' | ' + (e.serviceType || '?') + ' | ' + (e.lang || 'pl');
      if (e.company) header += ' | ' + e.company;
      if (e.wordCount) header += ' | ' + e.wordCount + ' słów';
      if (e.targetWords) header += ' (cel: ' + e.targetWords + ')';
      lines.push(header);
      lines.push('      ' + truncate(e.generatedText, 200));
      lines.push('');
    });
  }

  // ── 8. Teksty do optymalizacji (input) ──
  var optimizeEntries = optimizes.filter(function(e) { return e.inputText; });
  if (optimizeEntries.length) {
    lines.push('🔄 TEKSTY WEJŚCIOWE (optymalizacja)');
    lines.push('───────────────────────────────────────────────────────');
    optimizeEntries.forEach(function(e, i) {
      lines.push('  [' + (i + 1) + '] ' + e.ts.substring(11, 19) + ' | ' + (e.serviceType || '?'));
      lines.push('      IN:  ' + truncate(e.inputText, 150));
      if (e.generatedText) {
        lines.push('      OUT: ' + truncate(e.generatedText, 150));
      }
      lines.push('');
    });
  }

  // ── 9. Błędy ──
  if (failures.length) {
    lines.push('🚨 BŁĘDY');
    lines.push('───────────────────────────────────────────────────────');
    failures.forEach(function(e, i) {
      lines.push('  [' + (i + 1) + '] ' + e.ts.substring(11, 19) + ' | ' + (e.action || '?') + ' | ' + (e.serviceType || '?'));
      lines.push('      ' + truncate(e.error, 300));
      lines.push('');
    });
  } else {
    lines.push('✅ BRAK BŁĘDÓW - kreator działał bez problemów.');
    lines.push('');
  }

  lines.push('═══════════════════════════════════════════════════════');
  lines.push('  Koniec raportu za ' + dateStr);
  lines.push('═══════════════════════════════════════════════════════');

  return lines.join('\n');
}

// ── CLI ────────────────────────────────────────────────────────────────

// Pierwszy argument w formacie daty (pomijamy flagi typu --local).
var dateArg = process.argv.slice(2).find(function(a) {
  return /^\d{4}-\d{2}-\d{2}$/.test(a);
});

if (!dateArg) {
  // Czy podano cos co mialo byc data, ale ma zly format?
  var badDate = process.argv.slice(2).find(function(a) { return a.indexOf('-') !== -1 && a[0] !== '-'; });
  if (badDate) {
    console.error('Usage: node scripts/kreator-daily-report.js [YYYY-MM-DD] [--local]');
    process.exit(1);
  }
  // Default: yesterday
  var d = new Date();
  d.setDate(d.getDate() - 1);
  dateArg = d.toISOString().slice(0, 10);
}

(async function() {
  try {
    var entries = await getEntries(dateArg);
    console.log(generateReport(dateArg, entries));
  } catch (e) {
    console.error('Blad generowania raportu:', e.message);
    process.exit(1);
  }
})();
