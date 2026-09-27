import express from 'express';
import { getAllLogs, getLogByDate, saveLog, deleteLog, getProfile } from '../db.js';
import { calculateStress } from '../engine.js';

const router = express.Router();

// GET /api/logs
router.get('/', (req, res) => {
  try {
    const logs = getAllLogs();
    res.json({ success: true, count: logs.length, logs });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/logs/today
router.get('/today', (req, res) => {
  try {
    const todayStr = new Date().toISOString().split('T')[0];
    const log = getLogByDate(todayStr);
    const all = getAllLogs();
    res.json({
      success: true,
      todayStr,
      log: log || (all.length > 0 ? all[all.length - 1] : null)
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/logs
router.post('/', (req, res) => {
  try {
    const body = req.body;
    const date = body.date || new Date().toISOString().split('T')[0];
    const profile = getProfile();

    const workingHours = parseFloat(body.workingHours) || 8.0;
    const sleepHours = parseFloat(body.sleepHours) || 7.0;
    const sleepQuality = parseInt(body.sleepQuality, 10) || 4;
    const fatigueLevel = parseInt(body.fatigueLevel, 10) || 4;
    const mood = body.mood || 'calm';

    const activities = body.activities || {
      screenTimeHours: parseFloat(body.screenTimeHours) || 7.0,
      breaksTaken: parseInt(body.breaksTaken, 10) || 3,
      waterGlasses: parseInt(body.waterGlasses, 10) || 6,
      caffeineCups: parseInt(body.caffeineCups, 10) || 2,
      physicalActivityMinutes: parseInt(body.physicalActivityMinutes, 10) || 30
    };

    // Calculate clinical stress and sleep analysis
    const analysis = calculateStress({
      workingHours,
      sleepHours,
      sleepQuality,
      fatigueLevel,
      mood,
      screenTimeHours: activities.screenTimeHours,
      breaksTaken: activities.breaksTaken,
      waterGlasses: activities.waterGlasses,
      caffeineCups: activities.caffeineCups,
      physicalActivityMinutes: activities.physicalActivityMinutes,
      preferredWakeTime: profile.preferredWakeTime
    });

    const newLog = {
      id: body.id || `log-${date}`,
      date,
      timestamp: body.timestamp || Date.now(),
      workingHours,
      sleepHours,
      sleepQuality,
      fatigueLevel,
      mood,
      predictedStressScore: analysis.score,
      stressTier: analysis.tier,
      stressDrivers: analysis.drivers,
      sleepAnalysis: analysis.sleepData,
      activities,
      notes: body.notes || ''
    };

    const saved = saveLog(newLog);
    res.json({ success: true, log: saved });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/logs/quick
// Atomically log micro actions (+water, +break, +stretch, +walk)
router.post('/quick', (req, res) => {
  try {
    const { action } = req.body; // 'water', 'break', 'stretch', 'walk'
    const todayStr = new Date().toISOString().split('T')[0];
    const existing = getLogByDate(todayStr) || {
      id: `log-${todayStr}`,
      date: todayStr,
      timestamp: Date.now(),
      workingHours: 8.0,
      sleepHours: 7.2,
      sleepQuality: 4,
      fatigueLevel: 4,
      mood: 'calm',
      activities: {
        screenTimeHours: 7.0,
        breaksTaken: 3,
        waterGlasses: 6,
        caffeineCups: 2,
        physicalActivityMinutes: 30
      },
      notes: ''
    };

    const acts = { ...existing.activities };
    let message = '';

    if (action === 'water') {
      acts.waterGlasses = (acts.waterGlasses || 0) + 1;
      message = 'Logged +1 glass of water (8oz)';
    } else if (action === 'break') {
      acts.breaksTaken = (acts.breaksTaken || 0) + 1;
      message = 'Logged +1 mindful break (5m)';
    } else if (action === 'stretch') {
      acts.physicalActivityMinutes = (acts.physicalActivityMinutes || 0) + 5;
      message = 'Logged +5 mins mobility stretch';
    } else if (action === 'walk') {
      acts.physicalActivityMinutes = (acts.physicalActivityMinutes || 0) + 10;
      message = 'Logged +10 mins cadence walk';
    } else {
      return res.status(400).json({ success: false, error: 'Invalid quick action type' });
    }

    const profile = getProfile();
    const analysis = calculateStress({
      workingHours: existing.workingHours,
      sleepHours: existing.sleepHours,
      sleepQuality: existing.sleepQuality,
      fatigueLevel: existing.fatigueLevel,
      mood: existing.mood,
      screenTimeHours: acts.screenTimeHours,
      breaksTaken: acts.breaksTaken,
      waterGlasses: acts.waterGlasses,
      caffeineCups: acts.caffeineCups,
      physicalActivityMinutes: acts.physicalActivityMinutes,
      preferredWakeTime: profile.preferredWakeTime
    });

    const updated = saveLog({
      ...existing,
      activities: acts,
      predictedStressScore: analysis.score,
      stressTier: analysis.tier,
      stressDrivers: analysis.drivers,
      sleepAnalysis: analysis.sleepData
    });

    res.json({ success: true, message, log: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/logs/:id
router.delete('/:id', (req, res) => {
  try {
    deleteLog(req.params.id);
    res.json({ success: true, message: `Log ${req.params.id} deleted successfully` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
