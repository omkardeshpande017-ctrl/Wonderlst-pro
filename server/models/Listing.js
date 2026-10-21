const mongoose = require("mongoose");
const Review = require("./Review");

const CATEGORIES = [
  "Trending",
  "Rooms",
  "Iconic Cities",
  "Mountains",
  "Castles",
  "Amazing Pools",
  "Camping",
  "Farms",
  "Arctic",
  "Boats",
  "Beachfront",
];

// Kept in one place so the client can render icons/labels from the API
const AMENITIES = [
  "Wifi",
  "Kitchen",
  "Free parking",
  "Air conditioning",
  "Pool",
  "Hot tub",
  "TV",
  "Washer",
  "Workspace",
  "Breakfast",
  "Fireplace",
  "Pet friendly",
  "Gym",
  "Sea view",
  "Mountain view",
  "Self check-in",
];

// The kind of place being booked — shown as a badge and used for filtering
const BOOKING_TYPES = ["Entire place", "Private room", "Shared room"];

const listingSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
      maxlength: 100,
    },
    description: {
      type: String,
      required: [true, "Description is required"],
      maxlength: 2000,
    },
    image: {
      url: {
        type: String,
        default:
          "https://images.unsplash.com/photo-1500375592092-40eb2168fd21?q=80&w=1600",
      },
      filename: { type: String, default: "" },
    },
    // Extra photos for the gallery on the detail page
    gallery: [{ url: String, filename: String }],

    price: {
      type: Number,
      required: [true, "Price is required"],
      min: [0, "Price cannot be negative"],
    },
    cleaningFee: { type: Number, default: 0, min: 0 },
    securityDeposit: { type: Number, default: 0, min: 0 },

    location: { type: String, required: true, trim: true },
    country: { type: String, required: true, trim: true },
    category: {
      type: String,
      enum: CATEGORIES,
      default: "Trending",
    },
    bookingType: {
      type: String,
      enum: BOOKING_TYPES,
      default: "Entire place",
    },

    maxGuests: { type: Number, default: 2, min: 1, max: 30 },
    bedrooms: { type: Number, default: 1, min: 0, max: 30 },
    beds: { type: Number, default: 1, min: 1, max: 60 },
    bathrooms: { type: Number, default: 1, min: 0, max: 30 },

    amenities: {
      type: [String],
      default: [],
      validate: {
        validator: (arr) => arr.every((a) => AMENITIES.includes(a)),
        message: "Unknown amenity",
      },
    },

    // Business rules an owner can toggle
    instantBook: { type: Boolean, default: false },
    featured: { type: Boolean, default: false },

    geometry: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number],
        default: [0, 0],
      },
    },
    reviews: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Review",
      },
    ],
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    avgRating: { type: Number, default: 0 },
    reviewCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

listingSchema.index({ title: "text", location: "text", country: "text" });
listingSchema.index({ geometry: "2dsphere" });
listingSchema.index({ price: 1 });
listingSchema.index({ category: 1, price: 1 });

listingSchema.post("findOneAndDelete", async (listing) => {
  if (listing && listing.reviews.length) {
    await Review.deleteMany({ _id: { $in: listing.reviews } });
  }
});

listingSchema.statics.CATEGORIES = CATEGORIES;
listingSchema.statics.AMENITIES = AMENITIES;
listingSchema.statics.BOOKING_TYPES = BOOKING_TYPES;

module.exports = mongoose.model("Listing", listingSchema);
