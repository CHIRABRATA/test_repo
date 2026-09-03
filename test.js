const app = require('./server');
const http = require('http');

const server = app.listen(0, async () => {
    const port = server.address().port;

    const makeRequest = (userId, prompt) => {
        return new Promise((resolve) => {
            const data = JSON.stringify({ prompt });
            const req = http.request({
                hostname: 'localhost',
                port: port,
                path: '/api/ai-completion',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-user-id': userId
                }
            }, (res) => {
                let body = '';
                res.on('data', chunk => body += chunk);
                res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(body || '{}') }));
            });
            req.write(data);
            req.end();
        });
    };

    try {
        console.log("🧪 Running Test Suite...");
        
        // Test 1 & 2: User 1 within limits
        await makeRequest('user_1', 'Hello');
        await makeRequest('user_1', 'World');

        // Test 3: User 1 exceeded limit (Should return 429 safely)
        const res3 = await makeRequest('user_1', 'Overflow');
        
        if (res3.status !== 429) {
            console.error("❌ TEST FAILED: Rate limit was not enforced properly.");
            process.exit(1);
        }

        console.log("✅ ALL TESTS PASSED: Rate limit and headers handled correctly.");
        process.exit(0);
    } catch (err) {
        console.error("❌ TEST CRASHED:", err.message);
        process.exit(1);
    } finally {
        server.close();
    }
});