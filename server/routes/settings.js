const express = require('express');
const auth = require('../middleware/auth');
const Settings = require('../models/Settings');

const router = express.Router();

// GET /api/settings (Publicly readable by any authenticated user)
router.get('/', auth, async (req, res, next) => {
  try {
    const settings = await Settings.getSettings();
    res.json({ settings });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
