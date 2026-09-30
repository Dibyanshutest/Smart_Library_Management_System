require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const connectDB = require('./config/db');
const errorHandler = require('./middleware/errorHandler');
const initCronJobs = require('./cron/jobs');

const app = express();

// --------------- Security middleware ---------------
app.use(helmet({
  contentSecurityPolicy: false, // Allow inline scripts/CDN for frontend
  crossOriginEmbedderPolicy: false
}));

app.use(cors({
  origin: true,
  credentials: true
}));

// Rate limiter for auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 20,
  message: { message: 'Too many attempts. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false
});

// --------------- Body parsing ---------------
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false }));

// --------------- Static files ---------------
app.use(express.static(path.join(__dirname, '..', 'public')));

// --------------- API routes ---------------
app.use('/api/auth', authLimiter, require('./routes/auth'));

// Phase 2 routes
app.use('/api/seats', require('./routes/seats'));
app.use('/api/bookings', require('./routes/bookings'));
app.use('/api/scan', require('./routes/scan'));

// Phase 3 & 4 routes
app.use('/api/books', require('./routes/books'));
app.use('/api/borrowings', require('./routes/borrowings'));
app.use('/api/waitlist', require('./routes/waitlist'));
app.use('/api/notifications', require('./routes/notifications'));

// Phase 5 routes
app.use('/api/suggestions', require('./routes/suggestions'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/settings', require('./routes/settings'));

// --------------- SPA fallback ---------------
// Serve HTML pages for known routes
const pages = [
  'login', 'register', 'dashboard', 'seats', 'my-bookings',
  'catalog', 'my-books', 'notifications', 'staff', 'scanner', 'admin'
];
pages.forEach(page => {
  app.get(`/${page}`, (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', `${page}.html`));
  });
});

// --------------- Error handler ---------------
app.use(errorHandler);

// --------------- Start server ---------------
const PORT = process.env.PORT || 5000;

const start = async () => {
  await connectDB();
  initCronJobs();

  app.listen(PORT, () => {
    console.log(`\n🚀 Smart Library Server running on http://localhost:${PORT}\n`);
  });
};

start();

module.exports = app;
