// DEMO_MODE store (see ./store.js). Lets the deployed app run with no database.
const express = require("express");
const jwt = require("jsonwebtoken");
const store = require("./store");

const DAY = 24 * 60 * 60 * 1000;

const startOfDay = (d) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

// ---------- helpers ----------
const send = (res, status, body) => res.status(status).json(body);
const fail = (res, status, message) => res.status(status).json({ success: false, message });

const signToken = (user) =>
  jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });

const populateListing = (listing) => ({
  ...listing,
  owner:
    store.publicUser(store.users.find((u) => u._id === listing.owner)) || { username: "host" },
  reviews: listing.reviews.map((r) => ({
    ...r,
    author: store.publicUser(store.users.find((u) => u._id === r.author)) || {
      username: r.username,
    },
  })),
});

const populateBooking = (booking, withPayment = false) => {
  const listing = store.findListing(booking.listing) || {};
  const guest = store.users.find((u) => u._id === booking.guest) || {};
  const owner = store.users.find((u) => u._id === booking.owner) || {};
  const out = {
    ...booking,
    listing: {
      _id: listing._id,
      title: listing.title,
      image: listing.image,
      location: listing.location,
      country: listing.country,
      price: listing.price,
    },
    guest: { _id: guest._id, username: guest.username, email: guest.email, phone: guest.phone },
    owner: { _id: owner._id, username: owner.username, email: owner.email, phone: owner.phone },
  };
  if (withPayment && owner.payment) out.ownerPayment = owner.payment;
  return out;
};

const auth = (req, res, next) => {
  let token;
  if (req.cookies && req.cookies.token) token = req.cookies.token;
  else if (req.headers.authorization?.startsWith("Bearer "))
    token = req.headers.authorization.split(" ")[1];

  if (!token) return fail(res, 401, "You must be logged in to do that");

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = store.users.find((u) => u._id === decoded.id);
    if (!user) return fail(res, 401, "User belonging to this session no longer exists");
    req.user = user;
    next();
  } catch {
    return fail(res, 401, "Invalid or expired session, please log in again");
  }
};

const onlyRole = (role) => (req, res, next) =>
  req.user.role === role
    ? next()
    : fail(res, 403, role === "owner" ? "Only owner accounts can do that" : "Only guest accounts can do that");

const respondWithToken = (user, status, res) => {
  res.cookie("token", signToken(user), {
    expires: new Date(Date.now() + 7 * DAY),
    httpOnly: true,
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    secure: process.env.NODE_ENV === "production",
  });
  return res.status(status).json({
    success: true,
    token: signToken(user),
    user: store.publicUser(user),
  });
};

const overlap = (listingId, checkIn, checkOut, excludeId) =>
  store.bookings.some(
    (b) =>
      b.listing === listingId &&
      ["approved", "payment_submitted", "confirmed"].includes(b.status) &&
      b._id !== excludeId &&
      new Date(b.checkIn) < checkOut &&
      new Date(b.checkOut) > checkIn
  );

// ---------- routers ----------
function authRouter() {
  const r = express.Router();

  r.post("/register", (req, res) => {
    const { username, email, password, role, phone } = req.body || {};
    if (!username || !email || !password) return fail(res, 400, "Username, email and password are required");
    if (password.length < 6) return fail(res, 400, "Password must be at least 6 characters");
    if (store.users.some((u) => u.email === String(email).toLowerCase()))
      return fail(res, 400, "An account with that email already exists");
    if (store.users.some((u) => u.username === username))
      return fail(res, 400, "That username is already taken");

    const user = {
      _id: store.nextId(),
      username,
      email: String(email).toLowerCase(),
      password: require("bcryptjs").hashSync(password, 10),
      role: role === "owner" ? "owner" : "guest",
      phone: phone || "",
      bio: "",
      avatar: "",
      wishlist: [],
      createdAt: new Date(),
      payment: { upiId: "", payeeName: "", qrCode: { url: "", filename: "" } },
    };
    store.users.push(user);
    respondWithToken(user, 201, res);
  });

  r.post("/login", (req, res) => {
    const { email, password } = req.body || {};
    const user = store.users.find((u) => u.email === String(email || "").toLowerCase());
    if (!user || !store.verifyPassword(user, password))
      return fail(res, 401, "Incorrect email or password");
    respondWithToken(user, 200, res);
  });

  r.post("/logout", (req, res) => {
    res.clearCookie("token");
    send(res, 200, { success: true, message: "Logged out" });
  });

  r.get("/me", auth, (req, res) => send(res, 200, { success: true, user: store.publicUser(req.user) }));

  return r;
}

