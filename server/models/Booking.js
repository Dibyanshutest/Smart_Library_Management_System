const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  seat: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Seat',
    required: true
  },
  date: {
    type: String // YYYY-MM-DD
  },
  startTime: {
    type: String // HH:MM
  },
  endTime: {
    type: String // HH:MM
  },
  status: {
    type: String,
    enum: ['booked', 'checked_in', 'completed', 'cancelled', 'expired'],
    default: 'booked'
  },
  qrToken: {
    type: String
  },
  qrUsed: {
    type: Boolean,
    default: false
  },
  checkedInAt: {
    type: Date,
    default: null
  },
  checkedOutAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Partial unique index: prevent double-booking for active statuses on the same seat
bookingSchema.index(
  { seat: 1 },
  {
    unique: true,
    partialFilterExpression: {
      status: { $in: ['booked', 'checked_in'] }
    }
  }
);

// Index for user queries
bookingSchema.index({ user: 1, date: 1 });

module.exports = mongoose.model('Booking', bookingSchema);
