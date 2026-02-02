const express = require('express');
const router = express.Router();
const { buildPrompt } = require('../lib/prompts');

router.post('/generate', async (req, res) => {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ ok: false, error: 'Brak konfiguracji API' });
  }

  try {
    const prompt = buildPrompt({ action: 'generate', ...req.body });

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2048,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    const data = await response.json();

    if (!response.ok || !data.content || !data.content[0]) {
      console.error('[kreator] API error:', data);
      return res.status(502).json({ ok: false, error: 'Błąd generowania tekstu. Spróbuj ponownie.' });
    }

    res.json({
      ok: true,
      text: data.content[0].text,
      usage: data.usage
    });
  } catch (err) {
    console.error('[kreator] Error:', err);
    res.status(500).json({ ok: false, error: 'Wystąpił błąd. Spróbuj ponownie.' });
  }
});

router.post('/optimize', async (req, res) => {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ ok: false, error: 'Brak konfiguracji API' });
  }

  try {
    const prompt = buildPrompt({ action: 'optimize', ...req.body });

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2048,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    const data = await response.json();

    if (!response.ok || !data.content || !data.content[0]) {
      console.error('[kreator] Optimize API error:', data);
      return res.status(502).json({ ok: false, error: 'Błąd optymalizacji tekstu.' });
    }

    res.json({
      ok: true,
      text: data.content[0].text,
      usage: data.usage
    });
  } catch (err) {
    console.error('[kreator] Optimize error:', err);
    res.status(500).json({ ok: false, error: 'Wystąpił błąd. Spróbuj ponownie.' });
  }
});

module.exports = router;
