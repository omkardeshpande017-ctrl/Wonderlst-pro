const User = require("../models/User");
const ApiError = require("../utils/ApiError");
const catchAsync = require("../utils/catchAsync");
const { sendTokenResponse } = require("../utils/token");

exports.register = catchAsync(async (req, res, next) => {
  const { username, email, password, role, phone } = req.body;

  const existing = await User.findOne({ $or: [{ email }, { username }] });
  if (existing) {
    return next(
      new ApiError(
        400,
        existing.email === email
          ? "An account with that email already exists"
          : "That username is already taken"
      )
    );
  }

  const user = await User.create({
    username,
    email,
    password,
    role: role === "owner" ? "owner" : "guest",
    phone: phone || "",
  });
  sendTokenResponse(user, 201, res);
});

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select("+password");
  if (!user || !(await user.comparePassword(password))) {
    return next(new ApiError(401, "Incorrect email or password"));
  }

  sendTokenResponse(user, 200, res);
});

exports.logout = (req, res) => {
  res.cookie("token", "none", {
    expires: new Date(Date.now() + 5 * 1000),
    httpOnly: true,
  });
  res.status(200).json({ success: true, message: "Logged out" });
};

exports.getMe = catchAsync(async (req, res) => {
  res.status(200).json({ success: true, user: req.user.toSafeObject() });
});
