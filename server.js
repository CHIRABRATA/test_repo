const express = require('express');
const app = express();
app.use(express.json());

// ❌ BUG 1: Global state leaks memory & rate-limit state across all users
const requestCounts = {};

// ❌ BUG 2: Synchronous block without async error boundary or cleanup
app.post('/api/ai-completion', (req, res) => {
    const userId = req.headers['x-user-id'] || 'anonymous';
    
    // Increment request count
    requestCounts[userId] = (requestCounts[userId] || 0) + 1;

    // Rate-limit check: Limit users to 2 requests
    if (requestCounts[userId] > 2) {
        // ❌ BUG 3: Returns response without halting execution or resetting headers
        res.status(429).json({ error: "Rate limit exceeded" });
    }

    // Heavy simulated payload processing
    const { prompt } = req.body;
    if (!prompt) {
        return res.status(400).json({ error: "Prompt is required" });
    }

    // Logic error: headers sent twice if rate-limited above!
    res.status(200).json({ response: `Processed: ${prompt}` });
});

module.exports = app;
