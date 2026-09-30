const mongoose = require('mongoose');

const waitlistSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  book: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Book',
    required: true
  },
  notified: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// One waitlist entry per user per book
waitlistSchema.index({ user: 1, book: 1 }, { unique: true });

// Queue order
waitlistSchema.index({ book: 1, createdAt: 1 });

module.exports = mongoose.model('Waitlist', waitlistSchema);
