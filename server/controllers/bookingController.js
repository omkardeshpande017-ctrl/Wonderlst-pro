const Booking = require("../models/Booking");
const Listing = require("../models/Listing");
const User = require("../models/User");
const ApiError = require("../utils/ApiError");
const catchAsync = require("../utils/catchAsync");
const notify = require("../utils/notify");
const { fileInfo } = require("../middleware/upload");

const DAY = 24 * 60 * 60 * 1000;
const PAYMENT_WINDOW_MS = 24 * 60 * 60 * 1000; // guest has 24h to pay after approval
const SERVICE_FEE_RATE = 0.05; // 5% platform fee shown on every quote
const { BLOCKING_STATUSES } = Booking;

// Single source of truth for pricing, used by quotes, booking creation and invoices
const priceBreakdown = (listing, nights) => {
  const subtotal = Math.round(nights * listing.price);
  const cleaningFee = Math.round(listing.cleaningFee || 0);
  const serviceFee = Math.round(subtotal * SERVICE_FEE_RATE);
  const securityDeposit = Math.round(listing.securityDeposit || 0);
  const total = subtotal + cleaningFee + serviceFee;
  return {
    nights,
    pricePerNight: listing.price,
    subtotal,
    cleaningFee,
    serviceFee,
    serviceFeeRate: SERVICE_FEE_RATE,
    securityDeposit,
    total,
    dueNow: total + securityDeposit,
  };
};

const startOfDay = (d) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

// Lazily keep statuses fresh: unpaid approvals expire, finished stays complete
const refreshStatuses = async () => {
  const now = new Date();
  await Booking.updateMany(
    { status: "approved", "payment.status": { $ne: "submitted" }, paymentDueAt: { $lt: now } },
    { $set: { status: "expired" } }
  );
  await Booking.updateMany(
    { status: "confirmed", checkOut: { $lt: startOfDay(now) } },
    { $set: { status: "completed" } }
  );
};

// A pending request also reserves the dates for its guest, otherwise two guests
// could both be approved for the same nights by mistake.
const HOLDING_STATUSES = ["pending", ...BLOCKING_STATUSES];

const hasOverlap = async (listingId, checkIn, checkOut, excludeId) => {
  const query = {
    listing: listingId,
    status: { $in: HOLDING_STATUSES },
    checkIn: { $lt: checkOut },
    checkOut: { $gt: checkIn },
  };
  if (excludeId) query._id = { $ne: excludeId };
  return !!(await Booking.findOne(query));
};

const populateBooking = (q) =>
  q
    .populate("listing", "title image location country price")
    .populate("guest", "username email phone avatar")
    .populate("owner", "username email phone avatar");

const loadOwnedBooking = async (req, next, who) => {
  const booking = await Booking.findById(req.params.id);
  if (!booking) {
    next(new ApiError(404, "Booking not found"));
    return null;
  }
  const field = who === "owner" ? booking.owner : booking.guest;
  if (field.toString() !== req.user._id.toString()) {
    next(new ApiError(403, "You don't have permission to do that"));
    return null;
  }
  return booking;
};

// ---------- Guest ----------

exports.createBooking = catchAsync(async (req, res, next) => {
  const { listingId, guests, message } = req.body;
  const checkIn = startOfDay(req.body.checkIn);
  const checkOut = startOfDay(req.body.checkOut);

  if (checkIn < startOfDay(new Date())) {
    return next(new ApiError(400, "Check-in date can't be in the past"));
  }
  if (checkOut <= checkIn) {
    return next(new ApiError(400, "Check-out must be after check-in"));
  }

  const listing = await Listing.findById(listingId);
  if (!listing) return next(new ApiError(404, "Listing not found"));
  if (listing.owner.toString() === req.user._id.toString()) {
    return next(new ApiError(400, "You can't book your own listing"));
  }

  await refreshStatuses();

  if (await hasOverlap(listing._id, checkIn, checkOut)) {
    return next(new ApiError(409, "Those dates are no longer available"));
  }

  const duplicate = await Booking.findOne({
    listing: listing._id,
    guest: req.user._id,
    status: { $in: ["pending", "approved", "payment_submitted"] },
    checkIn: { $lt: checkOut },
    checkOut: { $gt: checkIn },
  });
  if (duplicate) {
    return next(new ApiError(400, "You already have an active request for these dates"));
  }

  const nights = Math.round((checkOut - checkIn) / DAY);
  const quote = priceBreakdown(listing, nights);
  const booking = await Booking.create({
    listing: listing._id,
    guest: req.user._id,
    owner: listing.owner,
    checkIn,
    checkOut,
    nights,
    guests: guests || 1,
    pricePerNight: listing.price,
    cleaningFee: quote.cleaningFee,
    serviceFee: quote.serviceFee,
    securityDeposit: quote.securityDeposit,
    totalPrice: quote.total,
    message: message || "",
    // Instant-book listings skip owner approval and go straight to payment
    status: listing.instantBook ? "approved" : "pending",
    paymentDueAt: listing.instantBook ? new Date(Date.now() + PAYMENT_WINDOW_MS) : undefined,
  });

  await notify(listing.owner, {
    title: listing.instantBook ? "Instant booking confirmed" : "New booking request",
    message: `${req.user.username} requested ${listing.title} for ${nights} night${nights > 1 ? "s" : ""}.`,
    link: `/bookings/${booking._id}`,
  });

  res.status(201).json({ success: true, booking });
});

