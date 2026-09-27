import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure data directory exists
const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_PATH = path.join(DATA_DIR, 'serenetrack.db');

// Check for node:sqlite
let dbInstance = null;
let useNodeSqlite = false;

try {
  const { DatabaseSync } = await import('node:sqlite');
  dbInstance = new DatabaseSync(DB_PATH);
  useNodeSqlite = true;
} catch (e) {
  console.warn('[DB] node:sqlite not available in this Node runtime, using JSON store fallback:', e.message);
}

// Fallback JSON store if node:sqlite is ever unavailable in an unusual environment
const JSON_STORE_PATH = path.join(DATA_DIR, 'serenetrack_store.json');
let memoryStore = {
  profile: null,
  logs: []
};

if (!useNodeSqlite) {
  if (fs.existsSync(JSON_STORE_PATH)) {
    try {
      memoryStore = JSON.parse(fs.readFileSync(JSON_STORE_PATH, 'utf-8'));
    } catch (e) {
      console.error('[DB Fallback] Failed reading json store:', e);
    }
  }
}

function saveJsonStore() {
  if (!useNodeSqlite) {
    fs.writeFileSync(JSON_STORE_PATH, JSON.stringify(memoryStore, null, 2), 'utf-8');
  }
}

// Initialize tables if using SQLite
if (useNodeSqlite && dbInstance) {
  dbInstance.exec(`
    CREATE TABLE IF NOT EXISTS profile (
      id INTEGER PRIMARY KEY DEFAULT 1,
      username TEXT NOT NULL,
      age INTEGER NOT NULL DEFAULT 28,
      preferred_wake_time TEXT NOT NULL DEFAULT '06:30',
      target_sleep_goal REAL NOT NULL DEFAULT 8.0,
      avatar_url TEXT DEFAULT '',
      notifications TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS logs (
      id TEXT PRIMARY KEY,
      date TEXT UNIQUE NOT NULL,
      timestamp INTEGER NOT NULL,
      working_hours REAL NOT NULL,
      sleep_hours REAL NOT NULL,
      sleep_quality INTEGER NOT NULL,
      fatigue_level INTEGER NOT NULL,
      mood TEXT NOT NULL,
      predicted_stress_score INTEGER NOT NULL,
      stress_tier TEXT NOT NULL,
      stress_drivers TEXT NOT NULL,
      sleep_analysis TEXT NOT NULL,
      activities TEXT NOT NULL,
      notes TEXT DEFAULT '',
      updated_at TEXT NOT NULL
    );
  `);
}

/**
 * Seed database from backup JSON if empty
 */
