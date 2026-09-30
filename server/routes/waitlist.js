const express = require('express');
const auth = require('../middleware/auth');
const Waitlist = require('../models/Waitlist');
const Book = require('../models/Book');
const notify = require('../utils/notify');

const router = express.Router();

// POST /api/waitlist/:bookId — join waitlist
router.post('/:bookId', auth, async (req, res, next) => {
  try {
    const book = await Book.findById(req.params.bookId);
    if (!book) return res.status(404).json({ message: 'Book not found' });

    if (book.availableCopies > 0) {
      return res.status(400).json({ message: 'Book is available — you can request it directly!' });
    }

    try {
      const entry = await Waitlist.create({
        user: req.user._id,
        book: req.params.bookId
      });
      await notify(req.user._id, 'Waitlisted', `You've been added to the waitlist for "${book.title}". You'll be notified when it's available.`, 'borrow');
      res.status(201).json({ message: 'Added to waitlist', entry });
    } catch (err) {
      if (err.code === 11000) {
        return res.status(409).json({ message: 'You are already on the waitlist for this book' });
      }
      throw err;
    }
  } catch (err) {
    next(err);
  }
});

// DELETE /api/waitlist/:bookId — leave waitlist
router.delete('/:bookId', auth, async (req, res, next) => {
  try {
    const result = await Waitlist.findOneAndDelete({
      user: req.user._id,
      book: req.params.bookId
    });
    if (!result) return res.status(404).json({ message: 'Waitlist entry not found' });
    res.json({ message: 'Removed from waitlist' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
