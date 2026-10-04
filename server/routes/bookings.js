const express = require('express');
const auth = require('../middleware/auth');
const Booking = require('../models/Booking');
const Seat = require('../models/Seat');
const Settings = require('../models/Settings');
const { generateQRToken, generateQRImage } = require('../utils/qr');
const notify = require('../utils/notify');

const router = express.Router();

// POST /api/bookings — create a booking
router.post('/', auth, async (req, res, next) => {
  try {
    // Only students can book seats — admin and staff cannot
    if (['admin', 'staff'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Seat booking is only available for students.' });
    }

    const { seatId } = req.body;
    const user = req.user;
    const settings = await Settings.getSettings();

    // 1. (Penalty block logic removed)

    // 2. Check if seat exists and is not blocked
    const seat = await Seat.findById(seatId);
    if (!seat) return res.status(404).json({ message: 'Seat not found' });
    if (seat.isBlocked) return res.status(400).json({ message: `Seat ${seat.seatCode} is blocked: ${seat.blockReason || 'maintenance'}` });

    // 3. Check within library hours
    const now = new Date();
    const [oh, om] = (settings.openingTime || '08:00').split(':').map(Number);
    const [ch, cm] = (settings.closingTime || '20:00').split(':').map(Number);
    const currentMin = now.getHours() * 60 + now.getMinutes();
    const openMin = oh * 60 + om;
    const closeMin = ch * 60 + cm;

    if (currentMin < openMin || currentMin >= closeMin) {
      return res.status(400).json({ message: `Library is currently closed. Hours are ${settings.openingTime} to ${settings.closingTime}` });
    }

    // 4. Check if user already has an active booking
    const activeBooking = await Booking.findOne({
      user: user._id,
      status: { $in: ['booked', 'checked_in'] }
    });
    
    if (activeBooking) {
      return res.status(400).json({ message: 'You already have an active seat booking. Please check out before booking another.' });
    }

    // 5. Create booking (race-safe via unique partial index on seat)
    const booking = new Booking({
      user: user._id,
      seat: seatId,
      status: 'booked'
    });

    try {
      await booking.save();
    } catch (err) {
      if (err.code === 11000) {
        return res.status(409).json({ message: 'This seat was just taken! Please try another seat.' });
      }
      throw err;
    }

    // Generate QR token AFTER saving (so _id is available)
    booking.qrToken = generateQRToken(booking);
    await booking.save();

    // Populate seat for response
    await booking.populate('seat');

    // Notify
    await notify(
      user._id,
      'Booking Confirmed! ✓',
      `Seat ${seat.seatCode} reserved. Don't forget to check in within 15 minutes!`,
      'booking'
    );

    res.status(201).json({
      message: 'Booking confirmed!',
      booking
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/bookings/mine — student's bookings
router.get('/mine', auth, async (req, res, next) => {
  try {
    const bookings = await Booking.find({ user: req.user._id })
      .populate('seat')
      .sort({ date: -1, startTime: -1 })
      .lean();

    res.json({ bookings });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/bookings/:id — cancel booking
router.delete('/:id', auth, async (req, res, next) => {
  try {
    const booking = await Booking.findOne({ _id: req.params.id, user: req.user._id });
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    if (booking.status !== 'booked') {
      return res.status(400).json({ message: 'Only booked (unchecked-in) bookings can be cancelled' });
    }

    // Enforce 2-minute cancel window
    const CANCEL_WINDOW_MS = 2 * 60 * 1000; // 2 minutes
    const elapsed = Date.now() - new Date(booking.createdAt).getTime();
    if (elapsed > CANCEL_WINDOW_MS) {
      return res.status(403).json({
        message: 'Cancel window has expired. Bookings can only be cancelled within 2 minutes of booking.'
      });
    }

    const settings = await Settings.getSettings();
    const startDate = new Date(`${booking.date}T${booking.startTime}:00`);
    const now = new Date();
    const minutesUntilStart = (startDate - now) / 60000;

    booking.status = 'cancelled';
    await booking.save();

    // Late cancellation (under 15 min) penalty removed

    await notify(req.user._id, 'Booking Cancelled', `Your booking for seat ${booking.date} has been cancelled.`, 'booking');

    res.json({ message: 'Booking cancelled' });
  } catch (err) {
    next(err);
  }
});

// POST /api/bookings/:id/checkout — early checkout
router.post('/:id/checkout', auth, async (req, res, next) => {
  try {
    const booking = await Booking.findOne({ _id: req.params.id, user: req.user._id });
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    if (booking.status !== 'checked_in') {
      return res.status(400).json({ message: 'Only checked-in bookings can be checked out' });
    }

    booking.status = 'completed';
    booking.checkedOutAt = new Date();
    await booking.save();

    await notify(req.user._id, 'Checked Out', 'You have checked out. Your seat is now free.', 'booking');

    res.json({ message: 'Checked out successfully. Seat is now free!' });
  } catch (err) {
    next(err);
  }
});

// GET /api/bookings/:id/qr — get QR code image
router.get('/:id/qr', auth, async (req, res, next) => {
  try {
    const booking = await Booking.findOne({ _id: req.params.id, user: req.user._id });
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    if (booking.status !== 'booked') {
      return res.status(400).json({ message: 'QR is only available for active bookings' });
    }

    const qrImage = await generateQRImage(booking.qrToken);
    res.json({ qrImage, qrToken: booking.qrToken });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
