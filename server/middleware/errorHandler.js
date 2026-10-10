const ApiError = require("../utils/ApiError");

module.exports = (err, req, res, next) => {
  let error = err;

  // Mongoose bad ObjectId
  if (err.name === "CastError") {
    error = new ApiError(404, `Resource not found`);
  }
  // Mongoose duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || "field";
    error = new ApiError(400, `That ${field} is already taken`);
  }
  // Mongoose validation error
  if (err.name === "ValidationError") {
    const message = Object.values(err.errors)
      .map((val) => val.message)
      .join(", ");
    error = new ApiError(400, message);
  }
  if (err.name === "MulterError") {
    error = new ApiError(
      400,
      err.code === "LIMIT_FILE_SIZE" ? "Image is too large (max 5MB)" : err.message
    );
  }
  if (err.message === "Only image files are allowed") {
    error = new ApiError(400, err.message);
  }
  if (err.name === "JsonWebTokenError") {
    error = new ApiError(401, "Invalid token, please log in again");
  }
  if (err.name === "TokenExpiredError") {
    error = new ApiError(401, "Session expired, please log in again");
  }

  const statusCode = error.statusCode || 500;
  const message = error.isOperational
    ? error.message
    : "Something went wrong on our end";

  if (process.env.NODE_ENV !== "production" && !error.isOperational) {
    console.error(err);
  }

  res.status(statusCode).json({
    success: false,
    message,
  });
};
