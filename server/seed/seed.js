require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const mongoose = require("mongoose");
const User = require("../models/User");
const Listing = require("../models/Listing");
const Review = require("../models/Review");
const Booking = require("../models/Booking");
const Notification = require("../models/Notification");
const sampleListings = require("./data");

const day = 24 * 60 * 60 * 1000;
const dateFromNow = (n) => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return new Date(d.getTime() + n * day);
};

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected for seeding...");

  await Promise.all([
    Notification.deleteMany({}),
    Booking.deleteMany({}),
    Review.deleteMany({}),
    Listing.deleteMany({}),
    User.deleteMany({}),
  ]);

  const owner = await User.create({
    username: "demo_owner",
    email: "owner@wanderlust.com",
    password: "password123",
    role: "owner",
    phone: "9876543210",
    bio: "Superhost with stays across India.",
    payment: {
      upiId: "demoowner@okbank",
      payeeName: "Demo Owner",
      qrCode: { url: "/uploads/demo-qr.svg", filename: "demo-qr.svg" },
    },
  });
  const guest = await User.create({
    username: "demo_guest",
    email: "guest@wanderlust.com",
    password: "password123",
    role: "guest",
    phone: "9123456780",
  });
  const guest2 = await User.create({
    username: "travel_priya",
    email: "priya@wanderlust.com",
    password: "password123",
    role: "guest",
  });

  const listings = await Listing.insertMany(
    sampleListings.map((l) => ({ ...l, owner: owner._id }))
  );

  // A second host so the home page and search don't look like a one-owner site
  const host2 = await User.create({
    username: "mountain_host",
    email: "host@wanderlust.com",
    password: "password123",
    role: "owner",
    phone: "9800011122",
    bio: "Mountain and backwater stays, run by a family that has hosted for 12 years.",
    payment: {
      upiId: "mountainhost@okbank",
      payeeName: "Mountain Host",
      qrCode: { url: "/uploads/demo-qr.svg", filename: "demo-qr.svg" },
    },
  });

  // Give the second host the last four listings
  const reassigned = listings.slice(-4).map((l) => l._id);
  await Listing.updateMany({ _id: { $in: reassigned } }, { owner: host2._id });

  const SERVICE_FEE_RATE = 0.05;
  const quote = (listing, nights) => {
    const subtotal = nights * listing.price;
    const cleaningFee = listing.cleaningFee || 0;
    const serviceFee = Math.round(subtotal * SERVICE_FEE_RATE);
    return {
      cleaningFee,
      serviceFee,
      securityDeposit: listing.securityDeposit || 0,
      totalPrice: subtotal + cleaningFee + serviceFee,
    };
  };

  const make = async (listing, who, start, nights, status, extra = {}) => {
    const checkIn = dateFromNow(start);
    const checkOut = dateFromNow(start + nights);
    const listingOwner = listing.owner; // may be host2 after reassignment
    return Booking.create({
      listing: listing._id,
      guest: who._id,
      owner: listingOwner,
      checkIn,
      checkOut,
      nights,
      guests: 2,
      pricePerNight: listing.price,
      ...quote(listing, nights),
      status,
      message: "Looking forward to a relaxing stay!",
      ...extra,
    });
  };

  await make(listings[0], guest, 10, 3, "pending");
  await make(listings[2], guest, 20, 4, "approved", {
    paymentDueAt: new Date(Date.now() + day),
  });
  await make(listings[3], guest2, 15, 2, "payment_submitted", {
    paymentDueAt: new Date(Date.now() + day),
    payment: {
      status: "submitted",
      transactionId: "412345678901",
      submittedAt: new Date(),
    },
  });
  await make(listings[4], guest, 30, 2, "confirmed", {
    payment: {
      status: "verified",
      transactionId: "498765432109",
      submittedAt: new Date(),
      verifiedAt: new Date(),
    },
  });
  await make(listings[1], guest2, -12, 3, "completed", {
    payment: {
      status: "verified",
      transactionId: "455566677788",
      submittedAt: new Date(Date.now() - 15 * day),
      verifiedAt: new Date(Date.now() - 15 * day),
    },
  });

  await Notification.create({
    user: owner._id,
    title: "New booking request",
    message: "demo_guest requested Cozy Cabin Retreat for 3 nights.",
    link: "/dashboard",
  });

  // ---- Reviews: real ratings so avgRating, reviewCount and the breakdown bars work ----
  const reviewTexts = [
    [5, "Exactly like the photos. Spotless, quiet, and the host replied within minutes."],
    [5, "One of the best stays we've booked. We're already planning to come back."],
    [4, "Lovely place and great location. The check-in instructions could be clearer."],
    [5, "Beautiful property, thoughtful touches everywhere. Worth every rupee."],
    [4, "Very comfortable and well kept. Breakfast was a highlight."],
    [3, "Good stay overall, but the wifi was slow in the evenings."],
    [5, "The view alone is worth it. Host went out of their way to help us."],
    [4, "Clean, spacious and exactly as described. Would book again."],
  ];

  const reviewers = [guest, guest2];
  let reviewTotal = 0;

  for (let i = 0; i < listings.length; i++) {
    const listing = listings[i];
    // Each listing gets 1-3 reviews so the site doesn't look brand new
    const howMany = 1 + (i % 3);
    const ids = [];
    for (let j = 0; j < howMany; j++) {
      const [rating, comment] = reviewTexts[(i + j) % reviewTexts.length];
      const author = reviewers[(i + j) % reviewers.length];
      const review = await Review.create({
        comment,
        rating,
        author: author._id,
        username: author.username,
        listing: listing._id,
      });
      ids.push(review._id);
      reviewTotal++;
    }

    const agg = await Review.find({ _id: { $in: ids } });
    const avg = agg.reduce((s, r) => s + r.rating, 0) / agg.length;
    await Listing.findByIdAndUpdate(listing._id, {
      reviews: ids,
      avgRating: Math.round(avg * 10) / 10,
      reviewCount: ids.length,
    });
  }

  console.log(`Seeded ${listings.length} listings, 5 bookings and ${reviewTotal} reviews.`);
  console.log("Owner login : owner@wanderlust.com / password123");
  console.log("Owner 2     : host@wanderlust.com / password123");
  console.log("Guest login : guest@wanderlust.com / password123");
  await mongoose.connection.close();
  process.exit(0);
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
