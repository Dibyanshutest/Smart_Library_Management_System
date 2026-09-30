const Notification = require('../models/Notification');

/**
 * Create an in-app notification for a user.
 * @param {string} userId - The user's ObjectId
 * @param {string} title - Notification title
 * @param {string} message - Notification message
 * @param {string} type - One of: booking, borrow, reminder, fine, system
 */
const notify = async (userId, title, message, type = 'system') => {
  try {
    await Notification.create({ user: userId, title, message, type });
  } catch (err) {
    console.error('⚠️  Failed to create notification:', err.message);
  }
};

module.exports = notify;
