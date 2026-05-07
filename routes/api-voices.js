// Public API for voice drafts (n8n integration).
// Endpoint: POST /api/voices/draft/
// Auth: Bearer DRAFT_API_TOKEN (env)
// Behavior:
//   1. Validate schema + bearer token
//   2. Generate kebab-case slug from name (unique check, 409 on conflict)
//   3. Call Claude API to generate 5 SEO/EN fields (seoTitle, seoDescription,
//      descriptionEn, seoTitleEn, seoDescriptionEn) - keeps parity with
//      existing 234 voices that have all SEO fields populated.
//   4. Persist to voices.json (data/ + data-seed/) with approved=false
//   5. Return {id, editUrl}

const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const router = express.Router();

const DATA_PATH = path.join(__dirname, '..', 'data', 'voices.json');
const SEED_PATH = path.join(__dirname, '..', 'data-seed', 'voices.json');

const ALLOWED_AGES = ['20-30 lat', '30-50 lat', '50 lat +'];
const ALLOWED_APPS = ['Reklama', 'Narracja do filmu', 'Audiobook', 'Powitanie tel.'];
const ALLOWED_PRICES = ['Niższa grupa cenowa', 'Wyższa grupa cenowa'];
const ALLOWED_TURN = ['24h', '48h', '72h'];

function loadVoicesRaw() {
  return JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
}

function saveVoices(voices) {
  // Sync to both files - matches admin.js saveVoices() behavior
  const json = JSON.stringify(voices, null, 2);
  fs.writeFileSync(DATA_PATH, json, 'utf8');
  try {
    fs.writeFileSync(SEED_PATH, json, 'utf8');
  } catch (err) {
    if (err.code !== 'ENOENT' && err.code !== 'EACCES') {
      console.warn('[api-voices] data-seed sync skipped:', err.code, err.message);
    }
  }
}

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/ą/g, 'a').replace(/ć/g, 'c').replace(/ę/g, 'e')
    .replace(/ł/g, 'l').replace(/ń/g, 'n').replace(/ó/g, 'o')
    .replace(/ś/g, 's').replace(/ź/g, 'z').replace(/ż/g, 'z')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

// Bearer auth middleware
function requireBearer(req, res, next) {
  const token = process.env.DRAFT_API_TOKEN;
  if (!token) {
    console.error('[api-voices] DRAFT_API_TOKEN env var not set');
    return res.status(500).json({ error: 'Server config error: token not configured' });
  }
  const auth = req.headers.authorization || '';
  if (!auth.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Invalid token' });
  }
  const provided = auth.slice(7).trim();
  // Constant-time comparison to prevent timing attacks
  const a = Buffer.from(provided, 'utf8');
  const b = Buffer.from(token, 'utf8');
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return res.status(401).json({ error: 'Invalid token' });
  }
  next();
}

function validateBody(b) {
  if (typeof b.name !== 'string' || !b.name.trim()) return 'Missing required field: name';
  if (b.gender !== 'm' && b.gender !== 'f') return 'gender must be "m" or "f"';
  if (b.age != null && !ALLOWED_AGES.includes(b.age)) {
    return 'age must be one of: ' + ALLOWED_AGES.join(', ') + ' or null';
  }
  if (!Array.isArray(b.languages) || b.languages.length === 0) {
    return 'languages must be a non-empty array';
  }
  if (b.languages.some(l => typeof l !== 'string')) {
    return 'languages must contain only strings';
  }
  if (typeof b.description !== 'string' || b.description.length < 200) {
    return 'description must be at least 200 characters';
  }
  if (b.descriptionEn != null && typeof b.descriptionEn !== 'string') {
    return 'descriptionEn must be string or null';
  }
  if (typeof b.native !== 'boolean') return 'native must be boolean';
  if (b.native && (!b.nativeLanguage || typeof b.nativeLanguage !== 'string')) {
    return 'nativeLanguage required when native=true';
  }
  if (!Array.isArray(b.applications) || b.applications.some(a => !ALLOWED_APPS.includes(a))) {
    return 'applications must be subset of ' + JSON.stringify(ALLOWED_APPS);
  }
  if (b.priceGroup != null && !ALLOWED_PRICES.includes(b.priceGroup)) {
    return 'priceGroup must be one of: ' + ALLOWED_PRICES.join(', ') + ' or null';
  }
  if (b.turnaround != null && !ALLOWED_TURN.includes(b.turnaround)) {
    return 'turnaround must be one of: ' + ALLOWED_TURN.join(', ') + ' or null';
  }
  return null;
}

