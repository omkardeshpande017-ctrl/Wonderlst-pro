const mongoose = require("mongoose");

const STATUSES = [
  "pending", // guest requested, waiting for owner
  "approved", // owner accepted, waiting for guest payment
  "payment_submitted", // guest paid, waiting for owner to verify
  "confirmed", // owner verified payment
  "completed", // stay finished
  "rejected", // owner declined the request
  "cancelled", // cancelled by guest or owner
  "expired", // guest did not pay in time
];

// Statuses that hold the dates on the calendar
const BLOCKING_STATUSES = ["approved", "payment_submitted", "confirmed"];

const bookingSchema = new mongoose.Schema(
  {
    code: { type: String, unique: true, index: true },
    listing: { type: mongoose.Schema.Types.ObjectId, ref: "Listing", required: true },
    guest: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    checkIn: { type: Date, required: true },
    checkOut: { type: Date, required: true },
    nights: { type: Number, required: true },
    guests: { type: Number, default: 1, min: 1 },
    pricePerNight: { type: Number, required: true },
    cleaningFee: { type: Number, default: 0 },
    serviceFee: { type: Number, default: 0 },
    securityDeposit: { type: Number, default: 0 },
    totalPrice: { type: Number, required: true },
    message: { type: String, default: "", maxlength: 500 },
    // Set when the guest cancels — the host can then see why
    cancelReason: { type: String, default: "", maxlength: 300 },
    status: { type: String, enum: STATUSES, default: "pending", index: true },
    paymentDueAt: { type: Date },
    payment: {
      status: {
        type: String,
        enum: ["none", "submitted", "verified", "rejected"],
        default: "none",
      },
      transactionId: { type: String, default: "" },
      screenshot: {
        url: { type: String, default: "" },
        filename: { type: String, default: "" },
      },
      submittedAt: Date,
      verifiedAt: Date,
      rejectReason: { type: String, default: "" },
    },
    decisionReason: { type: String, default: "" }, // reject / cancel reason
    cancelledBy: { type: String, enum: ["guest", "owner", ""], default: "" },
  },
  { timestamps: true }
);

bookingSchema.index({ listing: 1, checkIn: 1, checkOut: 1 });

bookingSchema.pre("validate", function (next) {
  if (!this.code) {
    const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
    this.code = `WL-${rand}`;
  }
  next();
});

bookingSchema.statics.STATUSES = STATUSES;
bookingSchema.statics.BLOCKING_STATUSES = BLOCKING_STATUSES;

module.exports = mongoose.model("Booking", bookingSchema);
