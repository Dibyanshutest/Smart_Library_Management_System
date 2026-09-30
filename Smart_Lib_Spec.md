# SMART LIBRARY RESERVATION SYSTEM: MASTER SPEC (LIVING DOCUMENT)

> **READ THIS FIRST, AI BUILDER.**
> This file is the single source of truth for the project. You must build the system described here.
>
> ## MANDATORY RULES FOR THE AI
> 1. **Build everything in this file**, phase by phase (see Section 14). Do not skip features.
> 2. **Keep this file updated.** Whenever you add, change, rename, or remove ANYTHING (feature, API route, database field, page, UI component, config, dependency), update the relevant section of this file in the same response.
> 3. **Every new feature you invent** must be added to Section 12 (Feature Registry) with status, description, files touched, and API routes/models involved.
> 4. **Every change** must get a line in Section 17 (Changelog) with date, summary, and files changed.
> 5. Update the **Status** column in Section 12 (`Planned` → `In Progress` → `Done`) as you work.
> 6. If something is unclear, make a sensible decision, then record it in Section 16 (Decisions Log).
> 7. Output the full updated version of this file at the end of every working session.
> 8. **Tech constraint:** the frontend must be plain **HTML, CSS, and vanilla JavaScript** (no React/Vue/Angular, no build step). The backend is **Node.js + Express**, and the database is **MongoDB (Mongoose)**.
> 9. The UI must be **beautiful, modern, and mobile-first** (see Section 9). Never ship an ugly default-styled page.
> 10. Never expose the MongoDB connection from the browser. All DB access goes through the Express API.

---

## 1. PROJECT OVERVIEW

**Name:** Smart Library Reservation System
**Goal:** A web app where students can (a) book library seats visually, like choosing cinema seats, and enter by scanning a QR code, and (b) request and borrow books from staff, with live return countdowns, reminders, and fines.

| Role | Can do |
|---|---|
| Student | Register/login, book seats, get QR, check in, search books, request/renew books, see countdowns, notifications, wishlist |
| Staff (Librarian) | Approve/reject book requests, issue/return books, scan QR at entrance, manage catalog, view fines |
| Admin | Everything staff can, plus manage users, seats, settings, analytics, block seats |

---

## 2. TECH STACK

| Layer | Technology |
|---|---|
| Frontend | HTML5, CSS3 (custom properties, grid, flexbox), Vanilla JS (ES6 modules) |
| Backend | Node.js 18+, Express.js |
| Database | MongoDB with Mongoose |
| Auth | JWT (access token) plus bcrypt password hashing |
| QR generate | `qrcode` (server) or `qrcode.js` (client CDN) |
| QR scan | `html5-qrcode` (CDN) |
| Scheduling | `node-cron` |
| Email (optional) | `nodemailer` |
| Charts | Chart.js (CDN) |
| Security | `helmet`, `cors`, `express-rate-limit`, `express-validator` |
| Icons | Lucide or Font Awesome (CDN) |
| Fonts | Google Fonts: Inter (body), Poppins (headings) |

**Environment variables (`.env`)**
```
PORT=5000
MONGO_URI=mongodb://localhost:27017/smart_library
JWT_SECRET=change_me
QR_SECRET=change_me_too
CHECKIN_GRACE_MIN=15
BOOKING_CUTOFF_MIN=15
BORROW_DAYS=14
FINE_PER_DAY=2
PICKUP_WINDOW_HOURS=24
MAX_BOOKS_PER_STUDENT=3
MAX_RENEWALS=2
MAX_SEAT_HOURS_PER_DAY=4
EMAIL_USER=
EMAIL_PASS=
```

---

## 3. FOLDER STRUCTURE

