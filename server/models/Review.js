const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema(
  {
    comment: {
      type: String,
      required: [true, "Review comment is required"],
      maxlength: 500,
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
      required: true,
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    username: String,
    listing: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Listing",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Review", reviewSchema);
