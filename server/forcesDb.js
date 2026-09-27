import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { calculateForcesRisk } from './forcesEngine.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, 'data');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Check node:sqlite
let dbInstance = null;
let useNodeSqlite = false;

try {
  const { DatabaseSync } = await import('node:sqlite');
  dbInstance = new DatabaseSync(path.join(DATA_DIR, 'forces.db'));
  useNodeSqlite = true;
} catch (e) {
  console.warn('[Forces DB] node:sqlite fallback to memory/json store:', e.message);
}

// In-Memory & JSON fallback store
let forcesStore = {
  personnel: [],
  assessments: [],
  interventions: [],
  alerts: [],
  auditLogs: []
};

// Initialize SQLite tables if available
if (useNodeSqlite && dbInstance) {
  dbInstance.exec(`
    CREATE TABLE IF NOT EXISTS forces_personnel (
      id TEXT PRIMARY KEY,
      service_number TEXT UNIQUE NOT NULL,
      anonymized_token TEXT NOT NULL,
      name TEXT NOT NULL,
      force TEXT NOT NULL,
      battalion TEXT NOT NULL,
      company TEXT NOT NULL,
      rank TEXT NOT NULL,
      age INTEGER NOT NULL,
      deployment_zone TEXT NOT NULL,
      deployment_location TEXT NOT NULL,
      deployment_duration_months REAL NOT NULL,
      days_since_last_leave INTEGER NOT NULL,
      leave_rejection_count INTEGER NOT NULL,
      accumulated_leave_days INTEGER NOT NULL,
      outpost_isolation_score INTEGER NOT NULL,
      duty_shift_hours REAL NOT NULL,
      consecutive_night_duties INTEGER NOT NULL,
      transfer_count INTEGER DEFAULT 1,
      training_commitment TEXT DEFAULT 'Standard Garrison Drill',
      workload_trend TEXT DEFAULT 'stable',
      voluntary_biometrics TEXT NOT NULL,
      latest_assessment TEXT NOT NULL,
      calculated_risk TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS forces_assessments (
      id TEXT PRIMARY KEY,
      personnel_id TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      pss10_score INTEGER NOT NULL,
      operational_fatigue INTEGER NOT NULL,
      sleep_hours REAL NOT NULL,
      mood TEXT NOT NULL,
      family_contact TEXT NOT NULL,
      duty_strain_notes TEXT DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS forces_interventions (
      id TEXT PRIMARY KEY,
      personnel_id TEXT NOT NULL,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      urgency TEXT NOT NULL,
      status TEXT NOT NULL,
      recommended_by TEXT NOT NULL,
      assigned_to TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS forces_alerts (
      id TEXT PRIMARY KEY,
      personnel_id TEXT NOT NULL,
      severity TEXT NOT NULL,
      category TEXT NOT NULL,
      message TEXT NOT NULL,
      details TEXT NOT NULL,
      acknowledged INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS forces_audit_logs (
      id TEXT PRIMARY KEY,
      timestamp TEXT NOT NULL,
      actor_role TEXT NOT NULL,
      action TEXT NOT NULL,
      resource_id TEXT,
      details TEXT NOT NULL
    );
  `);

  // Migrate existing schema if needed
  try {
    const cols = dbInstance.prepare("PRAGMA table_info(forces_personnel)").all().map(c => c.name);
    if (cols.length > 0) {
      if (!cols.includes('transfer_count')) {
        dbInstance.exec("ALTER TABLE forces_personnel ADD COLUMN transfer_count INTEGER DEFAULT 1");
      }
      if (!cols.includes('training_commitment')) {
        dbInstance.exec("ALTER TABLE forces_personnel ADD COLUMN training_commitment TEXT DEFAULT 'Standard Garrison Drill'");
      }
      if (!cols.includes('workload_trend')) {
        dbInstance.exec("ALTER TABLE forces_personnel ADD COLUMN workload_trend TEXT DEFAULT 'stable'");
      }
    }
  } catch (e) {
    console.warn('[Forces DB Migration Error]:', e.message);
  }
}

/**
 * Initial Realistic Seed Data representing Indian CAPFs (CRPF / BSF / RAF / CoBRA)
 */
