const express = require('express');
const auth = require('../middleware/auth');
const authorize = require('../middleware/role');
const Borrowing = require('../models/Borrowing');
const Book = require('../models/Book');
const User = require('../models/User');
const Waitlist = require('../models/Waitlist');
const Settings = require('../models/Settings');
const notify = require('../utils/notify');
const { calculateFine } = require('../utils/fines');

const router = express.Router();

// POST /api/borrowings/request — student requests a book
router.post('/request', auth, async (req, res, next) => {
  try {
    const { bookId } = req.body;
    const user = req.user;
    const settings = await Settings.getSettings();

    // Check unpaid fines
    if (user.unpaidFines > 0) {
      return res.status(400).json({ message: `You have ₹${user.unpaidFines} in unpaid fines. Please pay them first.` });
    }

    // Check borrowing limit
    const activeCount = await Borrowing.countDocuments({
      user: user._id,
      status: { $in: ['requested', 'approved', 'issued', 'overdue'] }
    });

    if (activeCount >= (settings.maxBooks || 3)) {
      return res.status(400).json({ message: `Maximum ${settings.maxBooks || 3} active borrowings allowed.` });
    }

    // Check book availability
    const book = await Book.findById(bookId);
    if (!book) return res.status(404).json({ message: 'Book not found' });
    if (book.availableCopies <= 0) {
      return res.status(400).json({ message: 'No copies available. You can join the waitlist.' });
    }

    // Check if already borrowing this book
    const existing = await Borrowing.findOne({
      user: user._id,
      book: bookId,
      status: { $in: ['requested', 'approved', 'issued', 'overdue'] }
    });
    if (existing) {
      return res.status(400).json({ message: 'You already have an active request or borrowing for this book.' });
    }

    const borrowing = await Borrowing.create({
      user: user._id,
      book: bookId,
      status: 'requested',
      requestedAt: new Date()
    });

    await notify(user._id, 'Book Requested', `Your request for "${book.title}" has been submitted. Staff will review it.`, 'borrow');

    res.status(201).json({ message: 'Book request submitted', borrowing });
  } catch (err) {
    next(err);
  }
});

// GET /api/borrowings/mine — student's borrowings
router.get('/mine', auth, async (req, res, next) => {
  try {
    const borrowings = await Borrowing.find({ user: req.user._id })
      .populate('book')
      .populate('approvedBy', 'name')
      .populate('issuedBy', 'name')
      .sort({ createdAt: -1 })
      .lean();

    res.json({ borrowings });
  } catch (err) {
    next(err);
  }
});

// POST /api/borrowings/:id/cancel — student cancels request
router.post('/:id/cancel', auth, async (req, res, next) => {
  try {
    const borrowing = await Borrowing.findOne({ _id: req.params.id, user: req.user._id }).populate('book');
    if (!borrowing) return res.status(404).json({ message: 'Borrowing not found' });

    if (!['requested', 'approved'].includes(borrowing.status)) {
      return res.status(400).json({ message: 'Can only cancel requested or approved borrowings' });
    }

    // If approved, restore the copy
    if (borrowing.status === 'approved' && borrowing.book) {
      await Book.findByIdAndUpdate(borrowing.book._id, { $inc: { availableCopies: 1 } });
    }

    borrowing.status = 'cancelled';
    await borrowing.save();

    res.json({ message: 'Borrowing cancelled' });
  } catch (err) {
    next(err);
  }
});

