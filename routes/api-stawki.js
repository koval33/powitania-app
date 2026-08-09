// Stawki i wyceny dla automatyzacji (Hermes -> CRM -> draft maila z wyceną).
//
// Endpointy (wyłącznie GET, wyłącznie odczyt):
//   GET /api/stawki/uslugi              - lista rodzajów usług i ich progów
//   GET /api/stawki/lektor/:kto         - cennik jednego lektora
//   GET /api/stawki/wycena?...          - policzona wycena
//
// Auth: Bearer DRAFT_API_TOKEN (ten sam, co /api/voices).
//
// Ten router NICZEGO nie zapisuje i nie dotyka ścieżek, z których korzysta
// serwis - kalkulator na stronie działa po staremu. Dołożenie tej trasy nie
// zmienia zachowania powitania.pl.

const express = require('express');
const crypto = require('crypto');
const router = express.Router();

const pricing = require('../lib/pricing.js');

function requireBearer(req, res, next) {
  const token = process.env.DRAFT_API_TOKEN;
  if (!token) {
    console.error('[api-stawki] DRAFT_API_TOKEN env var not set');
    return res.status(500).json({ error: 'Server config error: token not configured' });
  }
  const auth = req.headers.authorization || '';
  if (!auth.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Invalid token' });
  }
  const provided = auth.slice(7).trim();
  const a = Buffer.from(provided, 'utf8');
  const b = Buffer.from(token, 'utf8');
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return res.status(401).json({ error: 'Invalid token' });
  }
  return next();
}

router.use(requireBearer);

router.get('/uslugi', (req, res) => {
  const out = {};
  for (const [key, svc] of Object.entries(pricing.PRICING_MAP)) {
    out[key] = {
      nazwa: svc.label,
      sposob: svc.method,
      jednostka: svc.unit || null,
      progi: (svc.tiers || []).map(t => t.label),
      opcje: (svc.options || []).map(o => o.label),
      dodatki: svc.addons,
      uwaga: svc.note
    };
  }
  res.json({ ok: true, uslugi: out, dodatki_stale: pricing.FIXED_ADDONS });
});

router.get('/lektor/:kto', (req, res) => {
  const found = pricing.findCandidates(req.params.kto);
  if (found.length === 0) {
    return res.status(404).json({ ok: false, error: `Nie znalazłem lektora: ${req.params.kto}` });
  }
  if (found.length > 1) {
    return res.status(409).json({
      ok: false,
      error: `"${req.params.kto}" pasuje do ${found.length} lektorów`,
      kandydaci: found.map(v => ({ lektor: v.name, profil: v.profileUrl || '',
                                   ceny_ukryte: Boolean(v.hidePrice) }))
    });
  }
  const v = found[0];
  res.json({
    ok: true,
    lektor: v.name,
    profil: v.profileUrl || '',
    grupa_cenowa: v.priceGroup || '',
    ceny_ukryte: Boolean(v.hidePrice),
    realizacja: v.turnaround || '',
    jezyki: v.languages || [],
    stawki: v.prices || {}
  });
});

router.get('/wycena', (req, res) => {
  const q = req.query || {};
  const addons = String(q.dodatki || '').split(',').map(s => s.trim()).filter(Boolean);
  const result = pricing.quote({
    voice: q.lektor,
    service: q.usluga,
    amount: q.ilosc,
    option: q.zasieg,
    addons,
    express: String(q.ekspres || '') === '1' || q.ekspres === 'true'
  });
  // Brak stawki to poprawna odpowiedź, nie awaria - automat ma o tym
  // powiedzieć człowiekowi, a nie podstawiać własną liczbę.
  res.json(result);
});

module.exports = router;