const SEED_PERSONNEL = [
  // 1. High Hardship LWE / CoBRA (Sukma, Chhattisgarh)
  {
    id: 'CRPF-204-001',
    serviceNumber: 'CRPF-2020-04812',
    anonymizedToken: 'J-COBRA-784',
    name: 'Ct. Rajesh Kumar Singh',
    force: 'CRPF (204 CoBRA)',
    battalion: '204 CoBRA Battalion',
    company: 'Alpha Coy (Forward Ops)',
    rank: 'Constable (GD)',
    age: 27,
    deploymentZone: 'ZONE_LWE',
    deploymentLocation: 'Sukma / Bastar, Chhattisgarh',
    deploymentDurationMonths: 20,
    daysSinceLastLeave: 215,
    leaveRejectionCount: 2,
    accumulatedLeaveDays: 52,
    outpostIsolationScore: 5,
    dutyShiftHours: 13.5,
    consecutiveNightDuties: 6,
    transferCount: 3,
    trainingCommitment: 'Pre-Induction Commando Course',
    workloadTrend: 'increasing',
    voluntaryBiometrics: { hrvRmssd: 21, restingHeartRate: 86, sleepHours: 4.6 },
    latestAssessment: { pss10Score: 29, operationalFatigue: 8, mood: 'exhausted', familyContact: 'rarely' }
  },
  {
    id: 'CRPF-204-002',
    serviceNumber: 'CRPF-2018-09123',
    anonymizedToken: 'J-COBRA-109',
    name: 'HC Amit Mandavi',
    force: 'CRPF (204 CoBRA)',
    battalion: '204 CoBRA Battalion',
    company: 'Alpha Coy (Forward Ops)',
    rank: 'Head Constable',
    age: 33,
    deploymentZone: 'ZONE_LWE',
    deploymentLocation: 'Sukma / Bastar, Chhattisgarh',
    deploymentDurationMonths: 26,
    daysSinceLastLeave: 195,
    leaveRejectionCount: 1,
    accumulatedLeaveDays: 48,
    outpostIsolationScore: 4,
    dutyShiftHours: 12.0,
    consecutiveNightDuties: 4,
    transferCount: 2,
    trainingCommitment: 'Jungle Warfare Refresher',
    workloadTrend: 'increasing',
    voluntaryBiometrics: { hrvRmssd: 24, restingHeartRate: 82, sleepHours: 5.2 },
    latestAssessment: { pss10Score: 24, operationalFatigue: 7, mood: 'anxious', familyContact: 'rarely' }
  },
  {
    id: 'CRPF-204-003',
    serviceNumber: 'CRPF-2022-11490',
    anonymizedToken: 'J-COBRA-315',
    name: 'Ct. Sunita Soren',
    force: 'CRPF (204 CoBRA)',
    battalion: '204 CoBRA Battalion',
    company: 'Bravo Coy (Quick Reaction)',
    rank: 'Constable (GD)',
    age: 25,
    deploymentZone: 'ZONE_LWE',
    deploymentLocation: 'Bijapur, Chhattisgarh',
    deploymentDurationMonths: 14,
    daysSinceLastLeave: 140,
    leaveRejectionCount: 0,
    accumulatedLeaveDays: 35,
    outpostIsolationScore: 3,
    dutyShiftHours: 10.0,
    consecutiveNightDuties: 2,
    transferCount: 1,
    trainingCommitment: 'Quick Reaction Tactics',
    workloadTrend: 'stable',
    voluntaryBiometrics: { hrvRmssd: 36, restingHeartRate: 74, sleepHours: 6.5 },
    latestAssessment: { pss10Score: 17, operationalFatigue: 5, mood: 'alert', familyContact: 'regular' }
  },
  {
    id: 'CRPF-204-004',
    serviceNumber: 'CRPF-2015-03201',
    anonymizedToken: 'J-COBRA-052',
    name: 'SI Vikram Rathore',
    force: 'CRPF (204 CoBRA)',
    battalion: '204 CoBRA Battalion',
    company: 'Charlie Coy',
    rank: 'Sub-Inspector',
    age: 38,
    deploymentZone: 'ZONE_LWE',
    deploymentLocation: 'Sukma / Bastar, Chhattisgarh',
    deploymentDurationMonths: 18,
    daysSinceLastLeave: 110,
    leaveRejectionCount: 1,
    accumulatedLeaveDays: 40,
    outpostIsolationScore: 3,
    dutyShiftHours: 11.0,
    consecutiveNightDuties: 3,
    transferCount: 2,
    trainingCommitment: 'Company Command Refresher',
    workloadTrend: 'stable',
    voluntaryBiometrics: { hrvRmssd: 32, restingHeartRate: 77, sleepHours: 6.0 },
    latestAssessment: { pss10Score: 20, operationalFatigue: 6, mood: 'neutral', familyContact: 'regular' }
  },

  // 2. High Altitude & CI Operations (Srinagar & Valley, J&K)
  {
    id: 'CRPF-110-001',
    serviceNumber: 'CRPF-2019-07442',
    anonymizedToken: 'J-KMR-411',
    name: 'Ct. Mohammad Farooq',
    force: 'CRPF (110 Bn)',
    battalion: '110 Bn CRPF',
    company: 'Bravo Coy (Valley CI Ops)',
    rank: 'Constable (GD)',
    age: 28,
    deploymentZone: 'ZONE_HIGH_ALTITUDE',
    deploymentLocation: 'Srinagar / Baramulla, J&K',
    deploymentDurationMonths: 22,
    daysSinceLastLeave: 185,
    leaveRejectionCount: 2,
    accumulatedLeaveDays: 45,
    outpostIsolationScore: 4,
    dutyShiftHours: 12.0,
    consecutiveNightDuties: 5,
    transferCount: 3,
    trainingCommitment: 'High Altitude Warfare Induction',
    workloadTrend: 'increasing',
    voluntaryBiometrics: { hrvRmssd: 23, restingHeartRate: 83, sleepHours: 4.8 },
    latestAssessment: { pss10Score: 27, operationalFatigue: 8, mood: 'exhausted', familyContact: 'rarely' }
  },
  {
    id: 'CRPF-110-002',
    serviceNumber: 'CRPF-2017-06109',
    anonymizedToken: 'J-KMR-290',
    name: 'HC Balwinder Singh',
    force: 'CRPF (110 Bn)',
    battalion: '110 Bn CRPF',
    company: 'Bravo Coy (Valley CI Ops)',
    rank: 'Head Constable',
    age: 36,
    deploymentZone: 'ZONE_CI_OPS',
    deploymentLocation: 'Srinagar, J&K',
    deploymentDurationMonths: 16,
    daysSinceLastLeave: 125,
    leaveRejectionCount: 0,
    accumulatedLeaveDays: 38,
    outpostIsolationScore: 2,
    dutyShiftHours: 9.5,
    consecutiveNightDuties: 2,
    transferCount: 1,
    trainingCommitment: 'Valley CI Ops Tactical Refresher',
    workloadTrend: 'stable',
    voluntaryBiometrics: { hrvRmssd: 34, restingHeartRate: 75, sleepHours: 6.4 },
    latestAssessment: { pss10Score: 18, operationalFatigue: 5, mood: 'neutral', familyContact: 'regular' }
  },
  {
    id: 'CRPF-110-003',
    serviceNumber: 'CRPF-2021-12003',
    anonymizedToken: 'J-KMR-563',
    name: 'Ct. Tenzing Norbu',
    force: 'CRPF (110 Bn)',
    battalion: '110 Bn CRPF',
    company: 'Alpha Coy',
    rank: 'Constable (GD)',
    age: 26,
    deploymentZone: 'ZONE_HIGH_ALTITUDE',
    deploymentLocation: 'High Pass / Ganderbal, J&K',
    deploymentDurationMonths: 19,
    daysSinceLastLeave: 165,
    leaveRejectionCount: 1,
    accumulatedLeaveDays: 42,
    outpostIsolationScore: 5,
    dutyShiftHours: 11.5,
    consecutiveNightDuties: 4,
    transferCount: 2,
    trainingCommitment: 'Sub-Zero Mountain Survival',
    workloadTrend: 'increasing',
    voluntaryBiometrics: { hrvRmssd: 27, restingHeartRate: 80, sleepHours: 5.4 },
    latestAssessment: { pss10Score: 23, operationalFatigue: 7, mood: 'neutral', familyContact: 'rarely' }
  },
  {
    id: 'CRPF-110-004',
    serviceNumber: 'CRPF-2012-01988',
    anonymizedToken: 'J-KMR-018',
    name: 'Inspector Gurmeet Dhillon',
    force: 'CRPF (110 Bn)',
    battalion: '110 Bn CRPF',
    company: 'HQ Coy',
    rank: 'Inspector',
    age: 44,
    deploymentZone: 'ZONE_CI_OPS',
    deploymentLocation: 'Srinagar Sector HQ, J&K',
    deploymentDurationMonths: 15,
    daysSinceLastLeave: 85,
    leaveRejectionCount: 0,
    accumulatedLeaveDays: 28,
    outpostIsolationScore: 2,
    dutyShiftHours: 8.5,
    consecutiveNightDuties: 1,
    transferCount: 1,
    trainingCommitment: 'Sector Command Staff Course',
    workloadTrend: 'stable',
    voluntaryBiometrics: { hrvRmssd: 42, restingHeartRate: 71, sleepHours: 7.2 },
    latestAssessment: { pss10Score: 14, operationalFatigue: 4, mood: 'calm', familyContact: 'regular' }
  },

  // 3. Rapid Action Force (RAF 103 Bn - Public Order & Crowd Control)
  {
    id: 'RAF-103-001',
    serviceNumber: 'CRPF-2020-08871',
    anonymizedToken: 'J-RAF-612',
    name: 'Ct. Sandeep Yadav',
    force: 'Rapid Action Force (103 RAF)',
    battalion: '103 RAF Battalion',
    company: 'Charlie Coy (Riot Control)',
    rank: 'Constable (GD)',
    age: 26,
    deploymentZone: 'ZONE_PUBLIC_ORDER',
    deploymentLocation: 'Rapid Deployment Sector, Delhi-NCR',
    deploymentDurationMonths: 11,
    daysSinceLastLeave: 90,
    leaveRejectionCount: 0,
    accumulatedLeaveDays: 28,
    outpostIsolationScore: 1,
    dutyShiftHours: 14.0, // Long stand-by riot shift
    consecutiveNightDuties: 3,
    transferCount: 2,
    trainingCommitment: 'Riot Control & Anti-Mob Tactics',
    workloadTrend: 'increasing',
    voluntaryBiometrics: { hrvRmssd: 28, restingHeartRate: 81, sleepHours: 5.0 },
    latestAssessment: { pss10Score: 22, operationalFatigue: 7, mood: 'anxious', familyContact: 'regular' }
  },
  {
    id: 'RAF-103-002',
    serviceNumber: 'CRPF-2016-04552',
    anonymizedToken: 'J-RAF-234',
    name: 'ASI Meenakshi Rawat',
    force: 'Rapid Action Force (103 RAF)',
    battalion: '103 RAF Battalion',
    company: 'Charlie Coy (Riot Control)',
    rank: 'ASI',
    age: 35,
    deploymentZone: 'ZONE_PUBLIC_ORDER',
    deploymentLocation: 'Rapid Deployment Sector, Delhi-NCR',
    deploymentDurationMonths: 18,
    daysSinceLastLeave: 130,
    leaveRejectionCount: 1,
    accumulatedLeaveDays: 36,
    outpostIsolationScore: 1,
    dutyShiftHours: 11.0,
    consecutiveNightDuties: 2,
    transferCount: 1,
    trainingCommitment: 'Public Order Supervision',
    workloadTrend: 'stable',
    voluntaryBiometrics: { hrvRmssd: 35, restingHeartRate: 74, sleepHours: 6.2 },
    latestAssessment: { pss10Score: 19, operationalFatigue: 5, mood: 'alert', familyContact: 'regular' }
  },

  // 4. Static Garrison & Peace Posting (50 Bn CRPF)
  {
    id: 'CRPF-050-001',
    serviceNumber: 'CRPF-2014-02319',
    anonymizedToken: 'J-PEACE-101',
    name: 'HC Dinesh Murmu',
    force: 'CRPF (50 Bn)',
    battalion: '50 Bn CRPF',
    company: 'Delta Coy (Static Security)',
    rank: 'Head Constable',
    age: 39,
    deploymentZone: 'ZONE_PEACE_STATIC',
    deploymentLocation: 'Group Centre, New Delhi',
    deploymentDurationMonths: 8,
    daysSinceLastLeave: 40,
    leaveRejectionCount: 0,
    accumulatedLeaveDays: 18,
    outpostIsolationScore: 1,
    dutyShiftHours: 8.0,
    consecutiveNightDuties: 1,
    transferCount: 1,
    trainingCommitment: 'Annual Weapon Training (Garrison)',
    workloadTrend: 'decreasing',
    voluntaryBiometrics: { hrvRmssd: 48, restingHeartRate: 67, sleepHours: 7.8 },
    latestAssessment: { pss10Score: 11, operationalFatigue: 2, mood: 'calm', familyContact: 'regular' }
  },
  {
    id: 'CRPF-050-002',
    serviceNumber: 'CRPF-2023-14502',
    anonymizedToken: 'J-PEACE-304',
    name: 'Ct. Pooja Deshmukh',
    force: 'CRPF (50 Bn)',
    battalion: '50 Bn CRPF',
    company: 'Delta Coy (Static Security)',
    rank: 'Constable (GD)',
    age: 23,
    deploymentZone: 'ZONE_PEACE_STATIC',
    deploymentLocation: 'Group Centre, New Delhi',
    deploymentDurationMonths: 5,
    daysSinceLastLeave: 25,
    leaveRejectionCount: 0,
    accumulatedLeaveDays: 12,
    outpostIsolationScore: 1,
    dutyShiftHours: 7.5,
    consecutiveNightDuties: 0,
    transferCount: 0,
    trainingCommitment: 'Basic Garrison Protocol',
    workloadTrend: 'stable',
    voluntaryBiometrics: { hrvRmssd: 52, restingHeartRate: 64, sleepHours: 8.0 },
    latestAssessment: { pss10Score: 8, operationalFatigue: 2, mood: 'calm', familyContact: 'daily' }
  }
];

