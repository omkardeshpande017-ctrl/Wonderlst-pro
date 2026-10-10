const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, "Username is required"],
      unique: true,
      trim: true,
      minlength: 3,
      maxlength: 30,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, "Enter a valid email"],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: 6,
      select: false,
    },
    role: {
      type: String,
      enum: ["guest", "owner"],
      default: "guest",
    },
    phone: { type: String, default: "", trim: true },
    avatar: { type: String, default: "" },
    bio: { type: String, default: "", maxlength: 300 },
    // Owner payment details (UPI QR)
    payment: {
      upiId: { type: String, default: "", trim: true },
      payeeName: { type: String, default: "", trim: true },
      qrCode: {
        url: { type: String, default: "" },
        filename: { type: String, default: "" },
      },
    },
    wishlist: [{ type: mongoose.Schema.Types.ObjectId, ref: "Listing" }],
  },
  { timestamps: true }
);

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.comparePassword = async function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

userSchema.methods.hasPaymentSetup = function () {
  return !!(this.payment && (this.payment.qrCode?.url || this.payment.upiId));
};

// Only ever returned to the user themselves
userSchema.methods.toSafeObject = function () {
  return {
    _id: this._id,
    username: this.username,
    email: this.email,
    role: this.role,
    phone: this.phone,
    avatar: this.avatar,
    bio: this.bio,
    payment: this.role === "owner" ? this.payment : undefined,
    wishlist: this.wishlist,
    createdAt: this.createdAt,
  };
};

module.exports = mongoose.model("User", userSchema);
