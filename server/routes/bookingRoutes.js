const express = require("express");
const router = express.Router();
const c = require("../controllers/bookingController");
const { protect, restrictTo } = require("../middleware/auth");
const upload = require("../middleware/upload");
const { validateBooking } = require("../middleware/validate");

// Public
router.get("/availability/:listingId", c.getAvailability);
router.get("/quote", c.getQuote);

router.use(protect);

// Guest
router.post("/", restrictTo("guest"), validateBooking, c.createBooking);
router.get("/mine", restrictTo("guest"), c.getMyBookings);
router.put("/:id/payment", restrictTo("guest"), upload.single("screenshot"), c.submitPayment);

// Owner
router.get("/owner", restrictTo("owner"), c.getOwnerBookings);
router.get("/owner/stats", restrictTo("owner"), c.getOwnerStats);
router.put("/:id/approve", restrictTo("owner"), c.approveBooking);
router.put("/:id/reject", restrictTo("owner"), c.rejectBooking);
router.put("/:id/payment/verify", restrictTo("owner"), c.verifyPayment);
router.put("/:id/payment/reject", restrictTo("owner"), c.rejectPayment);

// Shared
router.get("/:id", c.getBooking);
router.get("/:id/invoice", c.getInvoice);
router.put("/:id/cancel", c.cancelBooking);

module.exports = router;
