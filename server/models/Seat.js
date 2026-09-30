const mongoose = require('mongoose');

const seatSchema = new mongoose.Schema({
  seatCode: {
    type: String,
    required: [true, 'Seat code is required'],
    unique: true,
    trim: true,
    uppercase: true
  },
  zone: {
    type: String,
    required: [true, 'Zone is required'],
    enum: ['Silent', 'Group', 'Computer', 'Reading']
  },
  row: {
    type: Number,
    required: true
  },
  col: {
    type: Number,
    required: true
  },
  features: [{
    type: String,
    enum: ['power', 'window', 'quiet']
  }],
  isBlocked: {
    type: Boolean,
    default: false
  },
  blockReason: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Seat', seatSchema);