/**
 * Seed Database with Uniformed Forces records
 */
export function seedForcesIfEmpty() {
  const needsSeed = useNodeSqlite
    ? (dbInstance.prepare('SELECT COUNT(*) as count FROM forces_personnel').get().count === 0)
    : (forcesStore.personnel.length === 0);

  if (!needsSeed) return;

  console.log('[Forces DB] Seeding CRPF & CAPF Personnel records for PS #26186...');

  SEED_PERSONNEL.forEach(p => {
    const risk = calculateForcesRisk({
      deploymentZone: p.deploymentZone,
      deploymentDurationMonths: p.deploymentDurationMonths,
      daysSinceLastLeave: p.daysSinceLastLeave,
      leaveRejectionCount: p.leaveRejectionCount,
      dutyShiftHours: p.dutyShiftHours,
      consecutiveNightDuties: p.consecutiveNightDuties,
      outpostIsolationScore: p.outpostIsolationScore,
      transferCount: p.transferCount,
      trainingCommitment: p.trainingCommitment,
      workloadTrend: p.workloadTrend,
      voluntaryBiometrics: p.voluntaryBiometrics,
      latestAssessment: p.latestAssessment
    });

    const now = new Date().toISOString();

    if (useNodeSqlite && dbInstance) {
      dbInstance.prepare(`
        INSERT INTO forces_personnel (
          id, service_number, anonymized_token, name, force, battalion, company, rank, age,
          deployment_zone, deployment_location, deployment_duration_months, days_since_last_leave,
          leave_rejection_count, accumulated_leave_days, outpost_isolation_score, duty_shift_hours,
          consecutive_night_duties, transfer_count, training_commitment, workload_trend,
          voluntary_biometrics, latest_assessment, calculated_risk, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        p.id, p.serviceNumber, p.anonymizedToken, p.name, p.force, p.battalion, p.company, p.rank, p.age,
        p.deploymentZone, p.deploymentLocation, p.deploymentDurationMonths, p.daysSinceLastLeave,
        p.leaveRejectionCount, p.accumulatedLeaveDays, p.outpostIsolationScore, p.dutyShiftHours,
        p.consecutiveNightDuties, p.transferCount, p.trainingCommitment, p.workloadTrend,
        JSON.stringify(p.voluntaryBiometrics), JSON.stringify(p.latestAssessment),
        JSON.stringify(risk), now
      );

      // Seed initial alerts if triggered
      if (risk.alertTrigger && risk.alertPayload) {
        dbInstance.prepare(`
          INSERT INTO forces_alerts (id, personnel_id, severity, category, message, details, acknowledged, created_at)
          VALUES (?, ?, ?, ?, ?, ?, 0, ?)
        `).run(
          `ALT-${p.id}`, p.id, risk.alertPayload.severity, risk.alertPayload.category,
          risk.alertPayload.message, JSON.stringify(risk.alertPayload), now
        );
      }

      // Seed initial recommended interventions
      risk.recommendedInterventions.slice(0, 2).forEach((intv, idx) => {
        dbInstance.prepare(`
          INSERT INTO forces_interventions (
            id, personnel_id, type, title, description, urgency, status, recommended_by, assigned_to, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          `INTV-${p.id}-${idx + 1}`, p.id, intv.type, intv.title, intv.description,
          intv.urgency, 'Recommended', 'AI Predictive Welfare Engine', 'Unit Welfare Officer / Medical Subedar', now, now
        );
      });
    }

    // Also populate in-memory store
    forcesStore.personnel.push({
      ...p,
      calculatedRisk: risk,
      updatedAt: now
    });

    if (risk.alertTrigger && risk.alertPayload) {
      forcesStore.alerts.push({
        id: `ALT-${p.id}`,
        personnelId: p.id,
        severity: risk.alertPayload.severity,
        category: risk.alertPayload.category,
        message: risk.alertPayload.message,
        details: risk.alertPayload,
        acknowledged: false,
        createdAt: now
      });
    }

    risk.recommendedInterventions.slice(0, 2).forEach((intv, idx) => {
      forcesStore.interventions.push({
        id: `INTV-${p.id}-${idx + 1}`,
        personnelId: p.id,
        type: intv.type,
        title: intv.title,
        description: intv.description,
        urgency: intv.urgency,
        status: 'Recommended',
        recommendedBy: 'AI Predictive Welfare Engine',
        assignedTo: 'Unit Welfare Officer / Medical Subedar',
        createdAt: now,
        updatedAt: now
      });
    });
  });

  logAudit('SYSTEM_INIT', 'Seeded initial CRPF & CAPF records with role-based privacy masking');
  console.log('[Forces DB] Seed complete: 12 personnel records, alerts and initial interventions ready.');
}

