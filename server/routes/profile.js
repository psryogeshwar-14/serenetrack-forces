import express from 'express';
import { getProfile, updateProfile } from '../db.js';

const router = express.Router();

// GET /api/profile
router.get('/', (req, res) => {
  try {
    const profile = getProfile();
    res.json({ success: true, profile });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/profile
router.put('/', (req, res) => {
  try {
    const { username, age, preferredWakeTime, avatarUrl, notifications } = req.body;

    if (age !== undefined) {
      const parsedAge = parseInt(age, 10);
      if (isNaN(parsedAge) || parsedAge < 18 || parsedAge > 62) {
        return res.status(400).json({
          success: false,
          error: 'Age must be between 18 and 62 years according to clinical parameters.'
        });
      }
    }

    const updated = updateProfile({
      username,
      age,
      preferredWakeTime,
      avatarUrl,
      notifications
    });

    res.json({ success: true, profile: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