// Calls Claude (Haiku) to generate 5 SEO/EN fields in single request.
// Cost: ~1500 tokens / call -> ~$0.002 per draft (Haiku 4.5 pricing).
async function generateSeoFields({ name, description, descriptionEn }) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not set');

  const enHint = descriptionEn
    ? `\n- Description (English) provided by client - use VERBATIM, do not rewrite:\n"""${descriptionEn}"""`
    : '\n- Description (English): NOT provided - translate from Polish (~400-500 chars).';

  const prompt = `You generate SEO meta fields for a Polish voice-over artist profile on powitania.pl. Return ONLY raw JSON, no commentary, no markdown fences.

Input:
- Name: ${name}
- Description (Polish, source of truth):
"""${description}"""${enHint}

Generate exactly 5 fields:
1. seoTitle (Polish): max 60 chars, format like "${name} - [key trait/role] | powitania.pl"
2. seoDescription (Polish): max 160 chars, mention name, services, "Próbka + wycena w 48h" or "powitania.pl od 2001 roku" pattern
3. descriptionEn: ${descriptionEn ? 'use the English description provided above verbatim' : 'translate Polish description to natural English (~400-500 chars)'}
4. seoTitleEn (English): max 60 chars, format like "${name} - [key trait/role] | powitania.pl"
5. seoDescriptionEn (English): max 160 chars, mention name, services, "since 2001" pattern

CRITICAL RULES:
- Use plain ASCII hyphen "-" only. NEVER em-dash "—" or en-dash "–".
- No emoji. No quotation marks around words unless part of brand.
- Polish output: use proper Polish characters (ą, ę, ł, ó, etc.)
- Stay under char limits strictly.

Output (raw JSON, no fence):
{"seoTitle":"...","seoDescription":"...","descriptionEn":"...","seoTitleEn":"...","seoDescriptionEn":"..."}`;

  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5',
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt }]
    })
  });
  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error('Anthropic API ' + resp.status + ': ' + errText.slice(0, 300));
  }
  const data = await resp.json();
  const text = (data.content && data.content[0] && data.content[0].text || '').trim();
  // Strip optional code fence (defensive - prompt asks raw JSON)
  const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();
  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch (e) {
    throw new Error('Claude returned invalid JSON: ' + cleaned.slice(0, 200));
  }
  // Defensive: enforce no em/en-dash even if model slipped
  ['seoTitle', 'seoDescription', 'descriptionEn', 'seoTitleEn', 'seoDescriptionEn'].forEach(k => {
    if (typeof parsed[k] === 'string') {
      parsed[k] = parsed[k].replace(/[—–]/g, '-').trim();
    } else {
      throw new Error('Claude missed field: ' + k);
    }
  });
  return parsed;
}

// POST /api/voices/draft/
router.post('/draft/', express.json({ limit: '50kb' }), requireBearer, async (req, res) => {
  try {
    const b = req.body || {};
    const validationErr = validateBody(b);
    if (validationErr) return res.status(400).json({ error: validationErr });

    const voices = loadVoicesRaw();
    const slug = slugify(b.name);
    if (!slug) return res.status(400).json({ error: 'Cannot generate slug from name' });

    const existing = voices.find(v => v.id === slug);
    if (existing) {
      return res.status(409).json({
        error: `Voice with slug '${slug}' already exists`,
        existing: {
          id: existing.id,
          name: existing.name,
          approved: existing.approved === true
        }
      });
    }

    // Generate SEO fields via Claude (sync - waits for completion)
    let seo;
    try {
      seo = await generateSeoFields({
        name: b.name.trim(),
        description: b.description.trim(),
        descriptionEn: b.descriptionEn || null
      });
    } catch (e) {
      console.error('[api-voices] SEO generation failed:', e.message);
      return res.status(502).json({ error: 'SEO generation failed: ' + e.message });
    }

    const maxOrder = voices.reduce(
      (m, v) => Math.max(m, typeof v.order === 'number' ? v.order : 0),
      0
    );

    const voice = {
      id: slug,
      name: b.name.trim(),
      gender: b.gender,
      age: b.age || null,
      languages: b.languages,
      description: b.description.trim(),
      descriptionEn: seo.descriptionEn,
      photo: null,
      audio: null,
      samples: null,
      turnaround: b.turnaround || null,
      famous: false,
      native: b.native,
      nativeLanguage: b.native ? b.nativeLanguage : null,
      applications: b.applications,
      priceGroup: b.priceGroup || null,
      hidePrice: false,
      profileUrl: '/lektorzy/' + slug + '/',
      prices: {},
      seoTitle: seo.seoTitle,
      seoDescription: seo.seoDescription,
      seoTitleEn: seo.seoTitleEn,
      seoDescriptionEn: seo.seoDescriptionEn,
      order: maxOrder + 10,
      approved: false,
      createdAt: new Date().toISOString()
    };

    voices.push(voice);
    saveVoices(voices);

    console.log('[api-voices] New draft: ' + slug + ' (' + b.name + ')');

    res.json({
      id: slug,
      editUrl: '/admin/lektorzy/edytuj/' + slug + '/'
    });
  } catch (err) {
    console.error('[api-voices] Unexpected error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
