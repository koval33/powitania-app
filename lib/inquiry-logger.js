/**
 * Append-only log zapytan klientow (backup gdyby EmailLabs/CRM zawiodly cicho).
 * Plik: data/inquiries-log.jsonl (JSON Lines, jeden lead = jedna linia).
 * Zapis nigdy nie rzuca bledu (failover na console.error) zeby nie blokowac
 * glownego flow zapytania.
 */
const fs = require('fs');
const path = require('path');

const LOG_PATH = path.join(__dirname, '..', 'data', 'inquiries-log.jsonl');

function logInquiry(record) {
  try {
    const line = JSON.stringify({ ts: new Date().toISOString(), ...record }) + '\n';
    fs.appendFileSync(LOG_PATH, line, 'utf8');
  } catch (err) {
    console.error('[inquiry-logger] Failed to write log:', err.message);
  }
}

function readInquiries() {
  try {
    if (!fs.existsSync(LOG_PATH)) return [];
    const content = fs.readFileSync(LOG_PATH, 'utf8');
    return content.split('\n').filter(Boolean).map(l => {
      try { return JSON.parse(l); } catch { return null; }
    }).filter(Boolean);
  } catch (err) {
    console.error('[inquiry-logger] Failed to read log:', err.message);
    return [];
  }
}

module.exports = { logInquiry, readInquiries, LOG_PATH };
