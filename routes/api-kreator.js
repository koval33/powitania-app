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

// Non-streaming call (used for optimize + word-count retry)
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

// ── Streaming generate (SSE) ────────────────────────────────────────────
router.post('/generate-stream', kreatorLimiter.middleware(), verifyTurnstile, async (req, res) => {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ ok: false, error: 'Brak konfiguracji API' });
  }

  const validationError = validateInput(req.body);
  if (validationError) {
    return res.status(400).json({ ok: false, error: validationError });
  }

  // Disable Express/Node buffering entirely
  req.socket.setNoDelay(true);

  // Set up SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',     // nginx
    'X-Content-Type-Options': 'nosniff'
  });

  // Send padding comment to force proxy buffers to flush (~2KB)
  res.write(':' + ' '.repeat(2048) + '\n\n');
  if (typeof res.flush === 'function') res.flush();

  // Helper to send SSE events (with flush)
  function sendEvent(event, data) {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    if (typeof res.flush === 'function') res.flush();
  }

  // Handle client disconnect
  let aborted = false;
  req.on('close', () => { aborted = true; });

  try {
    const params = { action: 'generate', ...req.body };
    const prompt = buildPrompt(params);

    // ── First attempt: streaming ──
    const streamResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2048,
        stream: true,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    if (!streamResponse.ok) {
      const errBody = await streamResponse.text();
      throw new Error(errBody);
    }

    // Parse SSE stream from Anthropic
    let fullText = '';
    let usage = { input_tokens: 0, output_tokens: 0 };
    const reader = streamResponse.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    // Accumulate small deltas and flush every ~80ms for efficiency
    let pendingText = '';
    let flushTimer = null;

    function flushPending() {
      if (pendingText && !aborted) {
        sendEvent('chunk', { text: pendingText });
        pendingText = '';
      }
      flushTimer = null;
    }

    while (true) {
      if (aborted) break;
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop(); // Keep incomplete line in buffer

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const jsonStr = line.slice(6).trim();
        if (jsonStr === '[DONE]') continue;

        try {
          const event = JSON.parse(jsonStr);

          if (event.type === 'content_block_delta' && event.delta?.text) {
            fullText += event.delta.text;
            pendingText += event.delta.text;

            // Flush immediately if we have a decent chunk, otherwise batch
            if (pendingText.length >= 20 || pendingText.includes('\n')) {
              if (flushTimer) { clearTimeout(flushTimer); flushTimer = null; }
              flushPending();
            } else if (!flushTimer) {
              flushTimer = setTimeout(flushPending, 80);
            }
          }

          if (event.type === 'message_delta' && event.usage) {
            usage.output_tokens = event.usage.output_tokens || 0;
          }

          if (event.type === 'message_start' && event.message?.usage) {
            usage.input_tokens = event.message.usage.input_tokens || 0;
          }
        } catch (e) {
          // Skip malformed JSON lines
        }
      }
    }

    // Flush any remaining text
    if (flushTimer) { clearTimeout(flushTimer); flushTimer = null; }
    flushPending();

    if (aborted) return;

    fullText = fullText.trim();

    // ── Word count validation — retry ONCE if needed (non-streaming) ──
    const { serviceType, duration } = req.body;
    if (duration && serviceType !== 'ivr') {
      const targetWords = calcWords(parseInt(duration), 'pl', serviceType);
      const actualWords = fullText.split(/\s+/).length;
      const deviation = Math.abs(actualWords - targetWords) / targetWords;

      if (deviation > 0.15 && !aborted) {
        const diff = targetWords - actualWords;
        const direction = diff > 0 ? 'za krótki' : 'za długi';
        const correction = diff > 0
          ? `Tekst jest ${direction} o ${Math.abs(diff)} słów. Rozbuduj go, dodając więcej szczegółów i treści, aby osiągnąć dokładnie ${targetWords} słów.`
          : `Tekst jest ${direction} o ${Math.abs(diff)} słów. Skróć go, usuwając zbędne fragmenty, aby osiągnąć dokładnie ${targetWords} słów.`;

        console.log(`[kreator] Word count retry: ${actualWords}/${targetWords} words (${Math.round(deviation*100)}% off)`);

        // Notify client that correction is happening
        sendEvent('retry', { reason: 'word_count', actual: actualWords, target: targetWords });

        const retryData = await callAnthropic(apiKey, [
          { role: 'user', content: prompt },
          { role: 'assistant', content: fullText },
          { role: 'user', content: `${correction} Zwróć TYLKO poprawiony tekst, bez komentarzy. Tekst MUSI mieć ${targetWords} słów (±3 słowa).` }
        ]);

        fullText = retryData.content[0].text.trim();
        usage = {
          input_tokens: (usage.input_tokens || 0) + (retryData.usage.input_tokens || 0),
          output_tokens: (usage.output_tokens || 0) + (retryData.usage.output_tokens || 0)
        };

        console.log(`[kreator] After retry: ${fullText.split(/\s+/).length}/${targetWords} words`);

        // Send corrected text as replacement
        sendEvent('replace', { text: fullText });
      }
    }

    // Final done event
    sendEvent('done', { text: fullText, usage });
    res.end();

  } catch (err) {
    console.error('[kreator] Stream error:', err);
    if (!aborted) {
      sendEvent('error', { error: 'Wystąpił błąd. Spróbuj ponownie.' });
      res.end();
    }
  }
});

// ── Non-streaming generate (fallback / compatibility) ───────────────────
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
