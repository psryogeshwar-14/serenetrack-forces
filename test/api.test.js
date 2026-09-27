import assert from 'node:assert';
import app from '../server/server.js';
import http from 'node:http';

const server = http.createServer(app);
const TEST_PORT = 3899;

function request(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const dataString = body ? JSON.stringify(body) : '';
    const req = http.request({
      hostname: '127.0.0.1',
      port: TEST_PORT,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(dataString)
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch(e) {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });

    req.on('error', reject);
    if (dataString) req.write(dataString);
    req.end();
  });
}

server.listen(TEST_PORT, async () => {
  try {
    console.log(`[Test] Running API verification suite on port ${TEST_PORT}...`);

    // 1. Health Check
    const health = await request('GET', '/api/health');
    assert.strictEqual(health.status, 200, 'Health check should return 200');
    assert.strictEqual(health.body.status, 'ok', 'Status should be ok');
    console.log('✓ Health check passed');

    // 2. Profile GET
    const profileRes = await request('GET', '/api/profile');
    assert.strictEqual(profileRes.status, 200, 'Profile check should return 200');
    assert.ok(profileRes.body.profile.username, 'Profile should have a username');
    console.log(`✓ Profile GET passed (Username: ${profileRes.body.profile.username})`);

    // 3. Logs GET
    const logsRes = await request('GET', '/api/logs');
    assert.strictEqual(logsRes.status, 200, 'Logs check should return 200');
    assert.ok(logsRes.body.count >= 7, 'Should have at least 7 seeded logs');
    console.log(`✓ Logs GET passed (${logsRes.body.count} logs found)`);

    // 4. Analytics GET
    const analyticsRes = await request('GET', '/api/analytics/trends');
    assert.strictEqual(analyticsRes.status, 200, 'Analytics check should return 200');
    assert.ok(analyticsRes.body.daysCount > 0, 'Analytics should calculate recent days');
    console.log(`✓ Analytics GET passed (Avg Stress: ${analyticsRes.body.averageStress}, Avg Sleep: ${analyticsRes.body.averageSleep}h)`);

    // 5. Quick Log POST
    const quickRes = await request('POST', '/api/logs/quick', { action: 'water' });
    assert.strictEqual(quickRes.status, 200, 'Quick log should return 200');
    assert.ok(quickRes.body.log.activities.waterGlasses > 0, 'Water count should increment');
    console.log(`✓ Quick log POST passed: ${quickRes.body.message}`);

    console.log('\n🎉 ALL BACKEND API TESTS PASSED SUCCESSFULLY!\n');
    server.close();
    process.exit(0);
  } catch (err) {
    console.error('Test Suite Failed:', err);
    server.close();
    process.exit(1);
  }
});
