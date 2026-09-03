const express = require('express');
const app = express();
app.use(express.json());

/**
 * Simple in‑memory sliding‑window rate limiter.
 * - maxRequests: maximum allowed requests per windowMs
 * - windowMs:    length of the window (e.g., 60 000 ms = 1 min)
 */
const rateLimiter = (() => {
  const MAX_REQUESTS = 2;
  const WINDOW_MS = 60_000; // 1 minute

  // userId → { count: number, resetAt: timestamp }
  const store = new Map();

  return {
    /**
     * Returns true if the request is allowed, false otherwise.
     * Also updates the internal counters.
     */
    isAllowed(userId) {
      const now = Date.now();
      const entry = store.get(userId);

      if (!entry || now > entry.resetAt) {
        // First request or window expired – start a fresh window
        store.set(userId, { count: 1, resetAt: now + WINDOW_MS });
        return true;
      }

      if (entry.count < MAX_REQUESTS) {
        entry.count += 1;
        return true;
      }

      // Over the limit
      return false;
    },

    /** Optional: cleanup stale entries to avoid memory leak */
    cleanup() {
      const now = Date.now();
      for (const [key, { resetAt }] of store.entries()) {
        if (now > resetAt) store.delete(key);
      }
    },
  };
})();

// Periodic cleanup (runs every 5 minutes)
setInterval(() => rateLimiter.cleanup(), 5 * 60 * 1000);

app.post('/api/ai-completion', async (req, res) => {
  const userId = req.headers['x-user-id'] || 'anonymous';
  const { prompt } = req.body;

  // Rate‑limit check
  if (!rateLimiter.isAllowed(userId)) {
    return res.status(429).json({ error: 'Rate limit exceeded' });
  }

  if (!prompt) {
    return res.status(400).json({ error: 'Prompt is required' });
  }

  try {
    // Simulate heavy processing; replace with real async work if needed
    const result = prompt; // placeholder for actual processing
    return res.status(200).json({ response: `Processed: ${result}` });
  } catch (err) {
    console.error('Processing error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = app;