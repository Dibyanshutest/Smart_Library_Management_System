/**
 * Calculate fine for an overdue borrowing.
 * @param {Date} dueDate - The due date
 * @param {number} finePerDay - Fine amount per day
 * @param {Date} [now] - Current date (defaults to now)
 * @returns {number} Fine amount (0 if not overdue)
 */
const calculateFine = (dueDate, finePerDay, now = new Date()) => {
  const due = new Date(dueDate);
  if (now <= due) return 0;

  const diffMs = now - due;
  const daysOverdue = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  return daysOverdue * finePerDay;
};

module.exports = { calculateFine };
