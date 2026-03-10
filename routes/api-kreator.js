const express = require('express');
const router = express.Router();
const { buildPrompt, calcWords, countSpeakableWords } = require('../lib/prompts');
const RateLimiter = require('../lib/rate-limiter');
const { verifyTurnstile } = require('../lib/turnstile');

// Rate limit: max 5 wywołań / minutę / IP
const kreatorLimiter = new RateLimiter({
  windowMs: 60 * 1000,
  max: 5,
  message: 'Zbyt wiele generowań. Poczekaj minutę i spróbuj ponownie.'
});

async function callAnthropic(apiKey, messages, maxTokens = 2048) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: maxTokens,
      messages
    })
  });
  const data = await response.json();
  if (!response.ok || !data.content || !data.content[0]) {
    throw new Error(JSON.stringify(data));
  }
  return data;
}

// Walidacja pól wejściowych — tylko znane pola, reszta ignorowana
const FIELD_LIMITS = {
  lang: 5,
  company: 200,
  offering: 1000,
  serviceType: 50,
  industry: 50,
  audience: 50,
  tone: 50,
  goal: 50,
  duration: 20,
  textInput: 5000,  // optimize: tekst do optymalizacji
  targetDur: 20
};
const MAX_TOTAL_INPUT = 8000; // max łączna długość wszystkich pól

function validateInput(body) {
  let totalLen = 0;
  for (const [key, limit] of Object.entries(FIELD_LIMITS)) {
    const val = body[key];
    if (typeof val === 'string') {
      if (val.length > limit) {
        return `Pole jest za długie (max ${limit} znaków).`;
      }
      totalLen += val.length;
    }
  }
  if (totalLen > MAX_TOTAL_INPUT) {
    return `Łączna długość danych przekracza limit.`;
  }
  return null;
}

// ── Generate — jedno wywołanie API, bez retry ───────────────────────────
router.post('/generate', kreatorLimiter.middleware(), verifyTurnstile, async (req, res) => {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ ok: false, error: 'Brak konfiguracji API' });
  }

  const validationError = validateInput(req.body);
  if (validationError) {
    return res.status(400).json({ ok: false, error: validationError });
  }

  try {
    const params = { action: 'generate', ...req.body };
    const prompt = buildPrompt(params);

    const data = await callAnthropic(apiKey, [{ role: 'user', content: prompt }]);
    const text = data.content[0].text.trim();

    // Log word count for monitoring (no retry)
    const { serviceType, duration, lang } = req.body;
    if (duration && serviceType !== 'ivr') {
      const targetWords = calcWords(parseInt(duration), lang || 'pl', serviceType);
      const actualWords = countSpeakableWords(text);
      console.log(`[kreator] Generated: ${actualWords}/${targetWords} words`);
    }

    res.json({ ok: true, text, usage: data.usage });
  } catch (err) {
    console.error('[kreator] Error:', err);
    res.status(500).json({ ok: false, error: 'Wystąpił błąd. Spróbuj ponownie.' });
  }
});

// ── Optimize — jedno wywołanie API, bez retry ───────────────────────────
router.post('/optimize', kreatorLimiter.middleware(), verifyTurnstile, async (req, res) => {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ ok: false, error: 'Brak konfiguracji API' });
  }

  const validationError = validateInput(req.body);
  if (validationError) {
    return res.status(400).json({ ok: false, error: validationError });
  }

  try {
    const prompt = buildPrompt({ action: 'optimize', ...req.body });

    const data = await callAnthropic(apiKey, [{ role: 'user', content: prompt }]);
    const text = data.content[0].text.trim();

    // Log word count for monitoring (no retry)
    const { targetDur, serviceType, lang: optLang } = req.body;
    if (targetDur) {
      const targetWords = calcWords(parseInt(targetDur), optLang || 'pl', serviceType);
      const actualWords = countSpeakableWords(text);
      console.log(`[kreator] Optimized: ${actualWords}/${targetWords} words`);
    }

    res.json({ ok: true, text, usage: data.usage });
  } catch (err) {
    console.error('[kreator] Optimize error:', err);
    res.status(500).json({ ok: false, error: 'Wystąpił błąd. Spróbuj ponownie.' });
  }
});

module.exports = router;
