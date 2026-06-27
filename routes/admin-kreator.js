/**
 * Admin endpoint: eksport logow kreatora (dla raportow dziennych).
 *
 * Logi kreatora powstaja na produkcji (data/logs/kreator/*.jsonl - persistent
 * volume). Ten endpoint pozwala pobrac je zdalnie pod basic auth admina, tak
 * samo jak /admin/lektorzy/export/ serwuje voices.json. Skrypt
 * scripts/kreator-daily-report.js korzysta z tego do generowania raportow
 * lokalnie / w scheduled tasku.
 *
 * Trasy:
 *   GET /admin/kreator/export/?date=YYYY-MM-DD
 *       -> JSON: { date, count, entries: [...] }  (entries = sparsowane linie logu)
 *       Bez ?date  -> domyslnie wczoraj.
 */
const express = require('express');
const router = express.Router();

const { readLog } = require('../lib/kreator-logger');

// --- Auth middleware (taki sam wzorzec jak routes/admin.js) ---
function requireAuth(req, res, next) {
  const adminPass = process.env.ADMIN_PASSWORD || 'powitania2024';

  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Basic ')) {
    res.set('WWW-Authenticate', 'Basic realm="Admin Panel"');
    return res.status(401).send('Wymagane logowanie');
  }

  const decoded = Buffer.from(auth.split(' ')[1], 'base64').toString();
  const [user, pass] = decoded.split(':');

  if (user === 'admin' && pass === adminPass) {
    return next();
  }

  res.set('WWW-Authenticate', 'Basic realm="Admin Panel"');
  return res.status(401).send('Nieprawidłowe hasło');
}

router.use(requireAuth);

function yesterdayStr() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

router.get('/export/', (req, res) => {
  let date = req.query.date || yesterdayStr();

  // Scisla walidacja formatu daty - chroni przed path traversal w readLog.
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({ error: 'Zly format daty. Wymagane YYYY-MM-DD.' });
  }

  const entries = readLog(date); // [] gdy brak pliku

  res.set('Content-Type', 'application/json; charset=utf-8');
  res.json({ date: date, count: entries.length, entries: entries });
});

module.exports = router;
