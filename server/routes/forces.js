import express from 'express';
import {
  getDashboardMetrics,
  getPersonnelList,
  getPersonnelById,
  submitAssessment,
  getAlerts,
  acknowledgeAlert,
  getInterventions,
  createIntervention,
  updateIntervention,
  getAuditLogs,
  logAudit
} from '../forcesDb.js';
import { calculateForcesRisk, HARDSHIP_ZONES } from '../forcesEngine.js';

const router = express.Router();

/**
 * GET /api/forces/dashboard
 * Aggregated analytics for Commanders and Welfare Officers
 */
router.get('/dashboard', (req, res) => {
  try {
    const role = req.query.role || 'commander';
    const battalion = req.query.battalion || '';
    const metrics = getDashboardMetrics({ role, battalion });
    res.json({
      success: true,
      role,
      battalion: battalion || 'All Formations (Force-wide)',
      metrics
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/forces/personnel
 * Role-Based Personnel Roster
 */
router.get('/personnel', (req, res) => {
  try {
    const role = req.query.role || 'commander';
    const battalion = req.query.battalion || '';
    const company = req.query.company || '';
    const personnelId = req.query.personnelId || '';

    const list = getPersonnelList({ role, battalion, company, personnelId });
    res.json({
      success: true,
      role,
      count: list.length,
      personnel: list
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/forces/personnel/:id
 * Single Personnel Detailed Profile
 */
router.get('/personnel/:id', (req, res) => {
  try {
    const role = req.query.role || 'commander';
    const p = getPersonnelById(req.params.id, role);
    if (!p) {
      return res.status(404).json({ success: false, error: 'Personnel not found.' });
    }
    res.json({
      success: true,
      role,
      personnel: p
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/forces/assessments
 * Mobile Self-Assessment Submission
 */
router.post('/assessments', (req, res) => {
  try {
    const {
      personnelId,
      pss10Score,
      operationalFatigue,
      sleepHours,
      mood,
      familyContact,
      dutyStrainNotes,
      role = 'personnel'
    } = req.body;

    if (!personnelId) {
      return res.status(400).json({ success: false, error: 'personnelId is required.' });
    }

    const result = submitAssessment({
      personnelId,
      pss10Score,
      operationalFatigue,
      sleepHours,
      mood,
      familyContact,
      dutyStrainNotes,
      role
    });

    res.json({
      success: true,
      message: 'Assessment submitted successfully and risk profile updated.',
      ...result
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/forces/alerts
 * Automated Early Warning Alerts for Welfare Personnel
 */
router.get('/alerts', (req, res) => {
  try {
    const role = req.query.role || 'welfare_officer';
    const personnelId = req.query.personnelId || '';
    const ackParam = req.query.acknowledged;
    const acknowledged = ackParam !== undefined ? (ackParam === 'true' || ackParam === '1') : null;

    const alerts = getAlerts({ role, acknowledged, personnelId });
    res.json({
      success: true,
      role,
      count: alerts.length,
      alerts
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/forces/alerts/:id/ack
 * Acknowledge Alert
 */
router.post('/alerts/:id/ack', (req, res) => {
  try {
    const role = req.body.role || 'welfare_officer';
    const result = acknowledgeAlert(req.params.id, role);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/forces/interventions
 * Welfare Interventions Feed
 */
router.get('/interventions', (req, res) => {
  try {
    const role = req.query.role || 'welfare_officer';
    const personnelId = req.query.personnelId || '';
    const status = req.query.status || '';
    const list = getInterventions({ role, status, personnelId });
    res.json({
      success: true,
      role,
      count: list.length,
      interventions: list
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/forces/interventions
 * Create or Update Welfare Intervention
 */
router.post('/interventions', (req, res) => {
  try {
    const { id, personnelId, type, title, description, urgency, status, assignedTo, role = 'welfare_officer' } = req.body;

    if (id) {
      // Update existing
      const updated = updateIntervention({ id, status, assignedTo, role });
      return res.json(updated);
    }

    if (!personnelId || !title) {
      return res.status(400).json({ success: false, error: 'personnelId and title are required.' });
    }

    const created = createIntervention({
      personnelId,
      type: type || 'CUSTOM_WELFARE_ACTION',
      title,
      description: description || '',
      urgency: urgency || 'High',
      assignedTo: assignedTo || 'Unit Welfare Officer',
      role
    });

    res.json({
      success: true,
      intervention: created
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/forces/simulate
 * 1-Click SIH Judge Demo Theater Switcher
 */
router.post('/simulate', (req, res) => {
  try {
    const { scenario } = req.body;

    const SCENARIOS = {
      sukma_cobra_crisis: {
        id: 'SIM-COBRA',
        name: 'Sukma CoBRA Ambush Patrol (Extreme Hardship Crisis)',
        battalion: '204 CoBRA Battalion',
        location: 'Sukma / Bastar, Chhattisgarh',
        inputs: {
          deploymentZone: 'ZONE_LWE',
          deploymentDurationMonths: 20,
          daysSinceLastLeave: 220,
          leaveRejectionCount: 2,
          dutyShiftHours: 14.0,
          consecutiveNightDuties: 6,
          outpostIsolationScore: 5,
          transferCount: 3,
          trainingCommitment: 'Pre-Induction Commando Course',
          workloadTrend: 'increasing',
          voluntaryBiometrics: { hrvRmssd: 19, restingHeartRate: 88, sleepHours: 4.2 },
          latestAssessment: { pss10Score: 31, operationalFatigue: 9, mood: 'exhausted', familyContact: 'rarely' }
        }
      },
      srinagar_ci_ops: {
        id: 'SIM-KASHMIR',
        name: 'Srinagar High Altitude Sub-Zero Night Sentry',
        battalion: '110 Bn CRPF',
        location: 'Srinagar / Baramulla, J&K',
        inputs: {
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
        }
      },
      raf_riot_order: {
        id: 'SIM-RAF',
        name: 'RAF 103 Bn Sudden Riot Deployment',
        battalion: '103 RAF Battalion',
        location: 'Rapid Deployment Sector, Delhi-NCR',
        inputs: {
          deploymentZone: 'ZONE_PUBLIC_ORDER',
          deploymentDurationMonths: 11,
          daysSinceLastLeave: 90,
          leaveRejectionCount: 0,
          dutyShiftHours: 14.5,
          consecutiveNightDuties: 3,
          outpostIsolationScore: 1,
          transferCount: 2,
          trainingCommitment: 'Riot Control & Anti-Mob Tactics',
          workloadTrend: 'increasing',
          voluntaryBiometrics: { hrvRmssd: 28, restingHeartRate: 82, sleepHours: 4.8 },
          latestAssessment: { pss10Score: 21, operationalFatigue: 7, mood: 'anxious', familyContact: 'regular' }
        }
      },
      peace_station_delhi: {
        id: 'SIM-PEACE',
        name: '50 Bn CRPF Static Peace Guard (Optimal Restored State)',
        battalion: '50 Bn CRPF',
        location: 'Group Centre, New Delhi',
        inputs: {
          deploymentZone: 'ZONE_PEACE_STATIC',
          deploymentDurationMonths: 6,
          daysSinceLastLeave: 30,
          leaveRejectionCount: 0,
          dutyShiftHours: 8.0,
          consecutiveNightDuties: 0,
          outpostIsolationScore: 1,
          transferCount: 1,
          trainingCommitment: 'Standard Garrison Drill',
          workloadTrend: 'decreasing',
          voluntaryBiometrics: { hrvRmssd: 50, restingHeartRate: 65, sleepHours: 8.0 },
          latestAssessment: { pss10Score: 9, operationalFatigue: 2, mood: 'calm', familyContact: 'daily' }
        }
      }
    };

    const target = SCENARIOS[scenario] || SCENARIOS.sukma_cobra_crisis;
    const computedRisk = calculateForcesRisk(target.inputs);

    logAudit('JUDGE_SIMULATOR', 'RUN_SCENARIO', target.id, target.name);

    res.json({
      success: true,
      scenario: target.id,
      name: target.name,
      battalion: target.battalion,
      location: target.location,
      inputs: target.inputs,
      computedRisk
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/forces/audit
 * Privacy Audit Trail
 */
router.get('/audit', (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 50;
    const logs = getAuditLogs(limit);
    res.json({
      success: true,
      count: logs.length,
      logs
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/forces/dataset
 * Export Anonymized HR & Deployment Dataset as specified in SIH PS #26186
 */
router.get('/dataset', (req, res) => {
  try {
    const anonymizedList = getPersonnelList({ role: 'commander' });
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename="sih26186_anonymized_crpf_dataset.json"');
    res.json({
      problemStatementId: 26186,
      problemStatementTitle: 'AI-Based Predictive Personnel Stress and Welfare Monitoring System for Uniformed Forces',
      organization: 'Ministry of Home Affairs / CRPF Police II Division',
      exportTimestamp: new Date().toISOString(),
      privacyProtocol: 'Differential Privacy & Non-Punitive Masking (k-anonymity >= 4)',
      recordCount: anonymizedList.length,
      records: anonymizedList
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
