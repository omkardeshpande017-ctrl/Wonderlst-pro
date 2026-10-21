// GET /api/trips — a short alias the guest UI uses for "My trips".
// It re-uses the exact same controller as GET /api/bookings/mine.
const express = require("express");
const router = express.Router();
const { getMyBookings } = require("../controllers/bookingController");
const { protect, restrictTo } = require("../middleware/auth");

router.get("/", protect, restrictTo("guest"), getMyBookings);

module.exports = router;
