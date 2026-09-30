const express = require('express');
const auth = require('../middleware/auth');
const authorize = require('../middleware/role');
const BookSuggestion = require('../models/BookSuggestion');

const router = express.Router();

// GET /api/suggestions (admin only)
router.get('/', auth, authorize('admin'), async (req, res, next) => {
  try {
    const suggestions = await BookSuggestion.find()
      .populate('user', 'name email')
      .sort({ votes: -1, createdAt: -1 })
      .lean();
    res.json({ suggestions });
  } catch (err) {
    next(err);
  }
});

// POST /api/suggestions
router.post('/', auth, async (req, res, next) => {
  try {
    const suggestion = await BookSuggestion.create({
      ...req.body,
      user: req.user._id
    });
    res.status(201).json({ message: 'Suggestion submitted', suggestion });
  } catch (err) {
    next(err);
  }
});

// POST /api/suggestions/:id/vote
router.post('/:id/vote', auth, async (req, res, next) => {
  try {
    const suggestion = await BookSuggestion.findById(req.params.id);
    if (!suggestion) return res.status(404).json({ message: 'Suggestion not found' });

    suggestion.votes += 1;
    await suggestion.save();
    res.json({ message: 'Vote recorded', suggestion });
  } catch (err) {
    next(err);
  }
});

// PUT /api/suggestions/:id/status (admin only)
router.put('/:id/status', auth, authorize('admin'), async (req, res, next) => {
  try {
    const suggestion = await BookSuggestion.findByIdAndUpdate(
      req.params.id,
      { status: req.body.status, adminNote: req.body.adminNote },
      { new: true, runValidators: true }
    );
    if (!suggestion) return res.status(404).json({ message: 'Suggestion not found' });
    res.json({ message: 'Suggestion status updated', suggestion });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
