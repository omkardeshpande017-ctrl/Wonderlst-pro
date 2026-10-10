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
    price: {
      type: Number,
      required: [true, "Price is required"],
      min: [0, "Price cannot be negative"],
    },
    location: { type: String, required: true, trim: true },
    country: { type: String, required: true, trim: true },
    category: {
      type: String,
      enum: CATEGORIES,
      default: "Trending",
    },
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
  },
  { timestamps: true }
);

listingSchema.index({ title: "text", location: "text", country: "text" });
listingSchema.index({ geometry: "2dsphere" });

listingSchema.post("findOneAndDelete", async (listing) => {
  if (listing && listing.reviews.length) {
    await Review.deleteMany({ _id: { $in: listing.reviews } });
  }
});

listingSchema.statics.CATEGORIES = CATEGORIES;

module.exports = mongoose.model("Listing", listingSchema);
