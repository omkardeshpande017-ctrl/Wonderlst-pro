const jwt = require("jsonwebtoken");
const ApiError = require("../utils/ApiError");
const catchAsync = require("../utils/catchAsync");
const User = require("../models/User");

// Verifies JWT from httpOnly cookie or Authorization header, attaches req.user
exports.protect = catchAsync(async (req, res, next) => {
  let token;

  if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  } else if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer ")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    return next(new ApiError(401, "You must be logged in to do that"));
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    return next(new ApiError(401, "Invalid or expired session, please log in again"));
  }

  const user = await User.findById(decoded.id);
  if (!user) {
    return next(new ApiError(401, "User belonging to this session no longer exists"));
  }

  req.user = user;
  next();
});

// Does not error out if unauthenticated; just attaches req.user when present.
exports.optionalAuth = async (req, res, next) => {
  let token;
  if (req.cookies && req.cookies.token) token = req.cookies.token;
  else if (req.headers.authorization?.startsWith("Bearer ")) {
    token = req.headers.authorization.split(" ")[1];
  }
  if (!token) return next();

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (user) req.user = user;
  } catch (err) {
    // ignore invalid token for optional auth
  }
  next();
};

// Restrict a route to specific roles, e.g. restrictTo("owner")
exports.restrictTo =
  (...roles) =>
  (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(
        new ApiError(
          403,
          roles.includes("owner")
            ? "Only owner accounts can do that"
            : "Only guest accounts can do that"
        )
      );
    }
    next();
  };
