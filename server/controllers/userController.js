const User = require("../models/User");
const Listing = require("../models/Listing");
const ApiError = require("../utils/ApiError");
const catchAsync = require("../utils/catchAsync");
const { fileInfo } = require("../middleware/upload");

exports.updateProfile = catchAsync(async (req, res, next) => {
  const { username, bio, avatar, phone } = req.body;
  const user = await User.findById(req.user._id);

  if (username && username !== user.username) {
    const taken = await User.findOne({ username });
    if (taken) return next(new ApiError(400, "That username is already taken"));
    user.username = username;
  }
  if (bio !== undefined) user.bio = bio;
  if (phone !== undefined) user.phone = phone;
  if (avatar !== undefined) user.avatar = avatar;

  await user.save();
  res.status(200).json({ success: true, user: user.toSafeObject() });
});

exports.getWishlist = catchAsync(async (req, res) => {
  const user = await User.findById(req.user._id).populate({
    path: "wishlist",
    populate: { path: "owner", select: "username" },
  });
  res.status(200).json({ success: true, wishlist: user.wishlist });
});

exports.toggleWishlist = catchAsync(async (req, res, next) => {
  const { listingId } = req.params;
  const listing = await Listing.findById(listingId);
  if (!listing) return next(new ApiError(404, "Listing not found"));

  const user = await User.findById(req.user._id);
  const idx = user.wishlist.findIndex((id) => id.toString() === listingId);

  let added;
  if (idx === -1) {
    user.wishlist.push(listingId);
    added = true;
  } else {
    user.wishlist.splice(idx, 1);
    added = false;
  }
  await user.save();

  res.status(200).json({ success: true, added, wishlist: user.wishlist });
});

// Owner: save UPI ID, payee name and QR code image
exports.updatePayment = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user._id);
  const { upiId, payeeName } = req.body;

  if (upiId !== undefined) {
    const trimmed = upiId.trim();
    if (trimmed && !/^[\w.\-]{2,}@[\w.\-]{2,}$/.test(trimmed)) {
      return next(new ApiError(400, "Enter a valid UPI ID, e.g. name@okbank"));
    }
    user.payment.upiId = trimmed;
  }
  if (payeeName !== undefined) user.payment.payeeName = payeeName.trim();
  if (req.file) user.payment.qrCode = fileInfo(req.file);
  if (req.body.removeQr === "true") user.payment.qrCode = { url: "", filename: "" };

  await user.save();
  res.status(200).json({ success: true, user: user.toSafeObject() });
});