```
smart-library/
├── SMART_LIBRARY_SPEC.md        <- this file (keep updated)
├── package.json
├── .env
├── server/
│   ├── server.js
│   ├── config/db.js
│   ├── models/        (User, Seat, Booking, Book, Borrowing, Notification, Waitlist, BookSuggestion, Settings)
│   ├── routes/        (auth, seats, bookings, books, borrowings, notifications, admin, scan)
│   ├── middleware/    (auth.js, role.js, errorHandler.js)
│   ├── utils/         (qr.js, fines.js, mailer.js, notify.js)
│   ├── cron/          (jobs.js)
│   └── seed/seed.js
└── public/
    ├── index.html            (landing)
    ├── login.html
    ├── register.html
    ├── dashboard.html        (student home)
    ├── seats.html            (seat map and booking)
    ├── my-bookings.html
    ├── catalog.html          (book search)
    ├── my-books.html         (borrowed books and countdown)
    ├── notifications.html
    ├── staff.html            (staff panel)
    ├── scanner.html          (QR check-in scanner)
    ├── admin.html            (analytics and management)
    ├── css/  (variables.css, base.css, components.css, pages.css, dark.css)
    ├── js/   (api.js, auth.js, ui.js, seats.js, catalog.js, countdown.js, scanner.js, admin.js, theme.js)
    ├── manifest.json         (PWA)
    └── sw.js                 (service worker)
```

---

## 4. DATABASE MODELS (Mongoose)

**User:** `name, email (unique), password (hashed), role: student|staff|admin, studentId (unique), phone, avatar, penaltyPoints (default 0), blockedUntil (Date|null), unpaidFines (Number), favoriteSeats [SeatId], theme: light|dark, createdAt`

**Seat:** `seatCode (e.g. "A1"), zone: Silent|Group|Computer|Reading, row, col, features [power, window, quiet], isBlocked (Boolean), blockReason, createdAt`

**Booking (seat booking):** `user, seat, date (YYYY-MM-DD), startTime, endTime, status: booked|checked_in|completed|cancelled|expired, qrToken, qrUsed (Boolean), checkedInAt, checkedOutAt, createdAt`
Unique compound partial index on `(seat, date, startTime)` for active statuses (booked, checked_in). This prevents double booking.

**Book:** `title, author, isbn, category, tags [], description, coverUrl, totalCopies, availableCopies, location (shelf), publishedYear, createdAt`

**Borrowing:** `user, book, status: requested|approved|issued|returned|rejected|cancelled|overdue, requestedAt, approvedBy, approvedAt, pickupDeadline, issuedBy, issuedAt, dueDate, returnedAt, renewCount, fine, finePaid, staffNote`

**Waitlist:** `user, book, createdAt, notified (Boolean)`

**Notification:** `user, title, message, type: booking|borrow|reminder|fine|system, read (Boolean), createdAt`

**BookSuggestion:** `user, title, author, reason, votes [UserId], status: pending|approved|rejected`

**Settings (single doc):** `checkinGraceMin, bookingCutoffMin, borrowDays, finePerDay, maxBooks, maxRenewals, openingTime, closingTime, slotLengthMin`

---

## 5. BUSINESS RULES

### 5.1 Seat booking
- Library hours and slot length come from Settings (default 08:00 to 20:00, 60-minute slots).
- **Booking cutoff rule:** a student may book a slot only if it starts **at least 15 min from now**.
- **Check-in grace rule:** the student must scan the QR within **15 min after slot start**. If not, the booking auto-expires, the seat is released, and a no-show penalty point is added.
- Max **4 hours/day** per student and no overlapping active bookings.
- Cancel any time before the start. Late cancellation (under 15 min) counts as half a penalty.
- **3 penalty points** blocks seat booking for 3 days (`blockedUntil`). Points decay by 1 per week.
- Blocked seats (`isBlocked`) cannot be booked.
- Booking creation must be race-safe: rely on the unique index and catch duplicate key errors (return 409 "Seat just got taken").

