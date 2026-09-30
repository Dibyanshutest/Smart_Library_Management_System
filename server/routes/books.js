const express = require('express');
const auth = require('../middleware/auth');
const authorize = require('../middleware/role');
const Book = require('../models/Book');
const Borrowing = require('../models/Borrowing');

const router = express.Router();

// GET /api/books?search=&category=&available=&page=&limit=
router.get('/', auth, async (req, res, next) => {
  try {
    const { search, category, available, page = 1, limit = 20 } = req.query;
    const query = {};

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { author: { $regex: search, $options: 'i' } },
        { tags: { $regex: search, $options: 'i' } }
      ];
    }

    if (category && category !== 'all') {
      query.category = category;
    }

    if (available === 'true') {
      query.availableCopies = { $gt: 0 };
    }

    const total = await Book.countDocuments(query);
    const books = await Book.find(query)
      .sort({ title: 1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit))
      .lean();

    res.json({
      books,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit))
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/books/:id
router.get('/:id', auth, async (req, res, next) => {
  try {
    const book = await Book.findById(req.params.id).lean();
    if (!book) return res.status(404).json({ message: 'Book not found' });
    res.json({ book });
  } catch (err) {
    next(err);
  }
});

// GET /api/books/:id/recommendations — "also borrowed" aggregation
router.get('/:id/recommendations', auth, async (req, res, next) => {
  try {
    // Find users who borrowed this book
    const borrowers = await Borrowing.find({ book: req.params.id }).distinct('user');

    // Find other books those users borrowed (exclude current book)
    const otherBorrowings = await Borrowing.find({
      user: { $in: borrowers },
      book: { $ne: req.params.id }
    }).populate('book');

    // Count occurrences
    const bookCounts = {};
    otherBorrowings.forEach(b => {
      if (b.book) {
        const id = b.book._id.toString();
        if (!bookCounts[id]) bookCounts[id] = { book: b.book, count: 0 };
        bookCounts[id].count++;
      }
    });

    // Sort by count, take top 6
    const recommendations = Object.values(bookCounts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 6)
      .map(r => r.book);

    res.json({ recommendations });
  } catch (err) {
    next(err);
  }
});

// POST /api/books (staff/admin) — create book
router.post('/', auth, authorize('staff', 'admin'), async (req, res, next) => {
  try {
    const book = await Book.create(req.body);
    res.status(201).json({ message: 'Book added', book });
  } catch (err) {
    next(err);
  }
});

// PUT /api/books/:id (staff/admin) — update book
router.put('/:id', auth, authorize('staff', 'admin'), async (req, res, next) => {
  try {
    const book = await Book.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!book) return res.status(404).json({ message: 'Book not found' });
    res.json({ message: 'Book updated', book });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/books/:id (staff/admin)
router.delete('/:id', auth, authorize('staff', 'admin'), async (req, res, next) => {
  try {
    const book = await Book.findByIdAndDelete(req.params.id);
    if (!book) return res.status(404).json({ message: 'Book not found' });
    res.json({ message: 'Book deleted' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
