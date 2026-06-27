/**
 * Kreator usage logger - appends JSON lines to daily log files.
 * Log files: data/logs/kreator/YYYY-MM-DD.jsonl
 *
 * WAZNE: logi leza pod data/ czyli na PERSISTENT VOLUME Railway (zamontowany
 * pod data/). Dzieki temu przezywaja redeploy. Wczesniej byly w ../logs/ ktore
 * jest efemeryczne na Railway (kasowane przy kazdym deployu) - przez co raporty
 * dzienne gubily dane po deployu. Sciezke mozna nadpisac env KREATOR_LOG_DIR.
 *
 * Each line is a JSON object with:
 *   ts, action, lang, serviceType, industry, duration, wordCount,
 *   targetWords, generatedText, inputText (optimize only),
 *   responseTimeMs, ok, error, tokensIn, tokensOut, ip (hashed)
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const LOG_DIR = process.env.KREATOR_LOG_DIR ||
  path.join(__dirname, '..', 'data', 'logs', 'kreator');

// Ensure log directory exists (sync, runs once at startup)
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

// Hash IP for privacy (one-way, daily salt so cannot be traced across days)
function hashIP(ip) {
  var day = new Date().toISOString().slice(0, 10);
  return crypto.createHash('sha256').update(ip + ':' + day).digest('hex').slice(0, 12);
}

/**
 * Log a kreator request/response.
 * @param {object} entry - log entry data
 */
function logKreator(entry) {
  try {
    var now = new Date();
    var dateStr = now.toISOString().slice(0, 10);
    var logFile = path.join(LOG_DIR, dateStr + '.jsonl');

    var line = JSON.stringify({
      ts: now.toISOString(),
      action: entry.action || '',           // 'generate' | 'optimize'
      lang: entry.lang || 'pl',
      serviceType: entry.serviceType || '',
      industry: entry.industry || '',
      duration: entry.duration || null,      // requested duration (sec)
      company: entry.company || '',
      audience: entry.audience || '',
      tone: entry.tone || '',
      goal: entry.goal || '',
      inputText: entry.inputText || '',      // optimize: original text
      generatedText: entry.generatedText || '',
      wordCount: entry.wordCount || null,    // actual words in generated text
      targetWords: entry.targetWords || null, // expected word count
      responseTimeMs: entry.responseTimeMs || null,
      ok: entry.ok !== undefined ? entry.ok : true,
      error: entry.error || null,
      tokensIn: entry.tokensIn || null,
      tokensOut: entry.tokensOut || null,
      ip: entry.ip ? hashIP(entry.ip) : null
    }) + '\n';

    fs.appendFileSync(logFile, line, 'utf8');
  } catch (err) {
    // Never let logging break the main flow
    console.error('[kreator-logger] Write error:', err.message);
  }
}

/**
 * Read log entries for a given date.
 * @param {string} dateStr - YYYY-MM-DD
 * @returns {Array<object>}
 */
function readLog(dateStr) {
  var logFile = path.join(LOG_DIR, dateStr + '.jsonl');
  if (!fs.existsSync(logFile)) return [];
  var lines = fs.readFileSync(logFile, 'utf8').trim().split('\n');
  return lines.filter(function(l) { return l.trim(); }).map(function(l) {
    try { return JSON.parse(l); } catch(e) { return null; }
  }).filter(Boolean);
}

module.exports = { logKreator, readLog, LOG_DIR };
