const express = require('express');
const auth = require('../middleware/auth');
const authorize = require('../middleware/role');
const Seat = require('../models/Seat');
const Booking = require('../models/Booking');
const User = require('../models/User');

const router = express.Router();

// GET /api/seats
// Returns all seats with current live status
router.get('/', auth, async (req, res, next) => {
  try {
    const seats = await Seat.find().sort({ zone: 1, row: 1, col: 1 }).lean();

    // Find all currently active bookings globally
    const bookings = await Booking.find({
      status: { $in: ['booked', 'checked_in'] }
    }).lean();

    const bookingMap = {};
    bookings.forEach(b => {
      bookingMap[b.seat.toString()] = b;
    });

    const userId = req.user._id.toString();

    const seatsWithStatus = seats.map(seat => {
      const seatId = seat._id.toString();
      let status = 'available';

      if (seat.isBlocked) {
        status = 'blocked';
      } else if (bookingMap[seatId]) {
        const booking = bookingMap[seatId];
        if (booking.user.toString() === userId) {
          status = 'mine';
        } else if (booking.status === 'checked_in') {
          status = 'occupied';
        } else {
          status = 'booked';
        }
      }

      const isFavorite = (req.user.favoriteSeats || []).some(
        fav => fav.toString() === seatId
      );

      return { ...seat, status, isFavorite };
    });

    res.json({ seats: seatsWithStatus });
  } catch (err) {
    next(err);
  }
});

// POST /api/seats (admin only) — create a seat
router.post('/', auth, authorize('admin'), async (req, res, next) => {
  try {
    const seat = await Seat.create(req.body);
    res.status(201).json({ message: 'Seat created', seat });
  } catch (err) {
    next(err);
  }
});

// PUT /api/seats/:id (admin only) — edit/block
router.put('/:id', auth, authorize('admin'), async (req, res, next) => {
  try {
    const seat = await Seat.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });
    if (!seat) return res.status(404).json({ message: 'Seat not found' });
    res.json({ message: 'Seat updated', seat });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/seats/:id (admin only)
router.delete('/:id', auth, authorize('admin'), async (req, res, next) => {
  try {
    const seat = await Seat.findByIdAndDelete(req.params.id);
    if (!seat) return res.status(404).json({ message: 'Seat not found' });
    res.json({ message: 'Seat deleted' });
  } catch (err) {
    next(err);
  }
});

// POST /api/seats/:id/favorite — toggle favorite
router.post('/:id/favorite', auth, async (req, res, next) => {
  try {
    const user = req.user;
    const seatId = req.params.id;
    const idx = user.favoriteSeats.indexOf(seatId);

    if (idx === -1) {
      user.favoriteSeats.push(seatId);
    } else {
      user.favoriteSeats.splice(idx, 1);
    }

    await user.save();
    res.json({
      message: idx === -1 ? 'Added to favorites' : 'Removed from favorites',
      favoriteSeats: user.favoriteSeats
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