// POST /api/borrowings/:id/renew — extend due date
router.post('/:id/renew', auth, async (req, res, next) => {
  try {
    const settings = await Settings.getSettings();
    const borrowing = await Borrowing.findOne({ _id: req.params.id, user: req.user._id }).populate('book');
    if (!borrowing) return res.status(404).json({ message: 'Borrowing not found' });

    if (borrowing.status !== 'issued') {
      return res.status(400).json({ message: 'Can only renew issued books' });
    }

    if (borrowing.renewCount >= (settings.maxRenewals || 2)) {
      return res.status(400).json({ message: `Maximum ${settings.maxRenewals || 2} renewals allowed` });
    }

    // Check if overdue
    if (new Date() > new Date(borrowing.dueDate)) {
      return res.status(400).json({ message: 'Cannot renew an overdue book. Please return it.' });
    }

    // Check if anyone is on the waitlist
    const waitlisted = await Waitlist.countDocuments({ book: borrowing.book._id });
    if (waitlisted > 0) {
      return res.status(400).json({ message: 'Cannot renew — other students are waiting for this book.' });
    }

    // Extend by 7 days
    const newDue = new Date(borrowing.dueDate);
    newDue.setDate(newDue.getDate() + 7);
    borrowing.dueDate = newDue;
    borrowing.renewCount += 1;
    await borrowing.save();

    await notify(req.user._id, 'Book Renewed', `"${borrowing.book.title}" renewed. New due date: ${newDue.toLocaleDateString()}.`, 'borrow');

    res.json({ message: 'Book renewed successfully', borrowing });
  } catch (err) {
    next(err);
  }
});

// ─── STAFF ROUTES ───

// GET /api/borrowings?status= — staff views all borrowings
router.get('/', auth, authorize('staff', 'admin'), async (req, res, next) => {
  try {
    const query = {};
    if (req.query.status) {
      query.status = req.query.status;
    }

    const borrowings = await Borrowing.find(query)
      .populate('book')
      .populate('user', 'name email studentId')
      .populate('approvedBy', 'name')
      .populate('issuedBy', 'name')
      .sort({ createdAt: -1 })
      .lean();

    res.json({ borrowings });
  } catch (err) {
    next(err);
  }
});

// POST /api/borrowings/:id/approve
router.post('/:id/approve', auth, authorize('staff', 'admin'), async (req, res, next) => {
  try {
    const settings = await Settings.getSettings();
    const borrowing = await Borrowing.findById(req.params.id).populate('book');
    if (!borrowing) return res.status(404).json({ message: 'Borrowing not found' });
    if (borrowing.status !== 'requested') {
      return res.status(400).json({ message: 'Can only approve requested borrowings' });
    }

    // Decrease available copies (hold)
    const book = await Book.findById(borrowing.book._id);
    if (book.availableCopies <= 0) {
      return res.status(400).json({ message: 'No copies available to approve' });
    }
    book.availableCopies -= 1;
    await book.save();

    borrowing.status = 'approved';
    borrowing.approvedBy = req.user._id;
    borrowing.approvedAt = new Date();
    borrowing.pickupDeadline = new Date(Date.now() + (settings.pickupWindowHours || 24) * 3600000);
    borrowing.staffNote = req.body.note || '';
    await borrowing.save();

    await notify(borrowing.user, 'Book Approved! 📗', `Your request for "${book.title}" has been approved. Pick it up within ${settings.pickupWindowHours || 24} hours.`, 'borrow');

    res.json({ message: 'Borrowing approved', borrowing });
  } catch (err) {
    next(err);
  }
});

// POST /api/borrowings/:id/reject
router.post('/:id/reject', auth, authorize('staff', 'admin'), async (req, res, next) => {
  try {
    const borrowing = await Borrowing.findById(req.params.id).populate('book');
    if (!borrowing) return res.status(404).json({ message: 'Borrowing not found' });
    if (borrowing.status !== 'requested') {
      return res.status(400).json({ message: 'Can only reject requested borrowings' });
    }

    borrowing.status = 'rejected';
    borrowing.staffNote = req.body.note || '';
    await borrowing.save();

    await notify(borrowing.user, 'Request Rejected', `Your request for "${borrowing.book.title}" was rejected. ${req.body.note || ''}`, 'borrow');

    res.json({ message: 'Borrowing rejected', borrowing });
  } catch (err) {
    next(err);
  }
});

