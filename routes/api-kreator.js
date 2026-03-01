const express = require('express');
const router = express.Router();
const { buildPrompt, calcWords } = require('../lib/prompts');
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

// Walidacja pól wejściowych — max długość per pole i łączna
const FIELD_LIMITS = {
  company: 200,
  offering: 500,
  serviceType: 30,
  industry: 30,
  audience: 10,
  tone: 20,
  goal: 20,
  duration: 10,
  textInput: 3000,  // optimize: tekst do optymalizacji
  targetDur: 10
};
const MAX_TOTAL_INPUT = 5000; // max łączna długość wszystkich pól

const SKIP_FIELDS = new Set(['turnstileToken']);

function validateInput(body) {
  let totalLen = 0;
  for (const [key, val] of Object.entries(body)) {
    if (SKIP_FIELDS.has(key)) continue;
    if (typeof val === 'string') {
      const limit = FIELD_LIMITS[key] || 500;
      if (val.length > limit) {
        return `Pole "${key}" jest za długie (max ${limit} znaków).`;
      }
      totalLen += val.length;
    }
    if (Array.isArray(val)) {
      if (val.length > 10) return 'Za dużo elementów w liście.';
      val.forEach(v => { if (typeof v === 'string') totalLen += v.length; });
    }
  }
  if (totalLen > MAX_TOTAL_INPUT) {
    return `Łączna długość danych przekracza limit (max ${MAX_TOTAL_INPUT} znaków).`;
  }
  return null;
}

// Obie ścieżki: rate limit → Turnstile → walidacja → handler
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

    // First attempt
    let data = await callAnthropic(apiKey, [{ role: 'user', content: prompt }]);
    let text = data.content[0].text.trim();
    let totalUsage = data.usage;

    // Word count validation — retry ONCE if text is too short or too long
    const { serviceType, duration } = req.body;
    if (duration && serviceType !== 'ivr') {
      const targetWords = calcWords(parseInt(duration), 'pl', serviceType);
      const actualWords = text.split(/\s+/).length;
      const deviation = Math.abs(actualWords - targetWords) / targetWords;

      if (deviation > 0.15) {
        const diff = targetWords - actualWords;
        const direction = diff > 0 ? 'za krótki' : 'za długi';
        const correction = diff > 0
          ? `Tekst jest ${direction} o ${Math.abs(diff)} słów. Rozbuduj go, dodając więcej szczegółów i treści, aby osiągnąć dokładnie ${targetWords} słów.`
          : `Tekst jest ${direction} o ${Math.abs(diff)} słów. Skróć go, usuwając zbędne fragmenty, aby osiągnąć dokładnie ${targetWords} słów.`;

        console.log(`[kreator] Word count retry: ${actualWords}/${targetWords} words (${Math.round(deviation*100)}% off)`);

        const retryData = await callAnthropic(apiKey, [
          { role: 'user', content: prompt },
          { role: 'assistant', content: text },
          { role: 'user', content: `${correction} Zwróć TYLKO poprawiony tekst, bez komentarzy. Tekst MUSI mieć ${targetWords} słów (±3 słowa).` }
        ]);
        text = retryData.content[0].text.trim();
        totalUsage = {
          input_tokens: (totalUsage.input_tokens || 0) + (retryData.usage.input_tokens || 0),
          output_tokens: (totalUsage.output_tokens || 0) + (retryData.usage.output_tokens || 0)
        };
        console.log(`[kreator] After retry: ${text.split(/\s+/).length}/${targetWords} words`);
      }
    }

    res.json({
      ok: true,
      text,
      usage: totalUsage
    });
  } catch (err) {
    console.error('[kreator] Error:', err);
    res.status(500).json({ ok: false, error: 'Wystąpił błąd. Spróbuj ponownie.' });
  }
});

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

    // First attempt
    let data = await callAnthropic(apiKey, [{ role: 'user', content: prompt }]);
    let text = data.content[0].text.trim();
    let totalUsage = data.usage;

    // Word count validation for optimize too — max 1 retry
    const { targetDur, serviceType } = req.body;
    if (targetDur) {
      const targetWords = calcWords(parseInt(targetDur), 'pl', serviceType);
      const actualWords = text.split(/\s+/).length;
      const deviation = Math.abs(actualWords - targetWords) / targetWords;

      if (deviation > 0.15) {
        const diff = targetWords - actualWords;
        const direction = diff > 0 ? 'za krótki' : 'za długi';
        const correction = diff > 0
          ? `Tekst jest ${direction} o ${Math.abs(diff)} słów. Rozbuduj go aby osiągnąć dokładnie ${targetWords} słów.`
          : `Tekst jest ${direction} o ${Math.abs(diff)} słów. Skróć go aby osiągnąć dokładnie ${targetWords} słów.`;

        console.log(`[kreator] Optimize word count retry: ${actualWords}/${targetWords} words`);

        const retryData = await callAnthropic(apiKey, [
          { role: 'user', content: prompt },
          { role: 'assistant', content: text },
          { role: 'user', content: `${correction} Zachowaj jak najwięcej oryginalnych słów. Zwróć TYLKO tekst, bez komentarzy.` }
        ]);
        text = retryData.content[0].text.trim();
        totalUsage = {
          input_tokens: (totalUsage.input_tokens || 0) + (retryData.usage.input_tokens || 0),
          output_tokens: (totalUsage.output_tokens || 0) + (retryData.usage.output_tokens || 0)
        };
      }
    }

    res.json({
      ok: true,
      text,
      usage: totalUsage
    });
  } catch (err) {
    console.error('[kreator] Optimize error:', err);
    res.status(500).json({ ok: false, error: 'Wystąpił błąd. Spróbuj ponownie.' });
  }
});

module.exports = router;
