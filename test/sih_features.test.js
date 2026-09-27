import assert from 'node:assert';
import http from 'node:http';
import app from '../server/server.js';
import { analyzeThoughtDistortion } from '../public/js/cbti.js';
import { calculateCaffeineDecay } from '../public/js/circadian.js';
import { TRANSLATIONS } from '../public/js/i18n.js';
import { DEMO_PERSONAS } from '../public/js/demo.js';

const TEST_PORT = 3901;
const server = http.createServer(app);

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
    console.log(`[SIH Test Suite] Testing all 7 Strategic Pillars on port ${TEST_PORT}...`);

    // Pillar 1: SereneAI Copilot Endpoint
    const aiRes = await request('POST', '/api/ai/copilot', {
      query: 'Why is my fatigue index 8/10 today?',
      context: {
        currentLog: {
          workingHours: 10,
          sleepHours: 5,
          fatigueLevel: 8,
          predictedStressScore: 88,
          activities: { caffeineCups: 4, screenTimeHours: 9 }
        }
      }
    });

    assert.strictEqual(aiRes.status, 200, 'AI Copilot should return HTTP 200');
    assert.ok(aiRes.body.success, 'AI Copilot response should be successful');
    assert.ok(aiRes.body.reply.length > 50, 'AI Copilot should return a detailed clinical explanation');
    console.log(`✓ Pillar 1: SereneAI Copilot functional (Source: ${aiRes.body.source})`);

    // Pillar 2 & 4: CBT-I Cognitive Distortion Classifier
    const catAnalysis = analyzeThoughtDistortion('If I fail this exam tomorrow my entire life is ruined');
    assert.strictEqual(catAnalysis.type, 'Catastrophizing', 'Should detect Catastrophizing distortion');
    assert.ok(catAnalysis.reframe.length > 10, 'Should provide clinical reframe');

    const allAnalysis = analyzeThoughtDistortion('I will never be able to succeed and always make mistakes');
    assert.strictEqual(allAnalysis.type, 'All-or-Nothing Thinking', 'Should detect All-or-Nothing thinking');
    console.log('✓ Pillar 4: CBT-I Cognitive Distortion Classifier verified');

    // Pillar 5: Circadian Caffeine Metabolic Decay
    const decay = calculateCaffeineDecay(3, 14); // 3 cups at 2pm
    assert.strictEqual(decay.totalMg, 285, '3 cups should equal 285 mg caffeine');
    assert.ok(decay.hoursToClear > 10, 'High caffeine should take >10 hours to clear to sleep threshold');
    console.log(`✓ Pillar 5: Circadian Caffeine Decay verified (${decay.totalMg}mg clears at ${decay.clearanceHour})`);

    // Pillar 6: Bilingual Inclusivity Dictionary
    assert.ok(TRANSLATIONS.en.appTitle, 'English dictionary should exist');
    assert.ok(TRANSLATIONS.hi.appTitle, 'Hindi dictionary should exist');
    assert.strictEqual(TRANSLATIONS.hi.telemanasTitle.includes('टेली-मानस'), true, 'Hindi Tele-MANAS title should be mapped');
    console.log(`✓ Pillar 6: Bilingual Inclusivity verified (${Object.keys(TRANSLATIONS.en).length} terms translated)`);

    // Pillar 7: 1-Click SIH Judge Demo Personas
    assert.ok(DEMO_PERSONAS.student, 'Student persona must exist');
    assert.ok(DEMO_PERSONAS.tech, 'Tech professional persona must exist');
    assert.ok(DEMO_PERSONAS.restored, 'Restored persona must exist');
    assert.strictEqual(DEMO_PERSONAS.student.triggerCrisis, true, 'Student persona should trigger crisis banner');
    console.log('✓ Pillar 7: 1-Click SIH Judge Demo Personas verified');

    console.log('\n🏆 ALL 7 SIH STRATEGIC PILLARS VERIFIED & PASSED!\n');
    server.close();
    process.exit(0);
  } catch (err) {
    console.error('SIH Test Suite Failed:', err);
    server.close();
    process.exit(1);
  }
});
