const express = require('express');
const app = express();
app.use(express.json());

/** --------------------------------------------------------------------
 *  In‑memory sliding‑window rate limiter
 *  - max 2 requests per user per 60 000 ms (1 min) window
 *  - automatically resets counters after the window expires
 *  - periodic cleanup removes stale entries
 * ------------------------------------------------------------------- */
const rateLimiter = (() => {
    const MAX_REQUESTS = 2;
    const WINDOW_MS = 60_000; // 1 minute
    // Map<userId, { count: number, resetAt: number }>
    const store = new Map();

    return {
        /** Returns true if the request is allowed, false otherwise. */
        isAllowed(userId) {
            const now = Date.now();
            const entry = store.get(userId);

            if (!entry || now > entry.resetAt) {
                // First request for this user or window has expired → start fresh
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

        /** Remove entries whose windows have passed – prevents unbounded growth. */
        cleanup() {
            const now = Date.now();
            for (const [key, { resetAt }] of store.entries()) {
                if (now > resetAt) store.delete(key);
            }
        },
    };
})();

// Run cleanup every 5 minutes
setInterval(() => rateLimiter.cleanup(), 5 * 60 * 1000);

async function someAsyncProcessing(prompt) {
    // Simulate async work (replace with real processing as needed)
    return prompt;
}

app.post('/api/ai-completion', async (req, res) => {
    const userId = req.headers['x-user-id'] || 'anonymous';
    const { prompt } = req.body;

    if (!prompt) {
        return res.status(400).json({ error: "Prompt is required" });
    }

    // ---------- Rate‑limit check ----------
    if (!rateLimiter.isAllowed(userId)) {
        // IMPORTANT: `return` stops further execution and prevents double‑send
        return res.status(429).json({ error: "Rate limit exceeded" });
    }

    // ---------- Normal processing ----------
    try {
        const result = await someAsyncProcessing(prompt);
        return res.status(200).json({ response: `Processed: ${result}` });
    } catch (err) {
        console.error('Processing error:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = app;