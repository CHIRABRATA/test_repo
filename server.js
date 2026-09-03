const express = require('express');
const app = express();
app.use(express.json());

const RATE_LIMIT = 2;               // max requests per window
const WINDOW_MS = 60 * 1000;        // 1 minute sliding window

// Per‑user request timestamps
const requestLog = new Map();

/**
 * Returns true if the user has exceeded the rate limit.
 * Also cleans up old timestamps to keep the map bounded.
 */
function isRateLimited(userId) {
  const now = Date.now();

  // Get or create the timestamps array for this user
  let timestamps = requestLog.get(userId);
  if (!timestamps) {
    timestamps = [];
    requestLog.set(userId, timestamps);
  }

  // Remove timestamps that are older than the window
  while (timestamps.length && now - timestamps[0] > WINDOW_MS) {
    timestamps.shift();
  }

  // After cleanup, check the count
  if (timestamps.length >= RATE_LIMIT) {
    return true;
  }

  // Record the current request
  timestamps.push(now);
  return false;
}

// Placeholder for actual processing logic
async function someProcessingFunction(prompt) {
  // Simulate async work (e.g., calling an AI model)
  return prompt;
}

// ------- Request handler -------
app.post('/api/ai-completion', async (req, res) => {
  const userId = req.headers['x-user-id'] || 'anonymous';
  const { prompt } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: "Prompt is required" });
  }

  // ---- Rate‑limit check ----
  if (isRateLimited(userId)) {
    // Send 429 and stop further processing
    return res
      .status(429)
      .json({ error: "Rate limit exceeded. Please try again later." });
  }

  // ---- Normal processing ----
  try {
    const result = await someProcessingFunction(prompt);
    return res
      .status(200)
      .json({ response: `Processed: ${result}` });
  } catch (err) {
    console.error('Processing error:', err);
    return res
      .status(500)
      .json({ error: 'Internal server error' });
  }
});

module.exports = app;