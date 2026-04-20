const express = require('express');
const router = express.Router();
const { buildPrompt, calcWords, countSpeakableWords } = require('../lib/prompts');
const RateLimiter = require('../lib/rate-limiter');
const { verifyTurnstile } = require('../lib/turnstile');
const { logKreator } = require('../lib/kreator-logger');

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
      model: 'claude-sonnet-4-6',
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

// Walidacja pól wejściowych - tylko znane pola, reszta ignorowana
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

// ── Generate - jedno wywołanie API, bez retry ───────────────────────────
router.post('/generate', kreatorLimiter.middleware(), verifyTurnstile, async (req, res) => {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ ok: false, error: 'Brak konfiguracji API' });
  }

  const validationError = validateInput(req.body);
  if (validationError) {
    return res.status(400).json({ ok: false, error: validationError });
  }

  const startTime = Date.now();
  const { serviceType, duration, lang, industry, company, audience, tone, goal } = req.body;

  try {
    const params = { action: 'generate', ...req.body };
    const prompt = buildPrompt(params);

    const data = await callAnthropic(apiKey, [{ role: 'user', content: prompt }]);
    const text = data.content[0].text.trim();

    const targetWords = (duration && serviceType !== 'ivr') ? calcWords(parseInt(duration), lang || 'pl', serviceType) : null;
    const actualWords = countSpeakableWords(text);
    if (targetWords) console.log(`[kreator] Generated: ${actualWords}/${targetWords} words`);

    logKreator({
      action: 'generate', lang: lang || 'pl', serviceType, industry, duration,
      company, audience, tone, goal,
      generatedText: text, wordCount: actualWords, targetWords,
      responseTimeMs: Date.now() - startTime, ok: true,
      tokensIn: data.usage && data.usage.input_tokens,
      tokensOut: data.usage && data.usage.output_tokens,
      ip: req.ip
    });

    res.json({ ok: true, text, usage: data.usage });
  } catch (err) {
    console.error('[kreator] Error:', err);
    logKreator({
      action: 'generate', lang: lang || 'pl', serviceType, industry, duration,
      company, audience, tone, goal,
      responseTimeMs: Date.now() - startTime, ok: false, error: String(err.message || err),
      ip: req.ip
    });
    res.status(500).json({ ok: false, error: 'Wystąpił błąd. Spróbuj ponownie.' });
  }
});

// ── Optimize - jedno wywołanie API, bez retry ───────────────────────────
router.post('/optimize', kreatorLimiter.middleware(), verifyTurnstile, async (req, res) => {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ ok: false, error: 'Brak konfiguracji API' });
  }

  const validationError = validateInput(req.body);
  if (validationError) {
    return res.status(400).json({ ok: false, error: validationError });
  }

  const startTime = Date.now();
  const { targetDur, serviceType, lang: optLang, textInput } = req.body;

  try {
    const prompt = buildPrompt({ action: 'optimize', ...req.body });

    const data = await callAnthropic(apiKey, [{ role: 'user', content: prompt }]);
    const text = data.content[0].text.trim();

    const targetWords = targetDur ? calcWords(parseInt(targetDur), optLang || 'pl', serviceType) : null;
    const actualWords = countSpeakableWords(text);
    if (targetWords) console.log(`[kreator] Optimized: ${actualWords}/${targetWords} words`);

    logKreator({
      action: 'optimize', lang: optLang || 'pl', serviceType, duration: targetDur,
      inputText: textInput,
      generatedText: text, wordCount: actualWords, targetWords,
      responseTimeMs: Date.now() - startTime, ok: true,
      tokensIn: data.usage && data.usage.input_tokens,
      tokensOut: data.usage && data.usage.output_tokens,
      ip: req.ip
    });

    res.json({ ok: true, text, usage: data.usage });
  } catch (err) {
    console.error('[kreator] Optimize error:', err);
    logKreator({
      action: 'optimize', lang: optLang || 'pl', serviceType, duration: targetDur,
      inputText: textInput,
      responseTimeMs: Date.now() - startTime, ok: false, error: String(err.message || err),
      ip: req.ip
    });
    res.status(500).json({ ok: false, error: 'Wystąpił błąd. Spróbuj ponownie.' });
  }
});

module.exports = router;
