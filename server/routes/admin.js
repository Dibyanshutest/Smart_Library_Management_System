const express = require('express');
const auth = require('../middleware/auth');
const authorize = require('../middleware/role');
const Settings = require('../models/Settings');
const User = require('../models/User');

const router = express.Router();

// GET /api/admin/settings (admin only)
router.get('/settings', auth, authorize('admin'), async (req, res, next) => {
  try {
    const settings = await Settings.getSettings();
    res.json({ settings });
  } catch (err) {
    next(err);
  }
});

// PUT /api/admin/settings (admin only)
router.put('/settings', auth, authorize('admin'), async (req, res, next) => {
  try {
    const settings = await Settings.findOneAndUpdate(
      {},
      req.body,
      { new: true, runValidators: true }
    );
    res.json({ message: 'Settings updated', settings });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/users (admin only)
router.get('/users', auth, authorize('admin'), async (req, res, next) => {
  try {
    const users = await User.find()
      .select('-password')
      .sort({ createdAt: -1 })
      .lean();
    res.json({ users });
  } catch (err) {
    next(err);
  }
});

// PUT /api/admin/users/:id/role (admin only)
router.put('/users/:id/role', auth, authorize('admin'), async (req, res, next) => {
  try {
    const { role } = req.body;
    if (!['student', 'staff', 'admin'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role' });
    }
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true, runValidators: true }
    ).select('-password');
    
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ message: 'User role updated', user });
  } catch (err) {
    next(err);
  }
});

// PUT /api/admin/users/:id/unblock (admin only)
router.put('/users/:id/unblock', auth, authorize('admin'), async (req, res, next) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { blockedUntil: null, penaltyPoints: 0 },
      { new: true }
    ).select('-password');
    
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ message: 'User unblocked and penalties reset', user });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