### 5.2 QR system
- On booking, the server creates `qrToken`, a **signed JWT** (`QR_SECRET`) with `{bookingId, userId, seatId, date, startTime}`, expiring at `endTime`.
- The QR encodes only the token (no readable personal data).
- On scan, the server verifies: valid signature, booking exists, status `booked`, not used, and current time within `[startTime - 15min, startTime + graceMin]`.
- On success: status becomes `checked_in`, `qrUsed = true`, `checkedInAt = now`. The response shows student name and seat.
- QR is **single-use**. "Check out" (or a second scan) sets `completed` and frees the seat early.
- The scanner is available to staff/admin (entrance gate).

### 5.3 Book borrowing
Flow: `requested → approved → issued → returned` (or `rejected`, `cancelled`, `overdue`).
- A student can request only if `availableCopies > 0`, unpaid fines are 0, and active borrowings plus requests are under `MAX_BOOKS_PER_STUDENT`.
- On **approval**, `availableCopies` decreases by 1 (held) and `pickupDeadline = now + 24h`.
- If not collected by the deadline, a cron job auto-cancels the request, restores the copy, and notifies the student and the first waitlisted user.
- **Issue:** staff confirm at the desk. Status becomes `issued`, `issuedAt = now`, `dueDate = now + 14 days`.
- **Return:** staff mark returned. `returnedAt = now`, `availableCopies` +1, fine calculated if late, waitlist notified.
- **Renewal:** up to 2 times, +7 days each. Blocked if another student is on the waitlist or the book is overdue.
- **Fine** = `daysOverdue × FINE_PER_DAY` (₹2/day default). Recalculated daily by cron and on return. Students with unpaid fines cannot request new books or book seats (configurable).

### 5.4 Waitlist
If `availableCopies == 0`, the student can join the waitlist. When a copy returns, the first user is notified and gets a 24-hour priority window.

---

## 6. API ENDPOINTS
Base: `/api`. All except auth need `Authorization: Bearer <token>`.

**Auth:** `POST /auth/register`, `POST /auth/login`, `GET /auth/me`, `PUT /auth/me`

**Seats:** `GET /seats?date=&startTime=` (status per slot: available|booked|occupied|blocked|mine), `POST /seats` (admin), `PUT /seats/:id` (admin: block/edit), `DELETE /seats/:id` (admin), `POST /seats/:id/favorite`

**Bookings:** `POST /bookings {seatId,date,startTime}`, `GET /bookings/mine`, `DELETE /bookings/:id` (cancel), `POST /bookings/:id/checkout`, `GET /bookings/:id/qr`

**Scan:** `POST /scan/checkin {token}` (staff/admin)

**Books:** `GET /books?search=&category=&available=&page=`, `GET /books/:id`, `GET /books/:id/recommendations`, `POST/PUT/DELETE /books` (staff/admin)

**Borrowings:** `POST /borrowings/request {bookId}`, `GET /borrowings/mine`, `POST /borrowings/:id/cancel`, `POST /borrowings/:id/renew`. Staff: `GET /borrowings?status=`, `POST /borrowings/:id/approve|reject|issue|return|pay-fine`

**Waitlist:** `POST /waitlist/:bookId`, `DELETE /waitlist/:bookId`

**Notifications:** `GET /notifications`, `PUT /notifications/:id/read`, `PUT /notifications/read-all`

**Suggestions:** `POST /suggestions`, `GET /suggestions`, `POST /suggestions/:id/vote`, `PUT /suggestions/:id` (staff)

**Admin:** `GET /admin/analytics`, `GET/PUT /admin/settings`, `GET /admin/users`, `PUT /admin/users/:id`, `GET /admin/live-occupancy`

---

## 7. CRON JOBS (`server/cron/jobs.js`)
| Schedule | Job |
|---|---|
| Every minute | Expire `booked` bookings past `startTime + grace`, add penalty, notify, free seat |
| Every minute | Mark `checked_in` bookings `completed` after `endTime` |
| Every 15 min | Cancel `approved` borrowings past `pickupDeadline`, restore copy, notify waitlist |
| Daily 00:05 | Mark `issued` past `dueDate` as `overdue`, recalculate fines |
| Daily 09:00 | Reminders at 3 days, 1 day, and due date (in-app plus optional email) |
| Weekly | Decay penalty points by 1 |

