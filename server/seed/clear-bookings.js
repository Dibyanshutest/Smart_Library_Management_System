const mongoose = require('mongoose');

async function fix() {
  await mongoose.connect('mongodb://localhost:27017/smart_library');
  const db = mongoose.connection.db;
  
  try {
    await db.collection('bookings').deleteMany({});
    console.log('Cleared all bookings to reset state.');
  } catch (e) {
    console.log('Error clearing bookings', e.message);
  }

  process.exit(0);
}

fix();