function listingRouter() {
  const r = express.Router();

  r.get("/filters", (req, res) =>
    send(res, 200, {
      success: true,
      categories: require("../models/Listing").CATEGORIES,
      amenities: require("../models/Listing").AMENITIES,
      bookingTypes: require("../models/Listing").BOOKING_TYPES,
      sorts: ["recommended", "newest", "price-asc", "price-desc", "rating"],
    })
  );

  r.get("/categories", (req, res) =>
    send(res, 200, { success: true, categories: require("../models/Listing").CATEGORIES })
  );

  r.get("/stats", (req, res) => {
    const avg =
      store.reviews.reduce((s, r2) => s + r2.rating, 0) / (store.reviews.length || 1);
    send(res, 200, {
      success: true,
      stats: {
        listings: store.listings.length,
        hosts: new Set(store.listings.map((l) => l.owner)).size,
        guests: store.users.filter((u) => u.role === "guest").length,
        bookings: store.bookings.filter((b) => ["confirmed", "completed"].includes(b.status)).length,
        reviews: store.reviews.length,
        avgRating: Math.round(avg * 10) / 10,
      },
    });
  });

  r.get("/featured", (req, res) => {
    const featured = store.listings
      .filter((l) => l.featured)
      .sort((a, b) => b.avgRating - a.avgRating)
      .slice(0, 6)
      .map(populateListing);
    send(res, 200, { success: true, count: featured.length, listings: featured });
  });

  r.get("/nearby", (req, res) =>
    send(res, 200, { success: true, count: 0, listings: [], message: "Demo mode has no geo lookup" })
  );

  r.get("/mine", auth, onlyRole("owner"), (req, res) => {
    const mine = store.listings
      .filter((l) => l.owner === req.user._id)
      .sort((a, b) => b.createdAt - a.createdAt)
      .map(populateListing);
    send(res, 200, { success: true, count: mine.length, listings: mine });
  });

  r.get("/", (req, res) => {
    const {
      search = "",
      category,
      bookingType,
      minPrice,
      maxPrice,
      guests,
      bedrooms,
      bathrooms,
      amenities,
      instantBook,
      featured,
      sort = "recommended",
      page = 1,
      limit = 12,
    } = req.query;

    let items = [...store.listings];
    const q = String(search).toLowerCase();
    if (q) {
      items = items.filter((l) =>
        [l.title, l.location, l.country, l.category].some((f) =>
          String(f).toLowerCase().includes(q)
        )
      );
    }
    if (category && category !== "All") items = items.filter((l) => l.category === category);
    if (bookingType) items = items.filter((l) => l.bookingType === bookingType);
    if (minPrice) items = items.filter((l) => l.price >= Number(minPrice));
    if (maxPrice) items = items.filter((l) => l.price <= Number(maxPrice));
    if (guests) items = items.filter((l) => l.maxGuests >= Number(guests));
    if (bedrooms) items = items.filter((l) => l.bedrooms >= Number(bedrooms));
    if (bathrooms) items = items.filter((l) => l.bathrooms >= Number(bathrooms));
    if (instantBook === "true") items = items.filter((l) => l.instantBook);
    if (featured === "true") items = items.filter((l) => l.featured);
    if (amenities) {
      const list = String(amenities).split(",").filter(Boolean);
      items = items.filter((l) => list.every((a) => l.amenities.includes(a)));
    }

    const sorts = {
      recommended: (a, b) => Number(b.featured) - Number(a.featured) || b.avgRating - a.avgRating,
      newest: (a, b) => b.createdAt - a.createdAt,
      "price-asc": (a, b) => a.price - b.price,
      "price-desc": (a, b) => b.price - a.price,
      rating: (a, b) => b.avgRating - a.avgRating,
    };
    items.sort(sorts[sort] || sorts.recommended);

    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.min(50, Math.max(1, Number(limit)));
    const total = items.length;
    const slice = items.slice((pageNum - 1) * limitNum, pageNum * limitNum).map(populateListing);

    send(res, 200, {
      success: true,
      count: slice.length,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum),
      sort,
      listings: slice,
    });
  });

  r.get("/:id/availability", (req, res) => {
    const booked = store.bookings
      .filter(
        (b) =>
          b.listing === req.params.id &&
          ["approved", "payment_submitted", "confirmed"].includes(b.status)
      )
      .map((b) => ({ checkIn: b.checkIn, checkOut: b.checkOut, status: b.status }));
    send(res, 200, { success: true, booked });
  });

  r.get("/:id", (req, res) => {
    const listing = store.findListing(req.params.id);
    if (!listing) return fail(res, 404, "Listing not found");

    const breakdown = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    listing.reviews.forEach((r2) => {
      if (breakdown[r2.rating] !== undefined) breakdown[r2.rating] += 1;
    });
    const today = new Date();
    const active = store.bookings.find(
      (b) =>
        b.listing === listing._id &&
        ["approved", "payment_submitted", "confirmed"].includes(b.status) &&
        new Date(b.checkIn) <= today &&
        new Date(b.checkOut) > today
    );
    send(res, 200, {
      success: true,
      listing: populateListing(listing),
      ratingBreakdown: breakdown,
      busyUntil: active ? active.checkOut : null,
    });
  });

  const saveListing = (req, res, existing) => {
    const b = req.body || {};
    const categories = require("../models/Listing").CATEGORIES;
    const amenities = require("../models/Listing").AMENITIES;

    if (!b.title || !b.description || !b.location || !b.country || b.price === undefined) {
      return fail(res, 400, "Title, description, location, country and price are required");
    }
    const amenityList = Array.isArray(b.amenities)
      ? b.amenities
      : String(b.amenities || "")
          .split(",")
          .map((a) => a.trim())
          .filter(Boolean);
    const bad = amenityList.find((a) => !amenities.includes(a));
    if (bad) return fail(res, 400, `Unknown amenity: ${bad}`);
    if (b.category && !categories.includes(b.category)) return fail(res, 400, "Unknown category");

    const data = {
      title: b.title,
      description: b.description,
      price: Number(b.price),
      cleaningFee: Number(b.cleaningFee || 0),
      securityDeposit: Number(b.securityDeposit || 0),
      location: b.location,
      country: b.country,
      category: b.category || "Trending",
      bookingType: b.bookingType || "Entire place",
      maxGuests: Number(b.maxGuests || 2),
      bedrooms: Number(b.bedrooms ?? 1),
      beds: Number(b.beds ?? 1),
      bathrooms: Number(b.bathrooms ?? 1),
      amenities: amenityList,
      instantBook: b.instantBook === true || b.instantBook === "true",
      updatedAt: new Date(),
    };
    if (req.file) data.image = { url: `/uploads/${req.file.filename}`, filename: req.file.filename };

    if (existing) {
      Object.assign(existing, data);
      return send(res, 200, { success: true, listing: existing });
    }
    const listing = {
      _id: store.nextId(),
      ...data,
      image: data.image || {
        url: "https://images.unsplash.com/photo-1500375592092-40eb2168fd21?q=80&w=1600",
        filename: "",
      },
      gallery: [],
      geometry: { type: "Point", coordinates: [0, 0] },
      reviews: [],
      avgRating: 0,
      reviewCount: 0,
      owner: req.user._id,
      featured: false,
      createdAt: new Date(),
    };
    store.listings.unshift(listing);
    return send(res, 201, { success: true, listing });
  };

  r.post("/", auth, onlyRole("owner"), (req, res) => saveListing(req, res, null));

  r.put("/:id", auth, onlyRole("owner"), (req, res) => {
    const listing = store.findListing(req.params.id);
    if (!listing) return fail(res, 404, "Listing not found");
    if (listing.owner !== req.user._id)
      return fail(res, 403, "You don't have permission to edit this listing");
    saveListing(req, res, listing);
  });

  r.delete("/:id", auth, onlyRole("owner"), (req, res) => {
    const listing = store.findListing(req.params.id);
    if (!listing) return fail(res, 404, "Listing not found");
    if (listing.owner !== req.user._id)
      return fail(res, 403, "You don't have permission to delete this listing");
    store.listings = store.listings.filter((l) => l._id !== listing._id);
    send(res, 200, { success: true, message: "Listing deleted" });
  });

  r.post("/:id/reviews", auth, (req, res) => {
    const listing = store.findListing(req.params.id);
    if (!listing) return fail(res, 404, "Listing not found");
    if (listing.owner === req.user._id) return fail(res, 403, "You can't review your own listing");
    const { rating, comment } = req.body || {};
    if (!rating || rating < 1 || rating > 5) return fail(res, 400, "Rating must be 1-5");
    if (!comment) return fail(res, 400, "Comment is required");

    const review = {
      _id: store.nextId(),
      comment,
      rating: Number(rating),
      author: req.user._id,
      username: req.user.username,
      listing: listing._id,
      createdAt: new Date(),
    };
    store.reviews.unshift(review);
    listing.reviews.unshift(review);
    listing.reviewCount = listing.reviews.length;
    listing.avgRating =
      Math.round((listing.reviews.reduce((s, r2) => s + r2.rating, 0) / listing.reviews.length) * 10) /
      10;
    send(res, 201, {
      success: true,
      review: { ...review, author: { username: req.user.username, avatar: "" } },
    });
  });

  r.delete("/:id/reviews/:reviewId", auth, (req, res) => {
    const listing = store.findListing(req.params.id);
    if (!listing) return fail(res, 404, "Listing not found");
    const review = listing.reviews.find((r2) => r2._id === req.params.reviewId);
    if (!review) return fail(res, 404, "Review not found");
    if (review.author !== req.user._id && listing.owner !== req.user._id)
      return fail(res, 403, "You don't have permission to delete this review");

    listing.reviews = listing.reviews.filter((r2) => r2._id !== review._id);
    store.reviews = store.reviews.filter((r2) => r2._id !== review._id);
    listing.reviewCount = listing.reviews.length;
    listing.avgRating = listing.reviews.length
      ? Math.round(
          (listing.reviews.reduce((s, r2) => s + r2.rating, 0) / listing.reviews.length) * 10
        ) / 10
      : 0;
    send(res, 200, { success: true, message: "Review deleted" });
  });

  return r;
}

