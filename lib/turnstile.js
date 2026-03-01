/**
 * Cloudflare Turnstile — server-side token verification.
 * https://developers.cloudflare.com/turnstile/get-started/server-side-validation/
 */

const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

/**
 * Express middleware — wymaga pola `turnstileToken` w body requesta.
 * Jeśli brak TURNSTILE_SECRET w env, przepuszcza (dev mode).
 */
function verifyTurnstile(req, res, next) {
  const secret = process.env.TURNSTILE_SECRET;

  // Dev mode — brak klucza = brak weryfikacji
  if (!secret) {
    return next();
  }

  const token = req.body && req.body.turnstileToken;
  if (!token) {
    console.log('[turnstile] Missing token from', req.ip);
    return res.status(403).json({ ok: false, error: 'Weryfikacja antyspamowa nie powiodła się. Odśwież stronę i spróbuj ponownie.' });
  }

  const ip = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;

  fetch(TURNSTILE_VERIFY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      secret: secret,
      response: token,
      remoteip: ip
    })
  })
  .then(function(r) { return r.json(); })
  .then(function(result) {
    if (result.success) {
      next();
    } else {
      console.log('[turnstile] Verification failed:', result['error-codes'], 'IP:', ip);
      res.status(403).json({ ok: false, error: 'Weryfikacja antyspamowa nie powiodła się. Spróbuj ponownie.' });
    }
  })
  .catch(function(err) {
    console.error('[turnstile] API error:', err.message);
    // Fail open — jeśli Cloudflare API nie odpowiada, przepuszczamy
    // (lepsze UX niż blokowanie użytkowników)
    next();
  });
}

module.exports = { verifyTurnstile };
