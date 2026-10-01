require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const connectDB = require('./config/db');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// --------------- Security middleware ---------------
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));

app.use(cors({
  origin: true,
  credentials: true
}));

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { message: 'Too many attempts. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false
});

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, '..', 'public')));

app.use('/api/auth', authLimiter, require('./routes/auth'));
app.use('/api/seats', require('./routes/seats'));
app.use('/api/bookings', require('./routes/bookings'));
app.use('/api/scan', require('./routes/scan'));
app.use('/api/books', require('./routes/books'));
app.use('/api/borrowings', require('./routes/borrowings'));
app.use('/api/waitlist', require('./routes/waitlist'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/suggestions', require('./routes/suggestions'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/settings', require('./routes/settings'));

const pages = [
  'login', 'register', 'dashboard', 'seats', 'my-bookings',
  'catalog', 'my-books', 'notifications', 'staff', 'scanner', 'admin'
];
pages.forEach(page => {
  app.get(`/${page}`, (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', `${page}.html`));
  });
});

app.use(errorHandler);

const PORT = process.env.PORT || 5000;

const start = async () => {
  try {
    await connectDB();
    console.log('✅ DB connected');

    const server = app.listen(PORT, () => {
      console.log(`🚀 Smart Library Server running on http://localhost:${PORT}`);
    });

    server.on('error', (err) => {
      console.error('Server error:', err);
    });

    process.on('uncaughtException', (err) => {
      console.error('Uncaught Exception:', err);
      console.error(err.stack);
    });

    process.on('unhandledRejection', (reason, promise) => {
      console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    });
  } catch (err) {
    console.error('Startup error:', err);
    console.error(err.stack);
    process.exit(1);
  }
};

start();