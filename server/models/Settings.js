const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
  checkinGraceMin: {
    type: Number,
    default: 15
  },
  bookingCutoffMin: {
    type: Number,
    default: 15
  },
  borrowDays: {
    type: Number,
    default: 14
  },
  finePerDay: {
    type: Number,
    default: 2
  },
  maxBooks: {
    type: Number,
    default: 3
  },
  maxRenewals: {
    type: Number,
    default: 2
  },
  maxSeatHoursPerDay: {
    type: Number,
    default: 4
  },
  openingTime: {
    type: String,
    default: '08:00'
  },
  closingTime: {
    type: String,
    default: '20:00'
  },
  slotLengthMin: {
    type: Number,
    default: 60
  },
  pickupWindowHours: {
    type: Number,
    default: 24
  }
}, {
  timestamps: true
});

// Ensure only one settings document exists
settingsSchema.statics.getSettings = async function() {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create({});
  }
  return settings;
};

module.exports = mongoose.model('Settings', settingsSchema);
