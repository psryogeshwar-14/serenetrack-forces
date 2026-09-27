import express from 'express';
import { getProfile, updateProfile, getAllLogs, saveLog, wipeAllData } from '../db.js';

const router = express.Router();

// GET /api/backup/export
router.get('/export', (req, res) => {
  try {
    const profile = getProfile();
    const logs = getAllLogs();
    const payload = {
      app: 'SereneTrack',
      version: '1.1.0',
      exportDate: new Date().toISOString(),
      profile: {
        username: profile.username,
        avatarUrl: profile.avatarUrl,
        age: profile.age,
        preferredWakeTime: profile.preferredWakeTime,
        targetSleepGoal: 8.0,
        joinedDate: profile.joinedDate || '2026-09-01'
      },
      notifications: profile.notifications,
      privacy: {
        offlineModeOnly: false,
        autoSaveLocal: true,
        allowLocalExport: true,
        serverSyncEnabled: true
      },
      logs
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=serenetrack-backup-${new Date().toISOString().split('T')[0]}.json`);
    res.send(JSON.stringify(payload, null, 2));
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/backup/import
router.post('/import', (req, res) => {
  try {
    const backup = req.body;
    if (!backup || (!backup.profile && !Array.isArray(backup.logs))) {
      return res.status(400).json({ success: false, error: 'Invalid SereneTrack backup JSON format.' });
    }

    if (backup.profile) {
      updateProfile({
        username: backup.profile.username,
        age: backup.profile.age,
        preferredWakeTime: backup.profile.preferredWakeTime,
        avatarUrl: backup.profile.avatarUrl,
        notifications: backup.notifications
      });
    }

    let importedCount = 0;
    if (Array.isArray(backup.logs)) {
      for (const log of backup.logs) {
        if (log.date) {
          saveLog(log);
          importedCount++;
        }
      }
    }

    res.json({
      success: true,
      message: `Successfully imported ${importedCount} logs and profile preferences.`,
      profile: getProfile(),
      logsCount: getAllLogs().length
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/backup/wipe
router.post('/wipe', (req, res) => {
  try {
    wipeAllData();
    res.json({ success: true, message: 'All local server database tables wiped successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