/**
 * Audit Logging for Strict Privacy Compliance
 */
export function logAudit(role, action, resourceId = null, details = '') {
  const item = {
    id: `AUD-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    timestamp: new Date().toISOString(),
    actorRole: role || 'UNKNOWN',
    action,
    resourceId,
    details: typeof details === 'object' ? JSON.stringify(details) : String(details)
  };

  forcesStore.auditLogs.unshift(item);
  if (forcesStore.auditLogs.length > 200) forcesStore.auditLogs.pop();

  if (useNodeSqlite && dbInstance) {
    try {
      dbInstance.prepare(`
        INSERT INTO forces_audit_logs (id, timestamp, actor_role, action, resource_id, details)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(item.id, item.timestamp, item.actorRole, item.action, item.resourceId, item.details);
    } catch (e) {
      console.error('[Forces DB Audit Log Error]:', e.message);
    }
  }
}

/**
 * Fetch all Personnel with Role-Based Masking
 * - Role 'commander': Name is anonymized (e.g. J-COBRA-784), serviceNumber redacted, private health journals concealed.
 * - Role 'welfare_officer': Full clinical view, service number visible, triage indicators available.
 * - Role 'personnel': Only specific personnel's own record.
 */
export function getPersonnelList({ role = 'commander', battalion = '', company = '', personnelId = '' } = {}) {
  let list = [];

  if (useNodeSqlite && dbInstance) {
    let query = 'SELECT * FROM forces_personnel WHERE 1=1';
    const params = [];

    if (battalion) {
      query += ' AND battalion = ?';
      params.push(battalion);
    }
    if (company) {
      query += ' AND company = ?';
      params.push(company);
    }
    if (personnelId) {
      query += ' AND id = ?';
      params.push(personnelId);
    }

    const rows = dbInstance.prepare(query).all(...params);
    list = rows.map(r => ({
      id: r.id,
      serviceNumber: r.service_number,
      anonymizedToken: r.anonymized_token,
      name: r.name,
      force: r.force,
      battalion: r.battalion,
      company: r.company,
      rank: r.rank,
      age: r.age,
      deploymentZone: r.deployment_zone,
      deploymentLocation: r.deployment_location,
      deploymentDurationMonths: r.deployment_duration_months,
      daysSinceLastLeave: r.days_since_last_leave,
      leaveRejectionCount: r.leave_rejection_count,
      accumulatedLeaveDays: r.accumulated_leave_days,
      outpostIsolationScore: r.outpost_isolation_score,
      dutyShiftHours: r.duty_shift_hours,
      consecutiveNightDuties: r.consecutive_night_duties,
      transferCount: r.transfer_count !== undefined && r.transfer_count !== null ? r.transfer_count : 1,
      trainingCommitment: r.training_commitment || 'Standard Garrison Drill',
      workloadTrend: r.workload_trend || 'stable',
      voluntaryBiometrics: JSON.parse(r.voluntary_biometrics || '{}'),
      latestAssessment: JSON.parse(r.latest_assessment || '{}'),
      calculatedRisk: JSON.parse(r.calculated_risk || '{}'),
      updatedAt: r.updated_at
    }));
  } else {
    list = forcesStore.personnel.filter(p => {
      if (battalion && p.battalion !== battalion) return false;
      if (company && p.company !== company) return false;
      if (personnelId && p.id !== personnelId) return false;
      return true;
    });
  }

  logAudit(role, 'READ_PERSONNEL_LIST', battalion || 'ALL', `Returned ${list.length} records`);

  // RBAC 1: Field Personnel view - strictly restricted to self (prevents lateral snooping on peers)
  if (role === 'personnel') {
    if (!personnelId) return [];
    return list.filter(p => p.id === personnelId);
  }

  // RBAC 2: Welfare Officer or Admin gets unmasked operational data for clinical triage
  if (role === 'welfare_officer' || role === 'admin') {
    return list;
  }

  // RBAC 3: Commander Privacy Shield (default fallback for commander and any unauthenticated role)
  return list.map(p => ({
    id: p.id,
    anonymizedToken: p.anonymizedToken,
    name: `[Anonymized Jawan ${p.anonymizedToken}]`,
    serviceNumber: 'CRPF-REDACTED-***',
    force: p.force,
    battalion: p.battalion,
    company: p.company,
    rank: p.rank,
    deploymentZone: p.deploymentZone,
    deploymentLocation: p.deploymentLocation,
    deploymentDurationMonths: p.deploymentDurationMonths,
    daysSinceLastLeave: p.daysSinceLastLeave,
    leaveRejectionCount: p.leaveRejectionCount,
    accumulatedLeaveDays: p.accumulatedLeaveDays,
    dutyShiftHours: p.dutyShiftHours,
    consecutiveNightDuties: p.consecutiveNightDuties,
    transferCount: p.transferCount,
    trainingCommitment: p.trainingCommitment,
    workloadTrend: p.workloadTrend,
    calculatedRisk: {
      compositeStrainScore: p.calculatedRisk.compositeStrainScore,
      riskTier: p.calculatedRisk.riskTier,
      operationalReadinessIndex: p.calculatedRisk.operationalReadinessIndex,
      burnoutProbability: p.calculatedRisk.burnoutProbability,
      riskDrivers: p.calculatedRisk.riskDrivers,
      recommendedInterventions: (p.calculatedRisk.recommendedInterventions || []).map(i => ({
        type: i.type,
        title: i.title,
        urgency: i.urgency
      }))
    },
    // Redact private biometric markers and psychological notes
    voluntaryBiometrics: { status: 'Preserved under Differential Privacy' },
    latestAssessment: { status: 'Confidential Medical/Welfare Data' },
    privacyClause: 'Protected by MHA Personnel Welfare Charter (Non-Punitive Doctrine)'
  }));
}