// GET /api/bookings/quote?listingId=&checkIn=&checkOut=&guests=
// Lets the widget show the exact price before the guest sends a request
exports.getQuote = catchAsync(async (req, res, next) => {
  const { listingId, checkIn, checkOut, guests = 1 } = req.query;
  if (!listingId || !checkIn || !checkOut) {
    return next(new ApiError(400, "listingId, checkIn and checkOut are required"));
  }

  const listing = await Listing.findById(listingId);
  if (!listing) return next(new ApiError(404, "Listing not found"));

  const start = startOfDay(checkIn);
  const end = startOfDay(checkOut);
  const nights = Math.round((end - start) / DAY);

  if (nights <= 0) {
    return res.status(200).json({ success: true, quote: null, message: "Invalid dates" });
  }

  const quote = priceBreakdown(listing, nights);
  const available = !(await hasOverlap(listing._id, start, end));
  const tooManyGuests = Number(guests) > listing.maxGuests;

  res.status(200).json({
    success: true,
    available: available && !tooManyGuests,
    maxGuests: listing.maxGuests,
    instantBook: listing.instantBook,
    quote,
  });
});

exports.getMyBookings = catchAsync(async (req, res) => {
  await refreshStatuses();
  const bookings = await populateBooking(
    Booking.find({ guest: req.user._id }).sort("-createdAt")
  );
  res.status(200).json({ success: true, count: bookings.length, bookings });
});

// Public: which date ranges are already taken for a listing
exports.getAvailability = catchAsync(async (req, res) => {
  await refreshStatuses();
  const booked = await Booking.find({
    listing: req.params.listingId,
    status: { $in: BLOCKING_STATUSES },
    checkOut: { $gte: startOfDay(new Date()) },
  }).select("checkIn checkOut status -_id");
  res.status(200).json({ success: true, booked });
});

exports.submitPayment = catchAsync(async (req, res, next) => {
  const booking = await loadOwnedBooking(req, next, "guest");
  if (!booking) return;

  await refreshStatuses();
  const fresh = await Booking.findById(booking._id);
  if (fresh.status === "expired") {
    return next(new ApiError(400, "This booking expired because payment wasn't made in time"));
  }
  if (fresh.status !== "approved") {
    return next(new ApiError(400, "Payment can only be submitted after the owner approves the booking"));
  }

  const transactionId = (req.body.transactionId || "").trim();
  if (transactionId.length < 6) {
    return next(new ApiError(400, "Enter the UPI transaction / UTR number from your payment app"));
  }

  const reused = await Booking.findOne({
    _id: { $ne: fresh._id },
    "payment.transactionId": transactionId,
  });
  if (reused) {
    return next(new ApiError(400, "That transaction ID was already used for another booking"));
  }

  fresh.payment.transactionId = transactionId;
  fresh.payment.status = "submitted";
  fresh.payment.submittedAt = new Date();
  fresh.payment.rejectReason = "";
  if (req.file) fresh.payment.screenshot = fileInfo(req.file);
  fresh.status = "payment_submitted";
  await fresh.save();

  await notify(fresh.owner, {
    title: "Payment submitted",
    message: `${req.user.username} paid ₹${fresh.totalPrice.toLocaleString("en-IN")}. Please verify it in your bank/UPI app.`,
    link: `/bookings/${fresh._id}`,
  });

  res.status(200).json({ success: true, booking: fresh });
});

// ---------- Owner ----------

exports.getOwnerBookings = catchAsync(async (req, res) => {
  await refreshStatuses();
  const filter = { owner: req.user._id };
  if (req.query.status) filter.status = req.query.status;
  const bookings = await populateBooking(Booking.find(filter).sort("-createdAt"));
  res.status(200).json({ success: true, count: bookings.length, bookings });
});

