const mongoose = require('mongoose');
const Booking = require('../models/Booking');

async function fix() {
  await mongoose.connect('mongodb://localhost:27017/smart_library');
  console.log('Connected');
  
  try {
    await Booking.collection.dropIndex('seat_1_date_1_startTime_1');
    console.log('Dropped old index');
  } catch (e) {
    console.log('Old index not found or already dropped', e.message);
  }

  await Booking.syncIndexes();
  console.log('Synced new indexes');
  process.exit(0);
}

fix();
