import express from 'express';
import { getAllLogs } from '../db.js';

const router = express.Router();

// GET /api/analytics/trends
router.get('/trends', (req, res) => {
  try {
    const all = getAllLogs();
    const sorted = [...all].sort((a,b) => a.date.localeCompare(b.date));
    const recent7 = sorted.slice(-7);

    if (recent7.length === 0) {
      return res.json({
        success: true,
        daysCount: 0,
        averageStress: 0,
        peakStress: 0,
        lowStress: 0,
        averageSleep: 0,
        totalSleepDeficit: 0,
        recentDays: []
      });
    }

    const scores = recent7.map(l => l.predictedStressScore || 0);
    const sleepList = recent7.map(l => l.sleepHours || 0);
    const deficitList = recent7.map(l => (l.sleepAnalysis && l.sleepAnalysis.deficit) ? l.sleepAnalysis.deficit : Math.max(0, 8.0 - (l.sleepHours || 0)));

    const avgStress = Math.round(scores.reduce((a,b) => a+b, 0) / scores.length);
    const peakStress = Math.max(...scores);
    const lowStress = Math.min(...scores);
    const avgSleep = parseFloat((sleepList.reduce((a,b) => a+b, 0) / sleepList.length).toFixed(1));
    const totalDeficit = parseFloat(deficitList.reduce((a,b) => a+b, 0).toFixed(1));

    res.json({
      success: true,
      daysCount: recent7.length,
      averageStress: avgStress,
      peakStress: peakStress,
      lowStress: lowStress,
      averageSleep: avgSleep,
      totalSleepDeficit: totalDeficit,
      recentDays: recent7
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
