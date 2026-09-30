const express = require('express');
const auth = require('../middleware/auth');
const authorize = require('../middleware/role');
const { verifyQRToken } = require('../utils/qr');
const Booking = require('../models/Booking');
const User = require('../models/User');
const Seat = require('../models/Seat');
const Settings = require('../models/Settings');
const notify = require('../utils/notify');

const router = express.Router();

// POST /api/scan/checkin — staff/admin scan QR to check in a student
router.post('/checkin', auth, authorize('staff', 'admin'), async (req, res, next) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ message: 'QR token is required' });
    }

    // 1. Verify token signature
    let decoded;
    try {
      decoded = verifyQRToken(token);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(400).json({ message: 'QR code has expired', success: false });
      }
      return res.status(400).json({ message: 'Invalid QR code', success: false });
    }

    // 2. Find the booking
    const booking = await Booking.findById(decoded.bookingId)
      .populate('seat')
      .populate('user', 'name email studentId');

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found', success: false });
    }

    // 3. Handle check-out (second scan of checked-in booking)
    if (booking.status === 'checked_in') {
      booking.status = 'completed';
      booking.checkedOutAt = new Date();
      await booking.save();

      await notify(booking.user._id, 'Checked Out', `You have checked out from seat ${booking.seat.seatCode}.`, 'booking');

      return res.json({
        success: true,
        action: 'checkout',
        message: `${booking.user.name} checked out from ${booking.seat.seatCode}`,
        student: booking.user,
        seat: booking.seat,
        booking
      });
    }

    // 4. Must be in 'booked' status for check-in
    if (booking.status !== 'booked') {
      return res.status(400).json({
        message: `Booking status is "${booking.status}" — cannot check in`,
        success: false
      });
    }

    // 5. Check single-use
    if (booking.qrUsed) {
      return res.status(400).json({ message: 'QR code has already been used', success: false });
    }

    // 6. Time window check: [createdAt, createdAt + graceMin]
    const settings = await Settings.getSettings();
    const graceMin = settings.checkinGraceMin || 15;
    const windowEnd = new Date(booking.createdAt.getTime() + graceMin * 60000);
    const now = new Date();

    if (now > windowEnd) {
      // Auto-expire it immediately if the cron job hasn't caught it yet
      booking.status = 'expired';
      await booking.save();
      return res.status(400).json({
        message: 'Check-in window of 15 minutes has passed. Your booking has expired.',
        success: false
      });
    }

    // 7. Check in!
    booking.status = 'checked_in';
    booking.qrUsed = true;
    booking.checkedInAt = now;
    await booking.save();

    await notify(booking.user._id, 'Checked In! ✓', `Welcome! You're now at seat ${booking.seat.seatCode}.`, 'booking');

    res.json({
      success: true,
      action: 'checkin',
      message: `${booking.user.name} checked in at ${booking.seat.seatCode}`,
      student: booking.user,
      seat: booking.seat,
      booking
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