---

## 8. PAGES AND SCREENS
1. **Landing:** hero, feature highlights, login/register buttons, animated gradient background.
2. **Login / Register:** split layout with illustration, inline validation, show/hide password.
3. **Student Dashboard:** greeting, quick stats (active booking, books due, fines), upcoming seat card with QR button, "books due" countdown cards, notification bell, quick actions.
4. **Seat Map:** date picker, time-slot chips, zone tabs, **cinema-style seat grid**, legend, "Entrance / Librarian Desk" label at the front (like a cinema screen), bottom sheet with seat details and "Confirm Booking". Refresh every 30 s.
5. **My Bookings:** upcoming, active, past. QR modal, cancel and check-out buttons, live "starts in / check in within" timer.
6. **Catalog:** search bar, filter chips (category, availability), book card grid with cover, availability badge, "Request" or "Join waitlist".
7. **My Books:** tabs Requested, To Collect, Issued, History. Live countdown, Renew button, fine display.
8. **Notifications:** list with unread highlight, mark all read.
9. **Staff Panel:** tabs for Requests queue, Ready to issue, Return desk, Overdue list, Catalog management, Suggestions. Scan-to-issue and scan-to-return helper.
10. **Scanner:** full-screen camera with scan frame, big green/red result card (student name, seat, time), sound/vibration feedback.
11. **Admin:** Chart.js dashboard (peak hours bar chart, occupancy doughnut, most-borrowed list, no-show rate, fines collected), user table, seat manager, settings form.

### 8.1 Return countdown component
- Each issued book shows a ring or bar plus text: `5d 3h 12m left`, updated every second via `setInterval` from `dueDate`.
- **Green** (more than 3 days), **amber** (3 days or less), **red pulsing** (overdue: `Overdue by 2d 4h · Fine ₹4`).
- The server is the source of truth for fines. The client only displays.

### 8.2 Seat map behavior
- Colors: Available (green), Selected (indigo, glow), Booked (grey), Occupied/Checked-in (red), Blocked (striped), Mine (gold).
- Tap shows seat code, zone, features (power/window/quiet).
- Favorite seats show a star, and a "Book my favorite" button jumps to it.
- Booking success shows a checkmark or confetti animation and opens the QR modal.

---

## 9. UI / UX DESIGN SYSTEM (make it BEAUTIFUL)

**Style:** modern, clean, slightly glassmorphic, rounded, soft shadows, smooth motion. It must feel like a premium mobile app.

```css
:root{
  --primary:#6366f1; --primary-dark:#4f46e5; --accent:#06b6d4;
  --success:#22c55e; --warning:#f59e0b; --danger:#ef4444;
  --bg:#f5f7fb; --surface:#ffffff; --text:#0f172a; --muted:#64748b; --border:#e2e8f0;
  --radius:16px; --shadow:0 10px 30px rgba(15,23,42,.08);
  --gradient:linear-gradient(135deg,#6366f1 0%,#06b6d4 100%);
}
[data-theme="dark"]{
  --bg:#0b1020; --surface:#141a2e; --text:#e6e9f5; --muted:#94a3b8; --border:#243049;
  --shadow:0 10px 30px rgba(0,0,0,.4);
}
```

