# Wanderlust Pro — MERN Stack (Owner/Guest booking + UPI QR payments)

A full-stack travel listing & booking platform:

- **M**ongoDB — data (users, listings, bookings, reviews, notifications)
- **E**xpress — REST API (`/server`)
- **R**eact — SPA frontend (`/client`, Vite + Tailwind)
- **N**ode — runtime for the API

### Features

- **Two account types**: Guest and Owner, chosen at sign-up
- **Request-to-book flow**: guest picks dates → owner approves/declines → guest pays → owner verifies payment → booking confirmed
- **Owner payment settings**: owners upload a UPI QR code and/or UPI ID; guests see it only after their booking is approved
- **Manual payment verification**: guest submits a UPI transaction ID (+ optional screenshot); owner confirms or rejects it
- **Owner dashboard**: earnings, pending requests, bookings to verify, 6-month earnings chart, listings, booking list with status filters
- **Guest "My trips"**: every booking with live status (pending → approved → payment submitted → confirmed/completed)
- **In-app notifications** (bell icon) for both sides
- **Automatic conflict handling**: double-booked dates blocked; approving one request auto-declines clashing pending requests; unpaid approvals auto-expire after 24h
- Search, category filters, reviews & ratings, wishlist, image upload (local disk by default, Cloudinary optional)

---

## Option A — Docker (recommended, 3 terminals, no local Node/Mongo install needed)

### Prerequisite
[Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running.

That's the only prerequisite — Docker builds and runs MongoDB, the backend, and the frontend for you, each in its own container, already wired together.

### Terminal 1 — MongoDB
```bash
cd wanderlust-pro
```
```bash
docker compose up mongo
```
Leave this running. First run downloads the MongoDB image.

### Terminal 2 — Backend
```bash
cd wanderlust-pro
```
```bash
docker compose up --build server
```
First run installs backend dependencies and builds the image — takes a minute. You should see `MongoDB connected` and `Wanderlust API listening on port 8080`.

Seed the database with sample listings, a demo owner (QR code + UPI ID already set up), two demo guests, and 5 sample bookings — open a **new** terminal tab (not one of the three above) and run:
```bash
cd wanderlust-pro && docker compose exec server npm run seed
```

### Terminal 3 — Frontend
```bash
cd wanderlust-pro
```
```bash
docker compose up --build client
```

Then open **http://localhost:5173**.

**To stop everything**, press `Ctrl+C` in each of the three terminals, or from any terminal in the project folder run `docker compose down`.

**To start again later** (no rebuild needed): the same three commands, without `--build`.

---

## Option B — Without Docker (requires Node.js + MongoDB installed locally)

### Prerequisites
- [Node.js](https://nodejs.org) v18+
- MongoDB — Homebrew (`brew install mongodb-community`), the official installer, or a free [MongoDB Atlas](https://www.mongodb.com/atlas) cluster

### Terminal 1 — MongoDB (skip if using Atlas)
```bash
mkdir -p ~/data/db
```
```bash
mongod --dbpath ~/data/db
```
Leave this running.

### Terminal 2 — Backend
```bash
cd wanderlust-pro/server
```
```bash
npm install
```
```bash
cp .env.example .env
```
```bash
sed -i '' "s/change_this_to_a_long_random_secret/$(openssl rand -hex 32)/" .env
```
```bash
npm run seed
```
```bash
npm run dev
```
*(On Linux, drop the `sed -i ''` line and paste a random string directly into `JWT_SECRET` in `server/.env` instead.)*

### Terminal 3 — Frontend
```bash
cd wanderlust-pro/client
```
```bash
npm install
```
```bash
npm run dev
```

Then open **http://localhost:5173**.

---

## Try the full booking flow

**Demo accounts** (created by `npm run seed`, whichever option you used):
| Role  | Email                    | Password    |
|-------|--------------------------|-------------|
| Owner | owner@wanderlust.com     | password123 |
| Guest | guest@wanderlust.com     | password123 |
| Guest | priya@wanderlust.com     | password123 |

1. Log in as **guest**, open any listing, pick dates, and click **Request to book**.
2. Log out, log in as **owner**, open **Owner dashboard → Bookings**, find the pending request, and click **Approve** (the demo owner already has a QR code / UPI ID set up in **Payment settings** — a real owner account must set this up before approving anything).
3. Log back in as the guest, open the booking from **My trips**, view the QR code / UPI ID, enter any transaction ID (6+ characters — it's a demo, no real payment happens), and submit.
4. Log back in as the owner, open the booking, and click **Confirm payment received**. The booking is now **Confirmed**, and the guest gets a notification.

To create your own owner account from scratch: sign up, choose **Owner**, go to **Payment settings**, add a UPI ID and/or upload a QR code image, then **Add listing**.

---

## Project structure

```
wanderlust-pro/
├── docker-compose.yml        # wires mongo + server + client together
├── server/
│   ├── Dockerfile
│   ├── config/                # db + cloudinary (optional) setup
│   ├── controllers/           # auth, listings, reviews, users, bookings, notifications
│   ├── middleware/            # auth (JWT + role guard), upload (cloud/local), validate, errorHandler
│   ├── models/                 # User (roles+payment), Listing, Review, Booking, Notification
│   ├── routes/                  # /api/auth, /listings, /users, /bookings, /notifications
│   ├── seed/                    # sample data + seed script (owner/guests/bookings)
│   ├── uploads/                 # local image storage (QR codes, screenshots, listing photos)
│   └── server.js
└── client/
    ├── Dockerfile
    └── src/
        ├── api/                  # axios instance
        ├── context/              # AuthContext
        ├── components/           # Navbar, NotificationBell, BookingWidget, StatusBadge, ...
        └── pages/                  # Home, ListingDetail, Dashboard, BookingDetail, MyBookings,
                                     # PaymentSettings, CreateListing, EditListing, Profile, ...
```

### Booking status lifecycle
```
pending → approved → payment_submitted → confirmed → completed
   ↓           ↓              ↓
rejected   expired       (rejected by owner → back to approved)
   ↘___________↘___________↙
            cancelled (guest or owner, while active)
```

## Production build (Option B only)

```bash
cd client
npm run build        # outputs static files to client/dist
```
Serve `client/dist` with any static host, and deploy `/server` to any Node host, setting the environment variables from `server/.env.example` plus `NODE_ENV=production` and `CLIENT_URL` pointing at your deployed frontend URL. Set the Cloudinary variables if your host has an ephemeral filesystem; otherwise local disk storage under `server/uploads` is fine.
# Wonderlst-pro
