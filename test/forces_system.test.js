import assert from 'node:assert';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import app from '../server/server.js';
import { calculateForcesRisk, HARDSHIP_ZONES } from '../server/forcesEngine.js';

const TEST_PORT = 3905;
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
        } catch (e) {
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
    console.log(`[Forces Test Suite] Testing Problem Statement ID 26186 on port ${TEST_PORT}...`);

    // =========================================================================
    // Pillar 1: Predictive Multi-Factor Stress & Burnout Engine Unit Tests
    // =========================================================================
    console.log('\n--- 1. Testing AI Predictive Behavioral Analytics Engine ---');
    
    // High Hardship CoBRA Sukma Case
    const cobraCase = calculateForcesRisk({
      deploymentZone: 'ZONE_LWE',
      deploymentDurationMonths: 20,
      daysSinceLastLeave: 225,
      leaveRejectionCount: 2,
      dutyShiftHours: 14.0,
      consecutiveNightDuties: 6,
      outpostIsolationScore: 5,
      voluntaryBiometrics: { hrvRmssd: 19, restingHeartRate: 88, sleepHours: 4.2 },
      latestAssessment: { pss10Score: 31, operationalFatigue: 9, mood: 'exhausted', familyContact: 'rarely' }
    });

    assert.ok(cobraCase.compositeStrainScore >= 80, 'CoBRA case should produce Critical Strain Score >= 80');
    assert.strictEqual(cobraCase.riskTier, 'Critical', 'CoBRA case tier should be Critical');
    assert.ok(cobraCase.burnoutProbability > 75, 'Burnout probability should be > 75%');
    assert.ok(cobraCase.alertTrigger, 'Should trigger automated welfare alert');
    assert.ok(cobraCase.riskDrivers.some(d => d.includes('Sukma') || d.includes('LWE')), 'Should identify LWE hardship theater driver');
    assert.ok(cobraCase.recommendedInterventions.some(i => i.type === 'COMPASSIONATE_LEAVE'), 'Should recommend compassionate leave');
    console.log(`✓ CoBRA Sukma Risk Prediction verified (Score: ${cobraCase.compositeStrainScore}/100, Tier: ${cobraCase.riskTier}, Interventions: ${cobraCase.recommendedInterventions.length})`);

    // Peace Garrison Baseline Case
    const peaceCase = calculateForcesRisk({
      deploymentZone: 'ZONE_PEACE_STATIC',
      deploymentDurationMonths: 6,
      daysSinceLastLeave: 30,
      leaveRejectionCount: 0,
      dutyShiftHours: 8.0,
      consecutiveNightDuties: 0,
      outpostIsolationScore: 1,
      voluntaryBiometrics: { hrvRmssd: 54, restingHeartRate: 64, sleepHours: 8.0 },
      latestAssessment: { pss10Score: 8, operationalFatigue: 2, mood: 'calm', familyContact: 'daily' }
    });

    assert.ok(peaceCase.compositeStrainScore <= 35, 'Peace garrison case should be Low Strain');
    assert.strictEqual(peaceCase.riskTier, 'Low', 'Peace garrison should be Low risk tier');
    assert.ok(peaceCase.operationalReadinessIndex >= 85, 'Readiness should be high in peace station');
    assert.strictEqual(peaceCase.alertTrigger, false, 'Peace garrison should NOT trigger emergency alert');
    console.log(`✓ Peace Garrison Baseline verified (Score: ${peaceCase.compositeStrainScore}/100, Readiness: ${peaceCase.operationalReadinessIndex}%)`);

    // Edge case & HRMS parameter validation:
    // Case A: 185 days without leave with 1 rejection (Target of the prior TDZ ReferenceError)
    const tdzBoundaryCase = calculateForcesRisk({
      deploymentZone: 'ZONE_HIGH_ALTITUDE',
      deploymentDurationMonths: 22,
      daysSinceLastLeave: 185,
      leaveRejectionCount: 1,
      dutyShiftHours: 12.0,
      consecutiveNightDuties: 5,
      outpostIsolationScore: 4,
      transferCount: 3,
      trainingCommitment: 'High Altitude Warfare Induction',
      workloadTrend: 'increasing',
      voluntaryBiometrics: { hrvRmssd: 25, restingHeartRate: 81, sleepHours: 5.0 },
      latestAssessment: { pss10Score: 24, operationalFatigue: 7, mood: 'anxious', familyContact: 'rarely' }
    });
    assert.ok(tdzBoundaryCase.compositeStrainScore > 70, '185-day leave backlog case must calculate strain > 70');
    assert.ok(tdzBoundaryCase.riskDrivers.some(d => d.includes('Severe family separation') || d.includes('185 days')), 'Must detect leave separation');
    console.log(`✓ TDZ Boundary & Srinagar Profile verified (Score: ${tdzBoundaryCase.compositeStrainScore}/100, Tier: ${tdzBoundaryCase.riskTier})`);

    // Case B: HRMS Signal Sensitivity (Transfer Turbulence, Training Load, Workload Trend)
    const baselineHRMS = calculateForcesRisk({
      deploymentZone: 'ZONE_PEACE_STATIC',
      deploymentDurationMonths: 12,
      daysSinceLastLeave: 90,
      leaveRejectionCount: 0,
      dutyShiftHours: 8.0,
      consecutiveNightDuties: 0,
      outpostIsolationScore: 2,
      transferCount: 0,
      trainingCommitment: '',
      workloadTrend: 'stable',
      voluntaryBiometrics: { hrvRmssd: 35, restingHeartRate: 72, sleepHours: 6.5 },
      latestAssessment: { pss10Score: 16, operationalFatigue: 5, mood: 'neutral', familyContact: 'regular' }
    });
    const stressedHRMS = calculateForcesRisk({
      deploymentZone: 'ZONE_PEACE_STATIC',
      deploymentDurationMonths: 12,
      daysSinceLastLeave: 90,
      leaveRejectionCount: 0,
      dutyShiftHours: 8.0,
      consecutiveNightDuties: 0,
      outpostIsolationScore: 2,
      transferCount: 4, // +12 pts
      trainingCommitment: 'Pre-Induction Commando Course', // +10 pts
      workloadTrend: 'increasing', // +8 pts
      voluntaryBiometrics: { hrvRmssd: 35, restingHeartRate: 72, sleepHours: 6.5 },
      latestAssessment: { pss10Score: 16, operationalFatigue: 5, mood: 'neutral', familyContact: 'regular' }
    });
    assert.ok(stressedHRMS.compositeStrainScore >= baselineHRMS.compositeStrainScore + 25, 'Turbulence, training, and increasing workload must raise strain score by >=25 pts');
    assert.ok(stressedHRMS.riskDrivers.some(d => d.includes('transfer turbulence')), 'Must detect transfer turbulence driver');
    assert.ok(stressedHRMS.riskDrivers.some(d => d.includes('Intense training commitment')), 'Must detect intense training driver');
    assert.ok(stressedHRMS.riskDrivers.some(d => d.includes('Accelerating workload trajectory')), 'Must detect workload trend driver');
    console.log(`✓ HRMS Parameters (Transfers, Training, Workload) Sensitivity verified (Baseline: ${baselineHRMS.compositeStrainScore}, Stressed: ${stressedHRMS.compositeStrainScore}, Delta: +${stressedHRMS.compositeStrainScore - baselineHRMS.compositeStrainScore} pts)`);

    // Case C: Zero & Empty Boundary Inputs (No NaN or crash)
    const zeroCase = calculateForcesRisk({
      deploymentZone: 'ZONE_PEACE_STATIC',
      deploymentDurationMonths: 0,
      daysSinceLastLeave: 0,
      leaveRejectionCount: 0,
      dutyShiftHours: 0,
      consecutiveNightDuties: 0,
      outpostIsolationScore: 0,
      transferCount: 0,
      trainingCommitment: '',
      workloadTrend: '',
      voluntaryBiometrics: { hrvRmssd: 0, restingHeartRate: 0, sleepHours: 0 },
      latestAssessment: { pss10Score: 0, operationalFatigue: 0, mood: '', familyContact: '' }
    });
    assert.ok(!isNaN(zeroCase.compositeStrainScore), 'Composite strain must not be NaN with 0 inputs');
    assert.ok(!isNaN(zeroCase.operationalReadinessIndex), 'Operational readiness must not be NaN with 0 inputs');
    assert.ok(!isNaN(zeroCase.burnoutProbability), 'Burnout probability must not be NaN with 0 inputs');
    console.log(`✓ Zero/Null Input Boundary Resilience verified (Strain: ${zeroCase.compositeStrainScore}, Readiness: ${zeroCase.operationalReadinessIndex}%)`);

    // =========================================================================
    // Pillar 2: Battalion & Company Aggregated Dashboard API
    // =========================================================================
    console.log('\n--- 2. Testing Personnel Wellness Monitoring Dashboard API ---');
    const dashRes = await request('GET', '/api/forces/dashboard?role=commander');
    assert.strictEqual(dashRes.status, 200, 'Dashboard GET should return 200');
    assert.ok(dashRes.body.success, 'Dashboard response should succeed');
    assert.ok(dashRes.body.metrics.totalPersonnel >= 10, 'Should aggregate at least 10 personnel');
    assert.ok(dashRes.body.metrics.companyBreakdown.length >= 2, 'Should aggregate multiple companies');
    assert.ok(dashRes.body.metrics.privacyGuarantee.status === 'Active', 'Differential Privacy guarantee should be active');
    console.log(`✓ Dashboard Aggregates verified (Total: ${dashRes.body.metrics.totalPersonnel}, Avg Strain: ${dashRes.body.metrics.averageStrain}, Readiness: ${dashRes.body.metrics.operationalReadiness}%)`);

    // =========================================================================
    // Pillar 3: Role-Based Access Control (RBAC) & Privacy Anonymization
    // =========================================================================
    console.log('\n--- 3. Testing RBAC & Privacy Anonymization Framework ---');
    
    // Commander Role: Must receive anonymized tokens, no real names, no raw health journals
    const cmdRes = await request('GET', '/api/forces/personnel?role=commander');
    assert.strictEqual(cmdRes.status, 200, 'Commander personnel list should return 200');
    const cmdPersonnel = cmdRes.body.personnel[0];
    assert.ok(cmdPersonnel.name.includes('[Anonymized Jawan'), 'Commander must not see real names');
    assert.strictEqual(cmdPersonnel.serviceNumber, 'CRPF-REDACTED-***', 'Commander must not see raw service numbers');
    assert.ok(cmdPersonnel.anonymizedToken.startsWith('J-'), 'Commander should see anonymized token');
    assert.ok(cmdPersonnel.voluntaryBiometrics.status.includes('Differential Privacy'), 'Commander must not see private biometrics');
    console.log(`✓ Commander Privacy Shield verified (Token: ${cmdPersonnel.anonymizedToken}, Name: ${cmdPersonnel.name})`);

    // Welfare Officer Role: Gets identifiable clinical triage details
    const woRes = await request('GET', '/api/forces/personnel?role=welfare_officer');
    assert.strictEqual(woRes.status, 200, 'Welfare officer personnel list should return 200');
    const woPersonnel = woRes.body.personnel[0];
    assert.ok(!woPersonnel.name.includes('[Anonymized'), 'Welfare Officer should see real personnel name for clinical care');
    assert.ok(woPersonnel.serviceNumber.startsWith('CRPF-'), 'Welfare Officer should see service number');
    console.log(`✓ Welfare Officer Clinical Access verified (Name: ${woPersonnel.name}, Service No: ${woPersonnel.serviceNumber})`);

    // Personnel Role: Isolation test - cannot view other jawans' records
    const jawanRes = await request('GET', '/api/forces/personnel?role=personnel&personnelId=CRPF-204-001');
    assert.strictEqual(jawanRes.status, 200, 'Jawan requesting own record should return 200');
    assert.strictEqual(jawanRes.body.count, 1, 'Jawan should receive exactly their own record');
    assert.strictEqual(jawanRes.body.personnel[0].id, 'CRPF-204-001', 'Must match requested jawan ID');

    // Jawan Role without personnelId: Must return empty to prevent peer surveillance
    const jawanAllRes = await request('GET', '/api/forces/personnel?role=personnel');
    assert.strictEqual(jawanAllRes.status, 200, 'Jawan requesting all personnel should return 200');
    assert.strictEqual(jawanAllRes.body.count, 0, 'Jawan must NOT be permitted to see peers roster (Zero Lateral Snooping)');
    console.log('✓ Jawan Lateral Privacy Protection verified (No peer snooping permitted)');

    // =========================================================================
    // Pillar 4: Mobile-Based Wellness Self-Assessment API
    // =========================================================================
    console.log('\n--- 4. Testing Mobile Self-Assessment Application Endpoint ---');
    const assessRes = await request('POST', '/api/forces/assessments', {
      personnelId: 'CRPF-204-001',
      pss10Score: 32,
      operationalFatigue: 9,
      sleepHours: 3.5,
      mood: 'distressed',
      familyContact: 'rarely',
      dutyStrainNotes: 'Jungle patrol in heavy rain, extreme back pain, could not sleep due to high alert.',
      role: 'personnel'
    });

    assert.strictEqual(assessRes.status, 200, 'Assessment submission should return 200');
    assert.ok(assessRes.body.success, 'Assessment submission should succeed');
    assert.strictEqual(assessRes.body.calculatedRisk.riskTier, 'Critical', 'Should escalate risk tier to Critical');
    assert.ok(assessRes.body.calculatedRisk.alertTrigger, 'Should trigger automated welfare alert');
    console.log(`✓ Field Mobile Assessment verified (New Strain: ${assessRes.body.calculatedRisk.compositeStrainScore}/100, Alert Triggered: ${assessRes.body.calculatedRisk.alertTrigger})`);

    // =========================================================================
    // Pillar 5: Automated Alerts for Authorized Welfare Personnel
    // =========================================================================
    console.log('\n--- 5. Testing Automated Welfare Alerts & Triage ---');
    const alertsRes = await request('GET', '/api/forces/alerts?role=welfare_officer');
    assert.strictEqual(alertsRes.status, 200, 'Alerts GET should return 200');
    assert.ok(alertsRes.body.count > 0, 'Should return active welfare alerts');
    const testAlert = alertsRes.body.alerts[0];
    console.log(`✓ Automated Alert detected (${testAlert.severity} - ${testAlert.category}: ${testAlert.message})`);

    // Acknowledge alert
    const ackRes = await request('POST', `/api/forces/alerts/${testAlert.id}/ack`, { role: 'welfare_officer' });
    assert.strictEqual(ackRes.status, 200, 'Acknowledge alert should return 200');
    assert.ok(ackRes.body.success, 'Acknowledge should be successful');
    console.log(`✓ Alert Acknowledgment verified for Alert ID: ${testAlert.id}`);

    // =========================================================================
    // Pillar 6: Welfare Intervention Recommendation System
    // =========================================================================
    console.log('\n--- 6. Testing Welfare Intervention Recommendation System ---');
    const intvRes = await request('GET', '/api/forces/interventions?role=welfare_officer');
    assert.strictEqual(intvRes.status, 200, 'Interventions GET should return 200');
    assert.ok(intvRes.body.count > 0, 'Should have proactive welfare interventions');
    console.log(`✓ Recommended Interventions verified (${intvRes.body.count} active interventions available)`);

    // Create a new intervention
    const newIntvRes = await request('POST', '/api/forces/interventions', {
      personnelId: 'CRPF-204-001',
      type: 'MANDATORY_RR_CYCLE',
      title: 'Mandatory 48-Hour Rest & Recuperation (R&R) in Garrison',
      description: 'Ordered 48h rest relief for Ct. Rajesh Kumar Singh to restore autonomic tone.',
      urgency: 'Critical',
      assignedTo: 'Unit Medical Officer / Welfare Subedar',
      role: 'welfare_officer'
    });
    assert.strictEqual(newIntvRes.status, 200, 'Create intervention should return 200');
    assert.ok(newIntvRes.body.intervention.id, 'Intervention should have ID');
    console.log(`✓ Proactive Welfare Intervention Created: ${newIntvRes.body.intervention.title}`);

    // =========================================================================
    // Pillar 7: SIH Judge Demo Theater Simulator
    // =========================================================================
    console.log('\n--- 7. Testing 1-Click SIH Judge Theater Switcher ---');
    const simCobra = await request('POST', '/api/forces/simulate', { scenario: 'sukma_cobra_crisis' });
    assert.strictEqual(simCobra.status, 200, 'CoBRA simulation should return 200');
    assert.strictEqual(simCobra.body.computedRisk.riskTier, 'Critical', 'CoBRA scenario should compute Critical Tier');

    const simPeace = await request('POST', '/api/forces/simulate', { scenario: 'peace_station_delhi' });
    assert.strictEqual(simPeace.status, 200, 'Peace simulation should return 200');
    assert.strictEqual(simPeace.body.computedRisk.riskTier, 'Low', 'Peace scenario should compute Low Tier');

    const simSrinagar = await request('POST', '/api/forces/simulate', { scenario: 'srinagar_ci_ops' });
    assert.strictEqual(simSrinagar.status, 200, 'Srinagar simulation should return 200');
    assert.ok(simSrinagar.body.computedRisk.compositeStrainScore >= 60, 'Srinagar CI ops should compute Elevated/Critical strain');

    const simRaf = await request('POST', '/api/forces/simulate', { scenario: 'raf_riot_order' });
    assert.strictEqual(simRaf.status, 200, 'RAF simulation should return 200');
    assert.ok(simRaf.body.computedRisk.compositeStrainScore >= 50, 'RAF riot order should compute Elevated strain');
    console.log('✓ All 4 SIH Judge Scenarios (Sukma CoBRA, Srinagar CI Ops, RAF Riot, Peace Station) verified');

    // =========================================================================
    // Pillar 8: Anonymized HR Dataset Export & Audit Trail
    // =========================================================================
    console.log('\n--- 8. Testing Anonymized Dataset Export & Privacy Audit Log ---');
    const datasetRes = await request('GET', '/api/forces/dataset');
    assert.strictEqual(datasetRes.status, 200, 'Dataset export should return 200');
    assert.strictEqual(datasetRes.body.problemStatementId, 26186, 'Dataset should reference PS #26186');
    assert.ok(datasetRes.body.recordCount > 0, 'Dataset should contain records');

    const auditRes = await request('GET', '/api/forces/audit');
    assert.strictEqual(auditRes.status, 200, 'Audit log GET should return 200');
    assert.ok(auditRes.body.count > 0, 'Audit log should contain privacy events');
    console.log(`✓ Anonymized Dataset Export & Privacy Audit Trail verified (${auditRes.body.count} audit logs logged)`);

    // =========================================================================
    // Pillar 9: HTML Architecture & Tag Integrity Verification
    // =========================================================================
    console.log('\n--- 9. Testing HTML Architecture & Structural Integrity ---');
    const htmlPath = path.resolve('public/index.html');
    const htmlContent = fs.readFileSync(htmlPath, 'utf8');

    // Verify telemanas-crisis-banner has closing div before MHA banner
    const telemanasIdx = htmlContent.indexOf('id="telemanas-crisis-banner"');
    const startIdx = htmlContent.lastIndexOf('<div', telemanasIdx);
    const mhaBannerIdx = htmlContent.indexOf('MHA / CRPF PS #26186 TOP ANNOUNCEMENT BANNER');
    assert.ok(telemanasIdx !== -1, 'Tele-MANAS banner container must exist');
    assert.ok(mhaBannerIdx !== -1, 'MHA announcement banner comment must exist');
    
    const sliceBetween = htmlContent.slice(startIdx, mhaBannerIdx);
    const divOpenCount = (sliceBetween.match(/<div(\s|>)/g) || []).length;
    const divCloseCount = (sliceBetween.match(/<\/div>/g) || []).length;
    assert.strictEqual(divOpenCount, divCloseCount, `Tele-MANAS container must have balanced <div> tags (found ${divOpenCount} open, ${divCloseCount} close)`);

    // Verify key interactive UI controls exist
    assert.ok(htmlContent.includes('id="jawan-personnel-selector"'), 'Jawan mobile portal must contain personnel selector dropdown');
    assert.ok(htmlContent.includes('id="jawan-strain-tier"'), 'Jawan mobile portal must contain strain tier badge element');
    assert.ok(htmlContent.includes('id="forces-battalion-filter"'), 'Forces dashboard must contain battalion filter with id');
    console.log('✓ HTML DOM Integrity & Container Hierarchy verified (Balanced Tele-MANAS tags & UI Selectors verified)');

    console.log('\n================================================================');
    console.log('🎖️ ALL 8 UNIFORMED FORCES PILLARS (PS #26186) VERIFIED & PASSED!');
    console.log('================================================================\n');

    server.close();
    process.exit(0);
  } catch (err) {
    console.error('Forces Test Suite Failed:', err);
    server.close();
    process.exit(1);
  }
});
