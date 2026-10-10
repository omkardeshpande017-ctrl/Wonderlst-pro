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

  const make = async (listing, who, start, nights, status, extra = {}) => {
    const checkIn = dateFromNow(start);
    const checkOut = dateFromNow(start + nights);
    return Booking.create({
      listing: listing._id,
      guest: who._id,
      owner: owner._id,
      checkIn,
      checkOut,
      nights,
      guests: 2,
      pricePerNight: listing.price,
      totalPrice: listing.price * nights,
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

  console.log(`Seeded ${listings.length} listings and 5 bookings.`);
  console.log("Owner login : owner@wanderlust.com / password123");
  console.log("Guest login : guest@wanderlust.com / password123");
  await mongoose.connection.close();
  process.exit(0);
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
