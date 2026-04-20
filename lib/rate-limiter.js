/**
 * In-memory rate limiter - zero dependencies.
 * Sliding-window counter per IP.
 */

class RateLimiter {
  /**
   * @param {Object} opts
   * @param {number} opts.windowMs   - okno czasowe w ms (default 60 000 = 1 min)
   * @param {number} opts.max        - max requestów w oknie (default 5)
   * @param {string} opts.message    - komunikat przy przekroczeniu limitu
   */
  constructor(opts = {}) {
    this.windowMs = opts.windowMs || 60000;
    this.max = opts.max || 5;
    this.message = opts.message || 'Zbyt wiele żądań. Spróbuj ponownie za chwilę.';
    this.hits = new Map(); // IP → [timestamps]

    // Cleanup co 5 minut
    setInterval(() => this._cleanup(), 5 * 60 * 1000).unref();
  }

  middleware() {
    const self = this;
    return function rateLimitMiddleware(req, res, next) {
      const ip = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;
      const now = Date.now();
      const windowStart = now - self.windowMs;

      let timestamps = self.hits.get(ip) || [];
      // Odfiltruj stare wpisy
      timestamps = timestamps.filter(t => t > windowStart);
      timestamps.push(now);
      self.hits.set(ip, timestamps);

      const remaining = Math.max(0, self.max - timestamps.length);
      res.setHeader('X-RateLimit-Limit', self.max);
      res.setHeader('X-RateLimit-Remaining', remaining);

      if (timestamps.length > self.max) {
        const retryAfter = Math.ceil(self.windowMs / 1000);
        res.setHeader('Retry-After', retryAfter);
        console.log(`[rate-limit] Blocked IP ${ip} - ${timestamps.length}/${self.max} requests`);
        return res.status(429).json({ ok: false, error: self.message });
      }

      next();
    };
  }

  _cleanup() {
    const cutoff = Date.now() - this.windowMs;
    for (const [ip, timestamps] of this.hits.entries()) {
      const valid = timestamps.filter(t => t > cutoff);
      if (valid.length === 0) {
        this.hits.delete(ip);
      } else {
        this.hits.set(ip, valid);
      }
    }
  }
}

module.exports = RateLimiter;
