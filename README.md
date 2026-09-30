# Smart Library Reservation System

A modern, mobile-first web application for libraries to manage seat bookings, book borrowing, and user fines.

## Features

- **Cinema-Style Seat Map:** Visual seat picker with color-coded availability and zones.
- **QR Code Check-in:** Real-time seat check-in/out via QR tokens using a scanner app.
- **Book Catalog:** Browse books, request them, and join waitlists if unavailable.
- **Live Countdowns:** Timers for upcoming bookings and book return due dates.
- **Staff Panel:** Manage borrowing requests, issue/return books, and handle fines.
- **Admin Dashboard:** Configure library hours, max limits, fine amounts, and manage user roles.
- **Dark Mode & PWA Ready:** Built-in theme manager for late-night studying.

## Tech Stack

- **Frontend:** Vanilla HTML, CSS (Custom Properties, Flexbox/Grid), JavaScript (No build step).
- **Backend:** Node.js, Express.js.
- **Database:** MongoDB via Mongoose.
- **Auth:** JWT authentication, bcryptjs password hashing.
- **Jobs:** `node-cron` for auto-expiry of bookings, fines calculation, and penalty point decay.

## Getting Started

### Prerequisites

- Node.js (v14+)
- MongoDB (running locally on `mongodb://localhost:27017` or via MongoDB Atlas)

### Installation

1. Clone the repository and install dependencies:
   ```bash
   npm install
   ```

2. Copy the example environment file and adjust if necessary:
   ```bash
   cp .env.example .env
   ```

3. **Seed the database** (creates sample users, seats, books, and initial settings):
   ```bash
   npm run seed
   ```

4. Start the development server:
   ```bash
   npm start
   ```

5. Open your browser to `http://localhost:5000`

### Demo Accounts (created by seed)

- **Admin:** `admin@library.com` / `Admin@123`
- **Staff:** `staff@library.com` / `Staff@123`
- **Student:** `aarav@student.com` / `Student@123`

## Directory Structure

```
├── public/                 # Static assets (Frontend)
│   ├── css/                # CSS design system (variables, base, pages)
│   ├── js/                 # Vanilla JS (api, ui, theme, auth)
│   └── *.html              # HTML pages
├── server/                 # Node.js backend
│   ├── config/             # DB & env config
│   ├── cron/               # Scheduled jobs (expiry, fines, reminders)
│   ├── middleware/         # Auth, Roles, Error handlers
│   ├── models/             # Mongoose schemas
│   ├── routes/             # API Endpoints
│   ├── seed/               # Data bootstrapping
│   ├── utils/              # QR, Fines, Mailer, Notifications
│   └── server.js           # Main Express entry
├── .env.example
├── package.json
└── README.md
```

## Built With ❤️
Developed as a robust, no-build-step prototype for modern library management.