exports.getOwnerStats = catchAsync(async (req, res) => {
  await refreshStatuses();
  const ownerId = req.user._id;
  const [all, listingsCount] = await Promise.all([
    Booking.find({ owner: ownerId }).select("status totalPrice checkIn createdAt"),
    Listing.countDocuments({ owner: ownerId }),
  ]);

  const paid = all.filter((b) => ["confirmed", "completed"].includes(b.status));
  const stats = {
    listings: listingsCount,
    totalBookings: all.length,
    pendingRequests: all.filter((b) => b.status === "pending").length,
    awaitingPayment: all.filter((b) => b.status === "approved").length,
    awaitingVerification: all.filter((b) => b.status === "payment_submitted").length,
    confirmed: all.filter((b) => b.status === "confirmed").length,
    completed: all.filter((b) => b.status === "completed").length,
    earnings: paid.reduce((sum, b) => sum + b.totalPrice, 0),
    upcomingStays: all.filter(
      (b) => b.status === "confirmed" && new Date(b.checkIn) >= startOfDay(new Date())
    ).length,
  };

  // Earnings by month for the last 6 months
  const months = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      key: `${d.getFullYear()}-${d.getMonth()}`,
      label: d.toLocaleString("en-US", { month: "short" }),
      total: 0,
    });
  }
  paid.forEach((b) => {
    const d = new Date(b.createdAt);
    const m = months.find((x) => x.key === `${d.getFullYear()}-${d.getMonth()}`);
    if (m) m.total += b.totalPrice;
  });

  res.status(200).json({ success: true, stats, monthly: months });
});

exports.approveBooking = catchAsync(async (req, res, next) => {
  const booking = await loadOwnedBooking(req, next, "owner");
  if (!booking) return;

  if (booking.status !== "pending") {
    return next(new ApiError(400, "Only pending requests can be approved"));
  }
  if (!req.user.hasPaymentSetup()) {
    return next(
      new ApiError(400, "Add your payment QR code or UPI ID in Payment Settings before approving bookings")
    );
  }
  if (await hasOverlap(booking.listing, booking.checkIn, booking.checkOut, booking._id)) {
    return next(new ApiError(409, "Another booking already holds these dates"));
  }

  booking.status = "approved";
  booking.paymentDueAt = new Date(Date.now() + PAYMENT_WINDOW_MS);
  await booking.save();

  // Any other pending requests for overlapping dates can no longer be honoured
  const clashing = await Booking.find({
    _id: { $ne: booking._id },
    listing: booking.listing,
    status: "pending",
    checkIn: { $lt: booking.checkOut },
    checkOut: { $gt: booking.checkIn },
  });
  for (const other of clashing) {
    other.status = "rejected";
    other.decisionReason = "These dates were booked by another guest.";
    await other.save();
    await notify(other.guest, {
      title: "Booking request declined",
      message: "Those dates were taken by another guest.",
      link: `/bookings/${other._id}`,
    });
  }

  await notify(booking.guest, {
    title: "Booking approved — pay now",
    message: "Your request was approved. Pay within 24 hours to confirm your stay.",
    link: `/bookings/${booking._id}`,
  });

  res.status(200).json({ success: true, booking });
});

exports.rejectBooking = catchAsync(async (req, res, next) => {
  const booking = await loadOwnedBooking(req, next, "owner");
  if (!booking) return;
  if (booking.status !== "pending") {
    return next(new ApiError(400, "Only pending requests can be declined"));
  }
  booking.status = "rejected";
  booking.decisionReason = (req.body.reason || "").slice(0, 300);
  await booking.save();

  await notify(booking.guest, {
    title: "Booking request declined",
    message: booking.decisionReason || "The host couldn't accept your request.",
    link: `/bookings/${booking._id}`,
  });
  res.status(200).json({ success: true, booking });
});

exports.verifyPayment = catchAsync(async (req, res, next) => {
  const booking = await loadOwnedBooking(req, next, "owner");
  if (!booking) return;
  if (booking.status !== "payment_submitted") {
    return next(new ApiError(400, "There's no submitted payment to verify"));
  }
  booking.status = "confirmed";
  booking.payment.status = "verified";
  booking.payment.verifiedAt = new Date();
  booking.paymentDueAt = undefined;
  await booking.save();

  await notify(booking.guest, {
    title: "Booking confirmed 🎉",
    message: `Payment verified. Your booking code is ${booking.code}.`,
    link: `/bookings/${booking._id}`,
  });
  res.status(200).json({ success: true, booking });
});

exports.rejectPayment = catchAsync(async (req, res, next) => {
  const booking = await loadOwnedBooking(req, next, "owner");
  if (!booking) return;
  if (booking.status !== "payment_submitted") {
    return next(new ApiError(400, "There's no submitted payment to reject"));
  }
  const reason = (req.body.reason || "Payment not received").slice(0, 300);
  booking.status = "approved";
  booking.payment.status = "rejected";
  booking.payment.rejectReason = reason;
  booking.paymentDueAt = new Date(Date.now() + PAYMENT_WINDOW_MS); // give another 24h
  await booking.save();

  await notify(booking.guest, {
    title: "Payment could not be verified",
    message: `${reason}. Please pay again and resubmit the transaction ID.`,
    link: `/bookings/${booking._id}`,
  });
  res.status(200).json({ success: true, booking });
});

