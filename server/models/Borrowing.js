const mongoose = require('mongoose');

const borrowingSchema = new mongoose.Schema({
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
  status: {
    type: String,
    enum: ['requested', 'approved', 'issued', 'returned', 'rejected', 'cancelled', 'overdue'],
    default: 'requested'
  },
  requestedAt: {
    type: Date,
    default: Date.now
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  approvedAt: {
    type: Date,
    default: null
  },
  pickupDeadline: {
    type: Date,
    default: null
  },
  issuedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  issuedAt: {
    type: Date,
    default: null
  },
  dueDate: {
    type: Date,
    default: null
  },
  returnedAt: {
    type: Date,
    default: null
  },
  renewCount: {
    type: Number,
    default: 0
  },
  fine: {
    type: Number,
    default: 0,
    min: 0
  },
  finePaid: {
    type: Boolean,
    default: false
  },
  staffNote: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

// Index for user queries
borrowingSchema.index({ user: 1, status: 1 });
borrowingSchema.index({ status: 1 });

module.exports = mongoose.model('Borrowing', borrowingSchema);