function bookingRouter() {
  const r = express.Router();

  r.get("/availability/:listingId", (req, res) => {
    const booked = store.bookings
      .filter(
        (b) =>
          b.listing === req.params.listingId &&
          ["approved", "payment_submitted", "confirmed"].includes(b.status)
      )
      .map((b) => ({ checkIn: b.checkIn, checkOut: b.checkOut, status: b.status }));
    send(res, 200, { success: true, booked });
  });

  r.get("/quote", (req, res) => {
    const { listingId, checkIn, checkOut, guests = 1 } = req.query;
    const listing = store.findListing(listingId);
    if (!listing) return fail(res, 404, "Listing not found");
    const start = startOfDay(checkIn);
    const end = startOfDay(checkOut);
    const nights = Math.round((end - start) / DAY);
    if (!nights || nights <= 0) return send(res, 200, { success: true, quote: null });

    const unavailable = overlap(listing._id, start, end);
    send(res, 200, {
      success: true,
      available: !unavailable && Number(guests) <= listing.maxGuests,
      maxGuests: listing.maxGuests,
      instantBook: listing.instantBook,
      quote: store.breakdown(listing, nights),
    });
  });

  r.use(auth);

  r.post("/", onlyRole("guest"), (req, res) => {
    const { listingId, guests = 1, message = "" } = req.body || {};
    const listing = store.findListing(listingId);
    if (!listing) return fail(res, 404, "Listing not found");
    if (listing.owner === req.user._id) return fail(res, 400, "You can't book your own listing");

    const checkIn = startOfDay(req.body.checkIn);
    const checkOut = startOfDay(req.body.checkOut);
    if (checkIn < startOfDay(new Date())) return fail(res, 400, "Check-in date can't be in the past");
    if (checkOut <= checkIn) return fail(res, 400, "Check-out must be after check-in");
    if (overlap(listing._id, checkIn, checkOut))
      return fail(res, 409, "Those dates are no longer available");
    if (Number(guests) > listing.maxGuests)
      return fail(res, 400, `This stay hosts up to ${listing.maxGuests} guests`);

    const nights = Math.round((checkOut - checkIn) / DAY);
    const q = store.breakdown(listing, nights);
    const booking = {
      _id: store.nextId(),
      code: `WL-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
      listing: listing._id,
      guest: req.user._id,
      owner: listing.owner,
      checkIn,
      checkOut,
      nights,
      guests: Number(guests),
      pricePerNight: listing.price,
      cleaningFee: q.cleaningFee,
      serviceFee: q.serviceFee,
      securityDeposit: q.securityDeposit,
      totalPrice: q.total,
      message,
      status: listing.instantBook ? "approved" : "pending",
      paymentDueAt: listing.instantBook ? new Date(Date.now() + DAY) : undefined,
      payment: { status: "none", transactionId: "", screenshot: { url: "", filename: "" } },
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    store.bookings.push(booking);
    store.notifications.push({
      _id: store.nextId(),
      user: listing.owner,
      title: listing.instantBook ? "Instant booking" : "New booking request",
      message: `${req.user.username} requested ${listing.title} for ${nights} night(s).`,
      link: `/bookings/${booking._id}`,
      read: false,
      createdAt: new Date(),
    });
    send(res, 201, { success: true, booking });
  });

  r.get("/mine", onlyRole("guest"), (req, res) => {
    const mine = store.bookings
      .filter((b) => b.guest === req.user._id)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .map((b) => populateBooking(b, true));
    send(res, 200, { success: true, count: mine.length, bookings: mine });
  });

  r.get("/owner", onlyRole("owner"), (req, res) => {
    const { status } = req.query;
    const mine = store.bookings
      .filter((b) => b.owner === req.user._id && (!status || b.status === status))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .map((b) => populateBooking(b));
    send(res, 200, { success: true, count: mine.length, bookings: mine });
  });

  r.get("/owner/stats", onlyRole("owner"), (req, res) => {
    const mine = store.bookings.filter((b) => b.owner === req.user._id);
    const count = (s) => mine.filter((b) => b.status === s).length;
    const monthly = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i, 1);
      const total = mine
        .filter(
          (b) =>
            ["confirmed", "completed"].includes(b.status) &&
            new Date(b.checkIn).getMonth() === d.getMonth() &&
            new Date(b.checkIn).getFullYear() === d.getFullYear()
        )
        .reduce((s, b) => s + b.totalPrice, 0);
      monthly.push({ month: d.toLocaleString("en-IN", { month: "short" }), total });
    }
    send(res, 200, {
      success: true,
      stats: {
        listings: store.listings.filter((l) => l.owner === req.user._id).length,
        totalBookings: mine.length,
        pendingRequests: count("pending"),
        awaitingPayment: count("approved"),
        awaitingVerification: count("payment_submitted"),
        confirmed: count("confirmed"),
        completed: count("completed"),
        earnings: mine
          .filter((b) => ["confirmed", "completed"].includes(b.status))
          .reduce((s, b) => s + b.totalPrice, 0),
        upcomingStays: mine.filter(
          (b) => ["approved", "confirmed"].includes(b.status) && new Date(b.checkIn) > new Date()
        ).length,
      },
      monthly,
    });
  });

  r.put("/:id/payment", onlyRole("guest"), (req, res) => {
    const booking = store.findBooking(req.params.id);
    if (!booking) return fail(res, 404, "Booking not found");
    if (booking.guest !== req.user._id) return fail(res, 403, "You don't have permission to do that");
    if (booking.status !== "approved") return fail(res, 400, "There's nothing to pay right now");

    const txId = String((req.body && req.body.transactionId) || "").trim();
    if (txId.length < 6) return fail(res, 400, "Enter a valid transaction ID (6+ characters)");

    booking.payment.status = "submitted";
    booking.payment.transactionId = txId;
    booking.payment.submittedAt = new Date();
    if (req.file) booking.payment.screenshot = { url: `/uploads/${req.file.filename}`, filename: req.file.filename };
    booking.status = "payment_submitted";
    booking.updatedAt = new Date();
    send(res, 200, { success: true, booking });
  });

  const ownerAction = (allowed, mutate, message) => (req, res) => {
    const booking = store.findBooking(req.params.id);
    if (!booking) return fail(res, 404, "Booking not found");
    if (booking.owner !== req.user._id) return fail(res, 403, "You don't have permission to do that");
    if (!allowed.includes(booking.status))
      return fail(res, 400, `You can't do that while the booking is ${booking.status}`);
    mutate(booking, req);
    booking.updatedAt = new Date();
    send(res, 200, { success: true, booking, message });
  };

  r.put(
    "/:id/approve",
    onlyRole("owner"),
    ownerAction(
      ["pending"],
      (b) => {
        b.status = "approved";
        b.paymentDueAt = new Date(Date.now() + DAY);
      },
      "Booking approved"
    )
  );

  r.put(
    "/:id/reject",
    onlyRole("owner"),
    ownerAction(
      ["pending"],
      (b, req) => {
        b.status = "rejected";
        b.decisionReason = (req.body?.reason || "Not available").slice(0, 300);
      },
      "Booking declined"
    )
  );

  r.put(
    "/:id/payment/verify",
    onlyRole("owner"),
    ownerAction(
      ["payment_submitted"],
      (b) => {
        b.status = "confirmed";
        b.payment.status = "verified";
        b.payment.verifiedAt = new Date();
      },
      "Payment verified"
    )
  );

  r.put(
    "/:id/payment/reject",
    onlyRole("owner"),
    ownerAction(
      ["payment_submitted"],
      (b, req) => {
        b.status = "approved";
        b.payment.status = "rejected";
        b.payment.rejectReason = (req.body?.reason || "Payment not received").slice(0, 300);
        b.paymentDueAt = new Date(Date.now() + DAY);
      },
      "Payment rejected"
    )
  );

  r.get("/:id/invoice", (req, res) => {
    const booking = store.findBooking(req.params.id);
    if (!booking) return fail(res, 404, "Booking not found");
    const isGuest = booking.guest === req.user._id;
    const isOwner = booking.owner === req.user._id;
    if (!isGuest && !isOwner) return fail(res, 403, "You don't have access to this invoice");
    if (!["confirmed", "completed"].includes(booking.status))
      return fail(res, 400, "An invoice is only available once the booking is confirmed");

    const b = populateBooking(booking);
    const subtotal = booking.nights * booking.pricePerNight;
    send(res, 200, {
      success: true,
      invoice: {
        number: `INV-${booking.code.replace("WL-", "")}`,
        bookingCode: booking.code,
        issuedAt: booking.payment?.verifiedAt || booking.updatedAt,
        status: booking.status,
        listing: {
          id: b.listing._id,
          title: b.listing.title,
          location: b.listing.location,
          country: b.listing.country,
          image: b.listing.image?.url,
        },
        guest: b.guest,
        host: b.owner,
        checkIn: booking.checkIn,
        checkOut: booking.checkOut,
        nights: booking.nights,
        guests: booking.guests,
        lines: [
          {
            label: `₹${booking.pricePerNight.toLocaleString("en-IN")} × ${booking.nights} night${
              booking.nights > 1 ? "s" : ""
            }`,
            amount: subtotal,
          },
          { label: "Cleaning fee", amount: booking.cleaningFee || 0 },
          { label: "Service fee", amount: booking.serviceFee || 0 },
        ],
        subtotal,
        cleaningFee: booking.cleaningFee || 0,
        serviceFee: booking.serviceFee || 0,
        securityDeposit: booking.securityDeposit || 0,
        total: booking.totalPrice,
        transactionId: booking.payment?.transactionId || "",
        paidAt: booking.payment?.verifiedAt || null,
      },
    });
  });

  r.put("/:id/cancel", (req, res) => {
    const booking = store.findBooking(req.params.id);
    if (!booking) return fail(res, 404, "Booking not found");
    const isGuest = booking.guest === req.user._id;
    const isOwner = booking.owner === req.user._id;
    if (!isGuest && !isOwner) return fail(res, 403, "You don't have permission to cancel this booking");
    if (!["pending", "approved", "payment_submitted", "confirmed"].includes(booking.status))
      return fail(res, 400, "This booking can't be cancelled");

    booking.status = "cancelled";
    booking.cancelledBy = isGuest ? "guest" : "owner";
    booking.decisionReason = (req.body?.reason || "").slice(0, 300);
    booking.updatedAt = new Date();
    send(res, 200, { success: true, booking });
  });

  r.get("/:id", (req, res) => {
    const booking = store.findBooking(req.params.id);
    if (!booking) return fail(res, 404, "Booking not found");
    const isGuest = booking.guest === req.user._id;
    const isOwner = booking.owner === req.user._id;
    if (!isGuest && !isOwner) return fail(res, 403, "You don't have access to this booking");
    const data = populateBooking(booking, isGuest);
    data.viewerRole = isGuest ? "guest" : "owner";
    send(res, 200, { success: true, booking: data });
  });

  return r;
}

function userRouter() {
  const r = express.Router();
  r.use(auth);

  r.get("/me", (req, res) => {
    const withWishlist = {
      ...store.publicUser(req.user),
      wishlist: req.user.wishlist
        .map((id) => store.findListing(id))
        .filter(Boolean)
        .map((l) => ({ _id: l._id, title: l.title, image: l.image, location: l.location, price: l.price })),
    };
    send(res, 200, { success: true, user: withWishlist });
  });

  r.put("/me", (req, res) => {
    const { username, bio, avatar, phone } = req.body || {};
    if (username && username !== req.user.username) {
      if (store.users.some((u) => u.username === username))
        return fail(res, 400, "That username is already taken");
      req.user.username = username;
    }
    if (bio !== undefined) req.user.bio = bio;
    if (phone !== undefined) req.user.phone = phone;
    if (avatar !== undefined) req.user.avatar = avatar;
    send(res, 200, { success: true, user: store.publicUser(req.user) });
  });

  r.put("/me/payment", onlyRole("owner"), (req, res) => {
    const { upiId, payeeName } = req.body || {};
    if (upiId !== undefined) {
      const trimmed = String(upiId).trim();
      if (trimmed && !/^[\w.\-]{2,}@[\w.\-]{2,}$/.test(trimmed))
        return fail(res, 400, "Enter a valid UPI ID, e.g. name@okbank");
      req.user.payment.upiId = trimmed;
    }
    if (payeeName !== undefined) req.user.payment.payeeName = String(payeeName).trim();
    if (req.file) req.user.payment.qrCode = { url: `/uploads/${req.file.filename}`, filename: req.file.filename };
    if (req.body?.removeQr === "true") req.user.payment.qrCode = { url: "", filename: "" };
    send(res, 200, { success: true, user: store.publicUser(req.user) });
  });

  r.get("/me/wishlist", (req, res) => {
    const wishlist = req.user.wishlist.map((id) => store.findListing(id)).filter(Boolean);
    send(res, 200, { success: true, wishlist: wishlist.map(populateListing) });
  });

  r.post("/me/wishlist/:listingId", (req, res) => {
    const listing = store.findListing(req.params.listingId);
    if (!listing) return fail(res, 404, "Listing not found");
    const idx = req.user.wishlist.indexOf(listing._id);
    let added;
    if (idx === -1) {
      req.user.wishlist.push(listing._id);
      added = true;
    } else {
      req.user.wishlist.splice(idx, 1);
      added = false;
    }
    send(res, 200, { success: true, added, wishlist: req.user.wishlist });
  });

  return r;
}

function notificationRouter() {
  const r = express.Router();
  r.use(auth);

  r.get("/", (req, res) => {
    const mine = store.notifications
      .filter((n) => n.user === req.user._id)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    send(res, 200, {
      success: true,
      unreadCount: mine.filter((n) => !n.read).length,
      notifications: mine,
    });
  });

  r.put("/read-all", (req, res) => {
    store.notifications.forEach((n) => {
      if (n.user === req.user._id) n.read = true;
    });
    send(res, 200, { success: true, unreadCount: 0 });
  });

  r.put("/:id/read", (req, res) => {
    const n = store.notifications.find((x) => x._id === req.params.id);
    if (n) n.read = true;
    send(res, 200, { success: true });
  });

  return r;
}

function reviewRouter() {
  const r = express.Router();
  r.get("/recent", (req, res) => {
    const limit = Math.min(12, Math.max(1, Number(req.query.limit) || 6));
    const recent = [...store.reviews]
      .filter((r2) => r2.rating >= 4)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, limit)
      .map((r2) => {
        const listing = store.findListing(r2.listing);
        return {
          ...r2,
          author: store.publicUser(store.users.find((u) => u._id === r2.author)) || {
            username: r2.username,
          },
          listing: listing
            ? { title: listing.title, location: listing.location, image: listing.image }
            : null,
        };
      });
    send(res, 200, { success: true, count: recent.length, reviews: recent });
  });
  return r;
}

function tripRouter() {
  const r = express.Router();
  r.get("/", auth, onlyRole("guest"), (req, res) => {
    const mine = store.bookings
      .filter((b) => b.guest === req.user._id)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .map((b) => populateBooking(b, true));
    send(res, 200, { success: true, count: mine.length, bookings: mine });
  });
  return r;
}

module.exports = {
  authRouter,
  listingRouter,
  bookingRouter,
  userRouter,
  notificationRouter,
  reviewRouter,
  tripRouter,
  store,
};