// ---------- Shared ----------

// GET /api/bookings/:id/invoice
// A printable invoice — only for confirmed/completed stays, only for the two parties
exports.getInvoice = catchAsync(async (req, res, next) => {
  const booking = await populateBooking(Booking.findById(req.params.id));
  if (!booking) return next(new ApiError(404, "Booking not found"));

  const uid = req.user._id.toString();
  const isGuest = booking.guest._id.toString() === uid;
  const isOwner = booking.owner._id.toString() === uid;
  if (!isGuest && !isOwner) {
    return next(new ApiError(403, "You don't have access to this invoice"));
  }

  if (!["confirmed", "completed"].includes(booking.status)) {
    return next(
      new ApiError(400, "An invoice is only available once the booking is confirmed")
    );
  }

  const nights = booking.nights;
  const subtotal = Math.round(nights * booking.pricePerNight);
  const cleaningFee = Math.round(booking.cleaningFee || 0);
  const serviceFee = Math.round(booking.serviceFee || 0);

  res.status(200).json({
    success: true,
    invoice: {
      number: `INV-${booking.code.replace("WL-", "")}`,
      bookingCode: booking.code,
      issuedAt: booking.payment?.verifiedAt || booking.updatedAt,
      status: booking.status,
      listing: {
        id: booking.listing._id,
        title: booking.listing.title,
        location: booking.listing.location,
        country: booking.listing.country,
        image: booking.listing.image?.url,
      },
      guest: {
        username: booking.guest.username,
        email: booking.guest.email,
        phone: booking.guest.phone,
      },
      host: {
        username: booking.owner.username,
        email: booking.owner.email,
        phone: booking.owner.phone,
      },
      checkIn: booking.checkIn,
      checkOut: booking.checkOut,
      nights,
      guests: booking.guests,
      lines: [
        {
          label: `\u20b9${booking.pricePerNight.toLocaleString("en-IN")} \u00d7 ${nights} night${
            nights > 1 ? "s" : ""
          }`,
          amount: subtotal,
        },
        { label: "Cleaning fee", amount: cleaningFee },
        { label: "Service fee", amount: serviceFee },
      ],
      subtotal,
      cleaningFee,
      serviceFee,
      securityDeposit: Math.round(booking.securityDeposit || 0),
      total: Math.round(booking.totalPrice),
      transactionId: booking.payment?.transactionId || "",
      paidAt: booking.payment?.verifiedAt || null,
    },
  });
});

exports.getBooking = catchAsync(async (req, res, next) => {
  await refreshStatuses();
  const booking = await populateBooking(Booking.findById(req.params.id));
  if (!booking) return next(new ApiError(404, "Booking not found"));

  const uid = req.user._id.toString();
  const isGuest = booking.guest._id.toString() === uid;
  const isOwner = booking.owner._id.toString() === uid;
  if (!isGuest && !isOwner) {
    return next(new ApiError(403, "You don't have access to this booking"));
  }

  const data = booking.toObject();
  data.viewerRole = isGuest ? "guest" : "owner";

  // Guest sees the owner's payment details only after approval
  if (isGuest && ["approved", "payment_submitted", "confirmed", "completed"].includes(data.status)) {
    const owner = await User.findById(booking.owner._id);
    data.ownerPayment = owner.payment;
  }
  res.status(200).json({ success: true, booking: data });
});

exports.cancelBooking = catchAsync(async (req, res, next) => {
  const booking = await Booking.findById(req.params.id);
  if (!booking) return next(new ApiError(404, "Booking not found"));

  const uid = req.user._id.toString();
  const isGuest = booking.guest.toString() === uid;
  const isOwner = booking.owner.toString() === uid;
  if (!isGuest && !isOwner) {
    return next(new ApiError(403, "You don't have permission to cancel this booking"));
  }
  if (!["pending", "approved", "payment_submitted", "confirmed"].includes(booking.status)) {
    return next(new ApiError(400, "This booking can't be cancelled"));
  }
  if (booking.status === "confirmed" && booking.checkIn < startOfDay(new Date())) {
    return next(new ApiError(400, "This stay has already started"));
  }

  const wasPaid = ["payment_submitted", "confirmed"].includes(booking.status);
  booking.status = "cancelled";
  booking.cancelledBy = isGuest ? "guest" : "owner";
  booking.decisionReason = (req.body.reason || "").slice(0, 300);
  await booking.save();

  await notify(isGuest ? booking.owner : booking.guest, {
    title: "Booking cancelled",
    message: `${req.user.username} cancelled booking ${booking.code}.${
      wasPaid ? " Any payment refund must be settled directly between guest and host." : ""
    }`,
    link: `/bookings/${booking._id}`,
  });
  res.status(200).json({ success: true, booking });
});