export function seedIfEmpty() {
  const backupPath = path.resolve(__dirname, '..', 'serenetrack-backup-2026-09-21.json');
  if (!fs.existsSync(backupPath)) return;

  try {
    const raw = fs.readFileSync(backupPath, 'utf-8');
    const backup = JSON.parse(raw);

    if (useNodeSqlite && dbInstance) {
      const countRow = dbInstance.prepare('SELECT COUNT(*) as count FROM logs').get();
      if (countRow && countRow.count === 0) {
        console.log('[DB] Seeding logs & profile from serenetrack-backup-2026-09-21.json...');

        // Seed profile
        if (backup.profile) {
          const notifs = JSON.stringify(backup.notifications || {
            breakReminders: true,
            breakIntervalMinutes: 90,
            bedtimeAlert: true,
            bedtimeAlertAdvanceMinutes: 45,
            soundEffects: true
          });

          dbInstance.prepare(`
            INSERT OR REPLACE INTO profile (id, username, age, preferred_wake_time, target_sleep_goal, avatar_url, notifications, updated_at)
            VALUES (1, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            backup.profile.username || 'Alex Morgan',
            backup.profile.age || 28,
            backup.profile.preferredWakeTime || '06:30',
            backup.profile.targetSleepGoal || 8.0,
            backup.profile.avatarUrl || '',
            notifs,
            new Date().toISOString()
          );
        }

        // Seed logs
        if (Array.isArray(backup.logs)) {
          const insertStmt = dbInstance.prepare(`
            INSERT OR REPLACE INTO logs (
              id, date, timestamp, working_hours, sleep_hours, sleep_quality, fatigue_level,
              mood, predicted_stress_score, stress_tier, stress_drivers, sleep_analysis,
              activities, notes, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `);

          for (const l of backup.logs) {
            insertStmt.run(
              l.id || `log-${l.date}`,
              l.date,
              l.timestamp || Date.now(),
              l.workingHours || 8.0,
              l.sleepHours || 7.0,
              l.sleepQuality || 4,
              l.fatigueLevel || 4,
              l.mood || 'calm',
              l.predictedStressScore || 35,
              l.stressTier || 'Low',
              JSON.stringify(l.stressDrivers || []),
              JSON.stringify(l.sleepAnalysis || {}),
              JSON.stringify(l.activities || {}),
              l.notes || '',
              new Date().toISOString()
            );
          }
          console.log(`[DB] Successfully seeded ${backup.logs.length} logs!`);
        }
      }
    } else {
      if (memoryStore.logs.length === 0) {
        if (backup.profile) {
          memoryStore.profile = {
            id: 1,
            username: backup.profile.username || 'Alex Morgan',
            age: backup.profile.age || 28,
            preferred_wake_time: backup.profile.preferredWakeTime || '06:30',
            target_sleep_goal: backup.profile.targetSleepGoal || 8.0,
            avatar_url: backup.profile.avatarUrl || '',
            notifications: backup.notifications || {},
            updated_at: new Date().toISOString()
          };
        }
        if (Array.isArray(backup.logs)) {
          memoryStore.logs = backup.logs;
        }
        saveJsonStore();
        console.log(`[DB Fallback] Seeded ${memoryStore.logs.length} logs.`);
      }
    }
  } catch (err) {
    console.error('[DB] Error during initial seed:', err);
  }
}

// -------------------------------------------------------------
// PROFILE REPOSITORY METHODS
// -------------------------------------------------------------
export function getProfile() {
  if (useNodeSqlite && dbInstance) {
    const row = dbInstance.prepare('SELECT * FROM profile WHERE id = 1').get();
    if (!row) {
      // Default fallback
      return {
        username: 'Alex Morgan',
        age: 28,
        preferredWakeTime: '06:30',
        targetSleepGoal: 8.0,
        avatarUrl: '',
        notifications: {
          breakReminders: true,
          breakIntervalMinutes: 90,
          bedtimeAlert: true,
          bedtimeAlertAdvanceMinutes: 45,
          soundEffects: true
        }
      };
    }
    return {
      username: row.username,
      age: row.age,
      preferredWakeTime: row.preferred_wake_time,
      targetSleepGoal: row.target_sleep_goal,
      avatarUrl: row.avatar_url,
      notifications: JSON.parse(row.notifications || '{}')
    };
  } else {
    return memoryStore.profile || {
      username: 'Alex Morgan',
      age: 28,
      preferredWakeTime: '06:30',
      targetSleepGoal: 8.0,
      avatarUrl: '',
      notifications: {
        breakReminders: true,
        breakIntervalMinutes: 90,
        bedtimeAlert: true,
        bedtimeAlertAdvanceMinutes: 45,
        soundEffects: true
      }
    };
  }
}

export function updateProfile(data) {
  const current = getProfile();
  const username = (data.username !== undefined ? data.username : current.username).trim();
  const age = data.age !== undefined ? parseInt(data.age, 10) : current.age;
  const preferredWakeTime = data.preferredWakeTime || current.preferredWakeTime;
  const targetSleepGoal = 8.0; // Clinical cap
  const avatarUrl = data.avatarUrl !== undefined ? data.avatarUrl : current.avatarUrl;
  const notifications = data.notifications ? { ...current.notifications, ...data.notifications } : current.notifications;
  const updatedAt = new Date().toISOString();

  if (useNodeSqlite && dbInstance) {
    dbInstance.prepare(`
      INSERT OR REPLACE INTO profile (id, username, age, preferred_wake_time, target_sleep_goal, avatar_url, notifications, updated_at)
      VALUES (1, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      username,
      age,
      preferredWakeTime,
      targetSleepGoal,
      avatarUrl,
      JSON.stringify(notifications),
      updatedAt
    );
  } else {
    memoryStore.profile = {
      id: 1,
      username,
      age,
      preferred_wake_time: preferredWakeTime,
      target_sleep_goal: targetSleepGoal,
      avatar_url: avatarUrl,
      notifications,
      updated_at: updatedAt
    };
    saveJsonStore();
  }

  return getProfile();
}

// -------------------------------------------------------------
// LOGS REPOSITORY METHODS
// -------------------------------------------------------------
export function getAllLogs() {
  if (useNodeSqlite && dbInstance) {
    const rows = dbInstance.prepare('SELECT * FROM logs ORDER BY date ASC').all();
    return rows.map(r => ({
      id: r.id,
      date: r.date,
      timestamp: r.timestamp,
      workingHours: r.working_hours,
      sleepHours: r.sleep_hours,
      sleepQuality: r.sleep_quality,
      fatigueLevel: r.fatigue_level,
      mood: r.mood,
      predictedStressScore: r.predicted_stress_score,
      stressTier: r.stress_tier,
      stressDrivers: JSON.parse(r.stress_drivers || '[]'),
      sleepAnalysis: JSON.parse(r.sleep_analysis || '{}'),
      activities: JSON.parse(r.activities || '{}'),
      notes: r.notes || ''
    }));
  } else {
    return [...memoryStore.logs].sort((a,b) => a.date.localeCompare(b.date));
  }
}

export function getLogByDate(date) {
  if (useNodeSqlite && dbInstance) {
    const r = dbInstance.prepare('SELECT * FROM logs WHERE date = ?').get(date);
    if (!r) return null;
    return {
      id: r.id,
      date: r.date,
      timestamp: r.timestamp,
      workingHours: r.working_hours,
      sleepHours: r.sleep_hours,
      sleepQuality: r.sleep_quality,
      fatigueLevel: r.fatigue_level,
      mood: r.mood,
      predictedStressScore: r.predicted_stress_score,
      stressTier: r.stress_tier,
      stressDrivers: JSON.parse(r.stress_drivers || '[]'),
      sleepAnalysis: JSON.parse(r.sleep_analysis || '{}'),
      activities: JSON.parse(r.activities || '{}'),
      notes: r.notes || ''
    };
  } else {
    return memoryStore.logs.find(l => l.date === date) || null;
  }
}

export function saveLog(log) {
  const id = log.id || `log-${log.date}`;
  const now = new Date().toISOString();

  if (useNodeSqlite && dbInstance) {
    dbInstance.prepare(`
      INSERT OR REPLACE INTO logs (
        id, date, timestamp, working_hours, sleep_hours, sleep_quality, fatigue_level,
        mood, predicted_stress_score, stress_tier, stress_drivers, sleep_analysis,
        activities, notes, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      log.date,
      log.timestamp || Date.now(),
      log.workingHours,
      log.sleepHours,
      log.sleepQuality,
      log.fatigueLevel,
      log.mood || 'neutral',
      log.predictedStressScore,
      log.stressTier,
      JSON.stringify(log.stressDrivers || []),
      JSON.stringify(log.sleepAnalysis || {}),
      JSON.stringify(log.activities || {}),
      log.notes || '',
      now
    );
  } else {
    const idx = memoryStore.logs.findIndex(l => l.date === log.date);
    const item = { ...log, id };
    if (idx >= 0) memoryStore.logs[idx] = item;
    else memoryStore.logs.push(item);
    saveJsonStore();
  }

  return getLogByDate(log.date);
}

export function deleteLog(idOrDate) {
  if (useNodeSqlite && dbInstance) {
    dbInstance.prepare('DELETE FROM logs WHERE id = ? OR date = ?').run(idOrDate, idOrDate);
  } else {
    memoryStore.logs = memoryStore.logs.filter(l => l.id !== idOrDate && l.date !== idOrDate);
    saveJsonStore();
  }
  return true;
}

export function wipeAllData() {
  if (useNodeSqlite && dbInstance) {
    dbInstance.exec('DELETE FROM logs; DELETE FROM profile;');
  } else {
    memoryStore = { profile: null, logs: [] };
    saveJsonStore();
  }
  return true;
}

// Run initial seed immediately upon module import
seedIfEmpty();