**Rules**
- Fonts: Poppins (headings, 600/700) and Inter (body).
- Cards: `--radius`, `--shadow`, 1px border, hover lift (`translateY(-3px)`).
- Buttons: gradient primary, press/ripple effect, loading spinner, disabled state.
- Layout: sticky top navbar (logo, links, bell with unread badge, theme toggle, avatar menu). On mobile, a **bottom tab bar** (Home, Seats, Books, Alerts, Profile).
- Mobile-first, breakpoints 480 / 768 / 1024 / 1280.
- Motion: page fade-in, skeleton loaders, toast notifications, modals with backdrop blur, animated stat counters.
- Friendly empty states with a call to action.
- Accessibility: visible focus rings, ARIA labels, contrast of at least 4.5:1, keyboard-navigable seat grid, respect `prefers-reduced-motion`.
- **Dark mode** toggle saved in `localStorage` and the profile, defaulting to the system preference.
- Consistent icon set (Lucide/FA).
- Forms: clear labels, inline errors, success states.
- PWA: `manifest.json` plus a service worker for installability and an offline shell.

---

## 10. SECURITY REQUIREMENTS
- bcrypt (10+ rounds) and never return the password field.
- JWT expiry 1 day.
- Role-check middleware on every staff/admin route.
- Validate and sanitize all input, and rate-limit auth routes.
- `helmet` and a restrictive `cors`.
- QR tokens signed with a separate secret, short-lived, single-use.
- Never trust client-side checks. Enforce all rules on the server.
- HTTPS in production (camera access needs it). `localhost` works for development.

---

## 11. SEED DATA (`npm run seed`)
- Admin (`admin@library.com` / `Admin@123`), staff (`staff@library.com` / `Staff@123`), 3 sample students.
- 60 seats: Silent (A1–A20), Reading (B1–B20), Computer (C1–C10), Group (D1–D10).
- 40+ sample books across Programming, Science, Fiction, History, Business, Engineering.
- Sample borrowings in different states to demo countdown, overdue, and fines.

---

## 12. FEATURE REGISTRY (AI must keep this updated and add new features here)

| # | Feature | Description | Status | Key files / routes |
|---|---|---|---|---|
| 1 | Auth and roles | Register, login, JWT, student/staff/admin | Planned | `routes/auth.js`, `login.html` |
| 2 | Seat map | Cinema-style seat grid, live status per slot | Planned | `seats.html`, `js/seats.js` |
| 3 | Seat booking | Book by date and slot, race-safe | Planned | `POST /bookings` |
| 4 | 15-min booking cutoff | Book at least 15 min ahead | Planned | `routes/bookings.js` |
| 5 | 15-min check-in grace and auto-release | No-show frees seat plus penalty | Planned | `cron/jobs.js` |
| 6 | QR generation | Signed single-use QR per booking | Planned | `utils/qr.js` |
| 7 | QR scanner check-in | Camera scan validates and checks in | Planned | `scanner.html`, `POST /scan/checkin` |
| 8 | Check-out / early release | Free seat before slot ends | Planned | `POST /bookings/:id/checkout` |
| 9 | Booking limits | Max hours/day, no overlap | Planned | `routes/bookings.js` |
| 10 | Penalty points | No-shows lead to block, weekly decay | Planned | `models/User.js`, cron |
| 11 | Favorite seats | Star seats, one-tap booking | Planned | `POST /seats/:id/favorite` |
| 12 | Book catalog and search | Search and filter | Planned | `catalog.html` |
| 13 | Borrow request flow | requested → approved → issued → returned | Planned | `routes/borrowings.js` |
| 14 | Staff request queue | Approve/reject with note | Planned | `staff.html` |
| 15 | Pickup window auto-release | Uncollected books released after 24h | Planned | `cron/jobs.js` |
| 16 | Return countdown | Live timer with green/amber/red | Planned | `js/countdown.js` |
| 17 | Overdue fines | ₹/day, blocks new requests | Planned | `utils/fines.js` |
| 18 | Renewals | Up to 2, blocked if waitlisted | Planned | `POST /borrowings/:id/renew` |
| 19 | Reminders | 3d / 1d / due-day, in-app plus email | Planned | `cron/jobs.js` |
| 20 | Notification bell | In-app notification center | Planned | `notifications.html` |
| 21 | Waitlist / hold queue | Queue for unavailable books | Planned | `models/Waitlist.js` |
| 22 | Borrowing limits | Max 3 books, no unpaid fines | Planned | `routes/borrowings.js` |
| 23 | Book recommendations | "Also borrowed" aggregation | Planned | `GET /books/:id/recommendations` |
| 24 | New-book suggestions | Students suggest and vote | Planned | `models/BookSuggestion.js` |
| 25 | Admin analytics | Peak hours, top books, no-shows, fines | Planned | `admin.html` |
| 26 | Admin management | Users, seats, block seats, settings | Planned | `routes/admin.js` |
| 27 | Live occupancy | Seats in use right now | Planned | `GET /admin/live-occupancy` |
| 28 | Dark mode | Toggle and system preference | Planned | `css/dark.css`, `js/theme.js` |
| 29 | PWA | Installable, offline shell | Planned | `manifest.json`, `sw.js` |
| 30 | Reading stats and streaks | Hours studied, books read | Planned | `dashboard.html` |
| 31 | Seat + book combo widget | Show "books due" on the seat page | Planned | `seats.html` |