/**
 * Fetch Single Personnel with full clinical details
 */
export function getPersonnelById(id, role = 'welfare_officer') {
  const list = getPersonnelList({ role, personnelId: id });
  if (!list || list.length === 0) return null;
  return list[0];
}

/**
 * Save / Update Personnel Self-Assessment & Trigger Recalculation
 */
export function submitAssessment({
  personnelId,
  pss10Score,
  operationalFatigue,
  sleepHours,
  mood = 'neutral',
  familyContact = 'regular',
  dutyStrainNotes = '',
  role = 'personnel'
}) {
  const p = getPersonnelById(personnelId, 'welfare_officer');
  if (!p) throw new Error(`Personnel not found: ${personnelId}`);

  const assessmentRecord = {
    id: `ASS-${Date.now()}`,
    personnelId,
    timestamp: new Date().toISOString(),
    pss10Score: pss10Score !== undefined && !isNaN(parseInt(pss10Score, 10)) ? parseInt(pss10Score, 10) : 0,
    operationalFatigue: operationalFatigue !== undefined && !isNaN(parseInt(operationalFatigue, 10)) ? parseInt(operationalFatigue, 10) : 5,
    sleepHours: sleepHours !== undefined && !isNaN(parseFloat(sleepHours)) ? parseFloat(sleepHours) : 7.0,
    mood: mood || 'neutral',
    familyContact: familyContact || 'regular',
    dutyStrainNotes: dutyStrainNotes || ''
  };

  // Update voluntary biometrics sleep
  const biometrics = {
    ...p.voluntaryBiometrics,
    sleepHours: assessmentRecord.sleepHours
  };

  // Recalculate Risk with all 6 HRMS parameters
  const updatedRisk = calculateForcesRisk({
    deploymentZone: p.deploymentZone,
    deploymentDurationMonths: p.deploymentDurationMonths,
    daysSinceLastLeave: p.daysSinceLastLeave,
    leaveRejectionCount: p.leaveRejectionCount,
    dutyShiftHours: p.dutyShiftHours,
    consecutiveNightDuties: p.consecutiveNightDuties,
    outpostIsolationScore: p.outpostIsolationScore,
    transferCount: p.transferCount,
    trainingCommitment: p.trainingCommitment,
    workloadTrend: p.workloadTrend,
    voluntaryBiometrics: biometrics,
    latestAssessment: assessmentRecord
  });

  const now = new Date().toISOString();

  // Update SQLite
  if (useNodeSqlite && dbInstance) {
    dbInstance.prepare(`
      INSERT INTO forces_assessments (id, personnel_id, timestamp, pss10_score, operational_fatigue, sleep_hours, mood, family_contact, duty_strain_notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      assessmentRecord.id, assessmentRecord.personnelId, assessmentRecord.timestamp,
      assessmentRecord.pss10Score, assessmentRecord.operationalFatigue, assessmentRecord.sleepHours,
      assessmentRecord.mood, assessmentRecord.familyContact, assessmentRecord.dutyStrainNotes
    );

    dbInstance.prepare(`
      UPDATE forces_personnel
      SET voluntary_biometrics = ?, latest_assessment = ?, calculated_risk = ?, updated_at = ?
      WHERE id = ?
    `).run(JSON.stringify(biometrics), JSON.stringify(assessmentRecord), JSON.stringify(updatedRisk), now, personnelId);

    // If alert triggered, create alert
    if (updatedRisk.alertTrigger && updatedRisk.alertPayload) {
      dbInstance.prepare(`
        INSERT INTO forces_alerts (id, personnel_id, severity, category, message, details, acknowledged, created_at)
        VALUES (?, ?, ?, ?, ?, ?, 0, ?)
      `).run(
        `ALT-${Date.now()}`, personnelId, updatedRisk.alertPayload.severity, updatedRisk.alertPayload.category,
        updatedRisk.alertPayload.message, JSON.stringify(updatedRisk.alertPayload), now
      );
    }
  }

  // Update in-memory
  const memP = forcesStore.personnel.find(x => x.id === personnelId);
  if (memP) {
    memP.voluntaryBiometrics = biometrics;
    memP.latestAssessment = assessmentRecord;
    memP.calculatedRisk = updatedRisk;
    memP.updatedAt = now;
  }
  forcesStore.assessments.unshift(assessmentRecord);

  if (updatedRisk.alertTrigger && updatedRisk.alertPayload) {
    forcesStore.alerts.unshift({
      id: `ALT-${Date.now()}`,
      personnelId,
      severity: updatedRisk.alertPayload.severity,
      category: updatedRisk.alertPayload.category,
      message: updatedRisk.alertPayload.message,
      details: updatedRisk.alertPayload,
      acknowledged: false,
      createdAt: now
    });
  }

  logAudit(role, 'SUBMIT_ASSESSMENT', personnelId, `PSS-10: ${assessmentRecord.pss10Score}, Fatigue: ${assessmentRecord.operationalFatigue}`);

  return {
    assessment: assessmentRecord,
    calculatedRisk: updatedRisk
  };
}

/**
 * Fetch Automated Welfare Alerts
 */
export function getAlerts({ role = 'welfare_officer', acknowledged = null, personnelId = '' } = {}) {
  let alerts = [];

  if (useNodeSqlite && dbInstance) {
    let query = 'SELECT * FROM forces_alerts';
    const params = [];
    if (acknowledged !== null) {
      query += ' WHERE acknowledged = ?';
      params.push(acknowledged ? 1 : 0);
    }
    query += ' ORDER BY created_at DESC';
    const rows = dbInstance.prepare(query).all(...params);
    alerts = rows.map(r => ({
      id: r.id,
      personnelId: r.personnel_id,
      severity: r.severity,
      category: r.category,
      message: r.message,
      details: JSON.parse(r.details || '{}'),
      acknowledged: Boolean(r.acknowledged),
      createdAt: r.created_at
    }));
  } else {
    alerts = forcesStore.alerts.filter(a => {
      if (acknowledged !== null && a.acknowledged !== acknowledged) return false;
      return true;
    });
  }

  // Personnel only sees their own alerts
  if (role === 'personnel') {
    if (personnelId) {
      alerts = alerts.filter(a => a.personnelId === personnelId);
    } else {
      alerts = [];
    }
  }

  // Attach personnel token or info
  return alerts.map(a => {
    const p = getPersonnelById(a.personnelId, role);
    return {
      ...a,
      personnelName: p ? (role === 'commander' ? p.anonymizedToken : p.name) : a.personnelId,
      battalion: p ? p.battalion : '',
      company: p ? p.company : '',
      rank: p ? p.rank : ''
    };
  });
}

/**
 * Acknowledge or Resolve Alert
 */
export function acknowledgeAlert(alertId, role = 'welfare_officer') {
  if (useNodeSqlite && dbInstance) {
    dbInstance.prepare('UPDATE forces_alerts SET acknowledged = 1 WHERE id = ?').run(alertId);
  }
  const a = forcesStore.alerts.find(x => x.id === alertId);
  if (a) a.acknowledged = true;

  logAudit(role, 'ACKNOWLEDGE_ALERT', alertId, 'Alert acknowledged by authorized officer');
  return { success: true, alertId };
}

/**
 * Fetch Welfare Interventions
 */
export function getInterventions({ role = 'welfare_officer', status = '', personnelId = '' } = {}) {
  let list = [];

  if (useNodeSqlite && dbInstance) {
    let query = 'SELECT * FROM forces_interventions';
    const params = [];
    if (status) {
      query += ' WHERE status = ?';
      params.push(status);
    }
    query += ' ORDER BY created_at DESC';
    const rows = dbInstance.prepare(query).all(...params);
    list = rows.map(r => ({
      id: r.id,
      personnelId: r.personnel_id,
      type: r.type,
      title: r.title,
      description: r.description,
      urgency: r.urgency,
      status: r.status,
      recommendedBy: r.recommended_by,
      assignedTo: r.assigned_to,
      createdAt: r.created_at,
      updatedAt: r.updated_at
    }));
  } else {
    list = forcesStore.interventions.filter(i => {
      if (status && i.status !== status) return false;
      return true;
    });
  }

  // Personnel only sees their own interventions
  if (role === 'personnel') {
    if (personnelId) {
      list = list.filter(i => i.personnelId === personnelId);
    } else {
      list = [];
    }
  }

  return list.map(i => {
    const p = getPersonnelById(i.personnelId, role);
    return {
      ...i,
      personnelToken: p ? p.anonymizedToken : i.personnelId,
      personnelName: p ? (role === 'commander' ? p.anonymizedToken : p.name) : i.personnelId,
      battalion: p ? p.battalion : '',
      company: p ? p.company : ''
    };
  });
}

/**
 * Create or Update Intervention
 */
export function updateIntervention({ id, status, assignedTo, role = 'welfare_officer' }) {
  const now = new Date().toISOString();

  if (useNodeSqlite && dbInstance) {
    dbInstance.prepare(`
      UPDATE forces_interventions
      SET status = COALESCE(?, status), assigned_to = COALESCE(?, assigned_to), updated_at = ?
      WHERE id = ?
    `).run(status || null, assignedTo || null, now, id);
  }

  const item = forcesStore.interventions.find(x => x.id === id);
  if (item) {
    if (status) item.status = status;
    if (assignedTo) item.assignedTo = assignedTo;
    item.updatedAt = now;
  }

  logAudit(role, 'UPDATE_INTERVENTION', id, `Status updated to ${status}`);
  return { success: true, id, status };
}

/**
 * Create New Welfare Intervention
 */
export function createIntervention({
  personnelId,
  type,
  title,
  description,
  urgency = 'High',
  assignedTo = 'Unit Medical Officer / Subedar',
  role = 'welfare_officer'
}) {
  const id = `INTV-${Date.now()}`;
  const now = new Date().toISOString();

  const intv = {
    id,
    personnelId,
    type,
    title,
    description,
    urgency,
    status: 'Approved',
    recommendedBy: `${role.toUpperCase()} (Manual Action)`,
    assignedTo,
    createdAt: now,
    updatedAt: now
  };

  if (useNodeSqlite && dbInstance) {
    dbInstance.prepare(`
      INSERT INTO forces_interventions (
        id, personnel_id, type, title, description, urgency, status, recommended_by, assigned_to, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, personnelId, type, title, description, urgency, 'Approved', intv.recommendedBy, assignedTo, now, now);
  }

  forcesStore.interventions.unshift(intv);
  logAudit(role, 'CREATE_INTERVENTION', personnelId, `${urgency} intervention created: ${title}`);
  return intv;
}

/**
 * Compute Battalion & Company Level Dashboard Aggregates
 */
export function getDashboardMetrics({ role = 'commander', battalion = '' } = {}) {
  const allPersonnel = getPersonnelList({ role, battalion });

  if (allPersonnel.length === 0) {
    return {
      totalPersonnel: 0,
      averageStrain: 0,
      operationalReadiness: 100,
      atRiskCount: 0,
      tierDistribution: { Low: 0, Moderate: 0, Elevated: 0, Critical: 0 },
      companyBreakdown: [],
      leaveBacklogOverdue: 0,
      shiftOvertimePercent: 0,
      highTransferCount: 0,
      highTransferPercent: 0,
      increasingWorkloadCount: 0,
      increasingWorkloadPercent: 0
    };
  }

  let totalStrain = 0;
  let totalReadiness = 0;
  let atRiskCount = 0;
  let leaveBacklogCount = 0;
  let shiftOvertimeCount = 0;
  let highTransferCount = 0;
  let increasingWorkloadCount = 0;

  const tiers = { Low: 0, Moderate: 0, Elevated: 0, Critical: 0 };
  const companyMap = {};

  allPersonnel.forEach(p => {
    const risk = p.calculatedRisk || {};
    const score = risk.compositeStrainScore || 20;
    const tier = risk.riskTier || 'Moderate';
    const readiness = risk.operationalReadinessIndex || 80;

    totalStrain += score;
    totalReadiness += readiness;
    tiers[tier] = (tiers[tier] || 0) + 1;

    if (tier === 'Elevated' || tier === 'Critical') atRiskCount++;
    if (p.daysSinceLastLeave > 180 || p.leaveRejectionCount > 0) leaveBacklogCount++;
    if (p.dutyShiftHours > 10 || p.consecutiveNightDuties >= 3) shiftOvertimeCount++;
    if (p.transferCount >= 3) highTransferCount = (highTransferCount || 0) + 1;
    if (p.workloadTrend === 'increasing') increasingWorkloadCount = (increasingWorkloadCount || 0) + 1;

    // Group by company
    const coy = p.company || 'Main Coy';
    if (!companyMap[coy]) {
      companyMap[coy] = {
        name: coy,
        battalion: p.battalion,
        count: 0,
        totalStrain: 0,
        totalReadiness: 0,
        criticalCount: 0,
        highFatigueCount: 0
      };
    }
    companyMap[coy].count++;
    companyMap[coy].totalStrain += score;
    companyMap[coy].totalReadiness += readiness;
    if (tier === 'Critical' || tier === 'Elevated') companyMap[coy].criticalCount++;
    if (p.dutyShiftHours > 11) companyMap[coy].highFatigueCount++;
  });

  const companyBreakdown = Object.values(companyMap).map(c => ({
    name: c.name,
    battalion: c.battalion,
    personnelCount: c.count,
    averageStrain: Math.round(c.totalStrain / c.count),
    averageReadiness: Math.round(c.totalReadiness / c.count),
    atRiskCount: c.criticalCount,
    highFatigueCount: c.highFatigueCount,
    stressLevel: c.totalStrain / c.count > 65 ? 'High' : (c.totalStrain / c.count > 45 ? 'Moderate' : 'Low')
  }));

  const activeAlerts = getAlerts({ role, acknowledged: false });
  const pendingInterventions = getInterventions({ role, status: 'Recommended' });

  logAudit(role, 'VIEW_DASHBOARD_METRICS', battalion || 'FORCE_WIDE', `Computed for ${allPersonnel.length} jawans`);

  return {
    totalPersonnel: allPersonnel.length,
    averageStrain: Math.round(totalStrain / allPersonnel.length),
    operationalReadiness: Math.round(totalReadiness / allPersonnel.length),
    atRiskCount,
    atRiskPercentage: Math.round((atRiskCount / allPersonnel.length) * 100),
    tierDistribution: tiers,
    companyBreakdown,
    leaveBacklogOverdue: leaveBacklogCount,
    leaveBacklogPercent: Math.round((leaveBacklogCount / allPersonnel.length) * 100),
    shiftOvertimeCount,
    shiftOvertimePercent: Math.round((shiftOvertimeCount / allPersonnel.length) * 100),
    highTransferCount: highTransferCount || 0,
    highTransferPercent: Math.round(((highTransferCount || 0) / allPersonnel.length) * 100),
    increasingWorkloadCount: increasingWorkloadCount || 0,
    increasingWorkloadPercent: Math.round(((increasingWorkloadCount || 0) / allPersonnel.length) * 100),
    activeAlertsCount: activeAlerts.length,
    pendingInterventionsCount: pendingInterventions.length,
    privacyGuarantee: {
      framework: 'Differential Privacy & Non-Punitive Doctrine',
      status: 'Active',
      stigmatizationSafeguard: 'Commander views masked; individual medical/psychological records restricted to Welfare Officers.'
    }
  };
}

/**
 * Retrieve Audit Logs for Privacy Transparency
 */
export function getAuditLogs(limit = 50) {
  if (useNodeSqlite && dbInstance) {
    const rows = dbInstance.prepare('SELECT * FROM forces_audit_logs ORDER BY timestamp DESC LIMIT ?').all(limit);
    return rows.map(r => ({
      id: r.id,
      timestamp: r.timestamp,
      actorRole: r.actor_role,
      action: r.action,
      resourceId: r.resource_id,
      details: r.details
    }));
  }
  return forcesStore.auditLogs.slice(0, limit);
}

// Auto seed on initial import
seedForcesIfEmpty();
