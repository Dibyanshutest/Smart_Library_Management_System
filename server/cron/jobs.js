const cron = require('node-cron');
const Booking = require('../models/Booking');
const User = require('../models/User');
const Settings = require('../models/Settings');
const notify = require('../utils/notify');

/**
 * Initialize all cron jobs.
 */
const initCronJobs = () => {
  console.log('⏰ Initializing cron jobs...');

  // ──────────────────────────────────────────
  // EVERY MINUTE: Expire no-show bookings
  // ──────────────────────────────────────────
  cron.schedule('* * * * *', async () => {
    try {
      console.log('⏰ Cron (expire bookings) running...');
      const settings = await Settings.getSettings();
      const graceMin = settings.checkinGraceMin || 15;
      const now = new Date();

      // Find bookings that are 'booked' and past their grace window
      const bookings = await Booking.find({ status: 'booked' }).populate('seat');

      for (const booking of bookings) {
        // Calculate grace end time based on booking createdAt
        const slotStart = new Date(booking.createdAt);
        const graceEnd = new Date(slotStart.getTime() + graceMin * 60000);

        console.log(`  Booking ${booking._id}: slotStart=${slotStart}, graceEnd=${graceEnd}, now=${now}`);
        
        // Only expire if the grace period has passed
        if (now > graceEnd) {
          console.log(`  Expiring booking ${booking._id}`);
          booking.status = 'expired';
          await booking.save();

          // Just notify the user
          const user = await User.findById(booking.user);
          if (user) {
            await notify(user._id, 'Booking Expired', `Your booking for seat ${booking.seat.seatCode} expired as you did not check in on time.`, 'system');
          }
        }
      }
    } catch (err) {
      console.error('❌ Cron (expire bookings):', err.message, err.stack);
    }
  });

  // ──────────────────────────────────────────
  // EVERY MINUTE: Complete checked-in bookings past endTime
  // ──────────────────────────────────────────
  cron.schedule('* * * * *', async () => {
    try {
      const now = new Date();
      const bookings = await Booking.find({ status: 'checked_in' }).populate('seat');

      const settings = await Settings.getSettings();
      const maxHours = settings.maxSeatHoursPerDay || 4;
      const [ch, cm] = (settings.closingTime || '20:00').split(':').map(Number);
      
      const libraryCloseTime = new Date();
      libraryCloseTime.setHours(ch, cm, 0, 0);

      for (const booking of bookings) {
        if (!booking.checkedInAt) continue;
        
        const maxEndTime = new Date(booking.checkedInAt.getTime() + maxHours * 3600000);
        const endTriggerTime = new Date(Math.min(maxEndTime.getTime(), libraryCloseTime.getTime()));

        if (now > endTriggerTime) {
          booking.status = 'completed';
          booking.checkedOutAt = now;
          await booking.save();

          await notify(booking.user, 'Session Complete', `Your session at seat ${booking.seat.seatCode} has ended automatically.`, 'booking');
        }
      }
    } catch (err) {
      console.error('❌ Cron (complete bookings):', err.message);
    }
  });

  // ──────────────────────────────────────────
  // WEEKLY (Sun midnight): Decay penalty points by 1
  // ──────────────────────────────────────────
  cron.schedule('0 0 * * 0', async () => {
    try {
      console.log(`⏰ Penalty decay cron finished`);

      // Clear blocks for users whose blockedUntil has passed
      await User.updateMany(
        { blockedUntil: { $lte: new Date() } },
        { $set: { blockedUntil: null } }
      );
    } catch (err) {
      console.error('❌ Cron (penalty decay):', err.message);
    }
  });

  // ──────────────────────────────────────────
  // DAILY (9:00 AM): Send reminders for books due tomorrow
  // ──────────────────────────────────────────
  cron.schedule('0 9 * * *', async () => {
    try {
      const Borrowing = require('../models/Borrowing');
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);

      const dayAfter = new Date(tomorrow);
      dayAfter.setDate(dayAfter.getDate() + 1);

      const upcoming = await Borrowing.find({
        status: 'issued',
        dueDate: { $gte: tomorrow, $lt: dayAfter }
      }).populate('book');

      let count = 0;
      for (const b of upcoming) {
        await notify(b.user, 'Book Due Tomorrow ⏰', `Just a reminder that "${b.book.title}" is due tomorrow. Please return or renew it to avoid fines.`, 'reminder');
        count++;
      }
      console.log(`⏰ Sent ${count} due-tomorrow reminders`);
    } catch (err) {
      console.error('❌ Cron (due reminders):', err.message);
    }
  });

  // ──────────────────────────────────────────
  // DAILY (12:01 AM): Mark books overdue and calculate fines
  // ──────────────────────────────────────────
  cron.schedule('1 0 * * *', async () => {
    try {
      const Borrowing = require('../models/Borrowing');
      const { calculateFine } = require('../utils/fines');
      const now = new Date();

      const overdues = await Borrowing.find({
        status: { $in: ['issued', 'overdue'] },
        dueDate: { $lt: now }
      }).populate('book');

      let count = 0;
      for (const b of overdues) {
        if (b.status === 'issued') {
          b.status = 'overdue';
          await notify(b.user, 'Book Overdue! ⚠️', `"${b.book.title}" is now overdue. A daily fine will be applied until it's returned.`, 'fine');
        }
        count++;
      }

      // Save changes if any
      for (const b of overdues) {
        await b.save();
      }

      console.log(`⏰ Marked/processed ${count} overdue books`);
    } catch (err) {
      console.error('❌ Cron (overdue check):', err.message);
    }
  });

  console.log('⏰ Cron jobs initialized: booking expiry, completion, penalty decay, book reminders, overdue checks');
};

module.exports = initCronJobs;