**Optional extra features the AI may add (log each in the table above):** group study room booking, email/SMS receipts, seat rating after check-out, announcements board, CSV/PDF export, multi-language (English/Hindi/Odia), barcode scanning for issue/return, reader leaderboard, exam-time quiet-hours seat lock, online fine payment.

---

## 13. QUALITY CHECKLIST (AI must verify before finishing)
- [ ] Runs with `npm install && npm run seed && npm start`
- [ ] No double booking possible (test concurrent requests)
- [ ] QR cannot be reused or forged, and it expires correctly
- [ ] Cron jobs release seats and books correctly
- [ ] All roles enforced on the server
- [ ] Every page responsive (360px to 1440px) and works in dark mode
- [ ] Countdown updates live with correct colors
- [ ] Loading, empty, and error states on every page
- [ ] No console errors, no hardcoded secrets
- [ ] **This file fully updated: Feature Registry, API list, models, Decisions Log, Changelog**

---

## 14. BUILD PHASES (in order; update this file after each)
1. **Foundation:** setup, DB, models, auth and roles, design system CSS, navbar, landing, login/register.
2. **Seat booking and QR:** seat seed, seat map UI, booking API with race safety and limits, QR generation, scanner, check-in/out, cron expiry and penalties.
3. **Books:** catalog, search, borrow flow, staff panel, issue/return, waitlist, limits.
4. **Countdown, fines, notifications:** live countdown, fines, reminders, notification center, renewals.
5. **Admin and extras:** analytics, admin management, favorites, recommendations, suggestions, stats, dark mode, PWA, animations.
6. **Hardening:** security review, validation, error handling, testing, README, final update of this file.

---

## 15. HOW TO RUN (AI: keep accurate)
```
npm install
cp .env.example .env
npm run seed
npm start        # http://localhost:5000
```
Dependencies: `express mongoose dotenv bcryptjs jsonwebtoken cors helmet express-rate-limit express-validator node-cron qrcode nodemailer` (dev: `nodemon`)

---

## 16. DECISIONS LOG (AI: append every assumption)
| Date | Decision | Reason |
|---|---|---|
| (start) | Node/Express backend, since browsers can't safely access MongoDB | Security |
| (start) | Both 15-minute rules apply: booking cutoff and check-in grace | Prevent hoarding and no-shows |

---

## 17. CHANGELOG (AI: add an entry for every change)
| Date | Change | Files |
|---|---|---|
| (initial) | Spec created | `SMART_LIBRARY_SPEC.md` |

---

## 18. FINAL INSTRUCTION TO THE AI
Build the complete working project now, starting at Phase 1 and continuing through Phase 6, or as far as your output limit allows, and tell me exactly which phase is next. After **each** phase: (1) list the files created, (2) update Sections 12, 15, 16, and 17 of this document, and (3) output the updated document. Make the UI polished and beautiful, following Section 9. If I say "continue", proceed to the next phase.