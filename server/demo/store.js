// In-memory demo store used when the app runs in DEMO_MODE.
// Lets the deployed frontend work end-to-end without an external database.
const bcrypt = require("bcryptjs");
const catalog = require("../seed/data");

const hash = (pw) => bcrypt.hashSync(pw, 10);
const oid = (n) =>
  (Date.now().toString(16).slice(-8) + String(n).padStart(16, "0")).slice(0, 24);

const day = 24 * 60 * 60 * 1000;
const startOfDay = (d) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};
const fromNow = (n) => new Date(startOfDay(new Date()).getTime() + n * day);

let seq = 100;

const users = [
  {
    _id: oid(1),
    username: "demo_owner",
    email: "owner@wanderlust.com",
    password: hash("password123"),
    role: "owner",
    phone: "9876543210",
    bio: "Superhost with stays across India.",
    avatar: "",
    wishlist: [],
    createdAt: new Date("2024-02-11"),
    payment: {
      upiId: "demoowner@okbank",
      payeeName: "Demo Owner",
      qrCode: { url: "/uploads/demo-qr.svg", filename: "demo-qr.svg" },
    },
  },
  {
    _id: oid(2),
    username: "mountain_host",
    email: "host@wanderlust.com",
    password: hash("password123"),
    role: "owner",
    phone: "9800011122",
    bio: "Mountain and backwater stays, hosted by our family for 12 years.",
    avatar: "",
    wishlist: [],
    createdAt: new Date("2023-08-04"),
    payment: {
      upiId: "mountainhost@okbank",
      payeeName: "Mountain Host",
      qrCode: { url: "/uploads/demo-qr.svg", filename: "demo-qr.svg" },
    },
  },
  {
    _id: oid(3),
    username: "demo_guest",
    email: "guest@wanderlust.com",
    password: hash("password123"),
    role: "guest",
    phone: "9123456780",
    bio: "",
    avatar: "",
    wishlist: [],
    createdAt: new Date("2025-01-19"),
  },
  {
    _id: oid(4),
    username: "travel_priya",
    email: "priya@wanderlust.com",
    password: hash("password123"),
    role: "guest",
    phone: "",
    bio: "",
    avatar: "",
    wishlist: [],
    createdAt: new Date("2025-03-02"),
  },
];

const listings = catalog.map((item, i) => ({
  ...item,
  _id: oid(50 + i),
  owner: i < 8 ? users[0]._id : users[1]._id,
  reviews: [],
  avgRating: 0,
  reviewCount: 0,
  createdAt: new Date(Date.now() - i * 86400000),
}));

const REVIEW_TEXTS = [
  [5, "Exactly like the photos. Spotless, quiet, and the host replied within minutes."],
  [5, "One of the best stays we've booked. We're already planning to come back."],
  [4, "Lovely place and great location. The check-in instructions could be clearer."],
  [5, "Beautiful property, thoughtful touches everywhere. Worth every rupee."],
  [4, "Very comfortable and well kept. Breakfast was a highlight."],
  [3, "Good stay overall, but the wifi was slow in the evenings."],
  [5, "The view alone is worth it. Host went out of their way to help us."],
  [4, "Clean, spacious and exactly as described. Would book again."],
];

const reviews = [];
listings.forEach((listing, i) => {
  const count = 1 + (i % 3);
  for (let j = 0; j < count; j++) {
    const [rating, comment] = REVIEW_TEXTS[(i + j) % REVIEW_TEXTS.length];
    const author = users[2 + ((i + j) % 2)];
    const review = {
      _id: oid(200 + reviews.length),
      comment,
      rating,
      author: author._id,
      username: author.username,
      listing: listing._id,
      createdAt: new Date(Date.now() - (i + j) * 3600000),
    };
    reviews.push(review);
    listing.reviews.push(review);
  }
  listing.avgRating =
    Math.round((listing.reviews.reduce((s, r) => s + r.rating, 0) / listing.reviews.length) * 10) / 10;
  listing.reviewCount = listing.reviews.length;
});