// POST /api/borrowings/:id/issue — staff confirms at desk
router.post('/:id/issue', auth, authorize('staff', 'admin'), async (req, res, next) => {
  try {
    const settings = await Settings.getSettings();
    const borrowing = await Borrowing.findById(req.params.id).populate('book');
    if (!borrowing) return res.status(404).json({ message: 'Borrowing not found' });
    if (borrowing.status !== 'approved') {
      return res.status(400).json({ message: 'Can only issue approved borrowings' });
    }

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + (settings.borrowDays || 14));

    borrowing.status = 'issued';
    borrowing.issuedBy = req.user._id;
    borrowing.issuedAt = new Date();
    borrowing.dueDate = dueDate;
    await borrowing.save();

    await notify(borrowing.user, 'Book Issued! 📖', `"${borrowing.book.title}" issued. Due date: ${dueDate.toLocaleDateString()}.`, 'borrow');

    res.json({ message: 'Book issued', borrowing });
  } catch (err) {
    next(err);
  }
});

// POST /api/borrowings/:id/return
router.post('/:id/return', auth, authorize('staff', 'admin'), async (req, res, next) => {
  try {
    const settings = await Settings.getSettings();
    const borrowing = await Borrowing.findById(req.params.id).populate('book');
    if (!borrowing) return res.status(404).json({ message: 'Borrowing not found' });
    if (!['issued', 'overdue'].includes(borrowing.status)) {
      return res.status(400).json({ message: 'Can only return issued or overdue books' });
    }

    borrowing.status = 'returned';
    borrowing.returnedAt = new Date();

    // Calculate fine if overdue
    if (borrowing.dueDate && new Date() > new Date(borrowing.dueDate)) {
      borrowing.fine = calculateFine(borrowing.dueDate, settings.finePerDay || 2);
    }

    await borrowing.save();

    // Restore copy
    await Book.findByIdAndUpdate(borrowing.book._id, { $inc: { availableCopies: 1 } });

    // Update user fines
    if (borrowing.fine > 0) {
      await User.findByIdAndUpdate(borrowing.user, { $inc: { unpaidFines: borrowing.fine } });
      await notify(borrowing.user, 'Book Returned (Fine)', `"${borrowing.book.title}" returned. Fine: ₹${borrowing.fine}. Please pay at the desk.`, 'fine');
    } else {
      await notify(borrowing.user, 'Book Returned ✓', `"${borrowing.book.title}" returned successfully. Thank you!`, 'borrow');
    }

    // Notify first waitlisted user
    const firstWaiting = await Waitlist.findOne({ book: borrowing.book._id, notified: false }).sort({ createdAt: 1 });
    if (firstWaiting) {
      firstWaiting.notified = true;
      await firstWaiting.save();
      await notify(firstWaiting.user, 'Book Available! 📚', `"${borrowing.book.title}" is now available! You have 24 hours priority to request it.`, 'borrow');
    }

    res.json({ message: 'Book returned', borrowing });
  } catch (err) {
    next(err);
  }
});

// POST /api/borrowings/:id/pay-fine — staff marks fine as paid
router.post('/:id/pay-fine', auth, authorize('staff', 'admin'), async (req, res, next) => {
  try {
    const borrowing = await Borrowing.findById(req.params.id);
    if (!borrowing) return res.status(404).json({ message: 'Borrowing not found' });
    if (borrowing.fine <= 0 || borrowing.finePaid) {
      return res.status(400).json({ message: 'No fine to pay or already paid' });
    }

    borrowing.finePaid = true;
    await borrowing.save();

    // Reduce user's unpaid fines
    await User.findByIdAndUpdate(borrowing.user, { $inc: { unpaidFines: -borrowing.fine } });

    await notify(borrowing.user, 'Fine Paid ✓', `Your fine of ₹${borrowing.fine} has been marked as paid.`, 'fine');

    res.json({ message: 'Fine marked as paid', borrowing });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