const SERVICE_FEE_RATE = 0.05;
const breakdown = (listing, nights) => {
  const subtotal = Math.round(nights * listing.price);
  const cleaningFee = Math.round(listing.cleaningFee || 0);
  const serviceFee = Math.round(subtotal * SERVICE_FEE_RATE);
  const securityDeposit = Math.round(listing.securityDeposit || 0);
  return {
    nights,
    pricePerNight: listing.price,
    subtotal,
    cleaningFee,
    serviceFee,
    serviceFeeRate: SERVICE_FEE_RATE,
    securityDeposit,
    total: subtotal + cleaningFee + serviceFee,
    dueNow: subtotal + cleaningFee + serviceFee + securityDeposit,
  };
};

const phone = (n) => String(n).padStart(4, "0");

const bookings = [];
const makeBooking = (listing, guest, startOffset, nights, status, extra = {}) => {
  const checkIn = fromNow(startOffset);
  const checkOut = fromNow(startOffset + nights);
  const q = breakdown(listing, nights);
  const booking = {
    _id: oid(300 + bookings.length),
    code: `WL-DEMO${phone(bookings.length + 1)}`,
    listing: listing._id,
    guest: guest._id,
    owner: listing.owner,
    checkIn,
    checkOut,
    nights,
    guests: 2,
    pricePerNight: listing.price,
    cleaningFee: q.cleaningFee,
    serviceFee: q.serviceFee,
    securityDeposit: q.securityDeposit,
    totalPrice: q.total,
    message: "Looking forward to a relaxing stay!",
    status,
    payment: {
      status: "none",
      transactionId: "",
      screenshot: { url: "", filename: "" },
      rejectReason: "",
    },
    decisionReason: "",
    cancelledBy: "",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...extra,
  };
  bookings.push(booking);
  return booking;
};

makeBooking(listings[0], users[2], 10, 3, "pending");
makeBooking(listings[2], users[2], 20, 4, "approved", {
  paymentDueAt: new Date(Date.now() + day),
});
makeBooking(listings[3], users[3], 15, 2, "payment_submitted", {
  paymentDueAt: new Date(Date.now() + day),
  payment: {
    status: "submitted",
    transactionId: "412345678901",
    screenshot: { url: "", filename: "" },
    rejectReason: "",
    submittedAt: new Date(),
  },
});
makeBooking(listings[4], users[2], 30, 2, "confirmed", {
  payment: {
    status: "verified",
    transactionId: "498765432109",
    screenshot: { url: "", filename: "" },
    rejectReason: "",
    submittedAt: new Date(),
    verifiedAt: new Date(),
  },
});
makeBooking(listings[1], users[3], -12, 3, "completed", {
  payment: {
    status: "verified",
    transactionId: "455566677788",
    screenshot: { url: "", filename: "" },
    rejectReason: "",
    submittedAt: new Date(Date.now() - 15 * day),
    verifiedAt: new Date(Date.now() - 15 * day),
  },
});

const notifications = [
  {
    _id: oid(400),
    user: users[0]._id,
    title: "New booking request",
    message: "demo_guest requested Cozy Cabin Retreat for 3 nights.",
    link: "/dashboard",
    read: false,
    createdAt: new Date(),
  },
];

const store = {
  get _seq() {
    return seq;
  },
  set _seq(value) {
    seq = Number(value) || seq;
  },
  users,
  listings,
  reviews,
  bookings,
  notifications,
  breakdown,
  SERVICE_FEE_RATE,
  nextId: () => {
    seq += 1;
    return oid(seq);
  },
  // Always read through the live array: `store.listings` can be replaced
  // (delete, or a restored snapshot), so a cached closure would go stale.
  findUser: (predicate) => store.users.find(predicate),
  findListing: (id) => store.listings.find((l) => String(l._id) === String(id)),
  findBooking: (id) => store.bookings.find((b) => String(b._id) === String(id)),
  publicUser: (user) => {
    if (!user) return null;
    const { password, ...rest } = user;
    return {
      ...rest,
      payment: user.role === "owner" ? user.payment : undefined,
    };
  },
  verifyPassword: (user, candidate) => user && bcrypt.compareSync(candidate, user.password),
};

module.exports = store;
