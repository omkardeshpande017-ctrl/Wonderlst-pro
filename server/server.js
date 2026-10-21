require("dotenv").config();
const express = require("express");
const path = require("path");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const morgan = require("morgan");
const helmet = require("helmet");
const mongoSanitize = require("express-mongo-sanitize");
const rateLimit = require("express-rate-limit");

const connectDB = require("./config/db");
const errorHandler = require("./middleware/errorHandler");

const authRoutes = require("./routes/authRoutes");
const listingRoutes = require("./routes/listingRoutes");
const userRoutes = require("./routes/userRoutes");
const bookingRoutes = require("./routes/bookingRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const reviewRoutes = require("./routes/reviewRoutes");
const tripRoutes = require("./routes/tripRoutes");

connectDB();

const app = express();

app.use(helmet({ crossOriginResourcePolicy: false }));

// CLIENT_URL may be a single origin or a comma separated list, so the same API
// can serve local dev and the deployed frontend.
const allowedOrigins = (process.env.CLIENT_URL || "http://localhost:5173")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, cb) => {
      // Same-origin / curl / server-to-server requests have no Origin header
      if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes("*")) {
        return cb(null, true);
      }
      return cb(new Error(`CORS: ${origin} is not allowed`));
    },
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(mongoSanitize());
if (process.env.NODE_ENV !== "production") app.use(morgan("dev"));

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api", apiLimiter);

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.get("/api/health", (req, res) => {
  res.status(200).json({ success: true, message: "Wanderlust API is running" });
});

// Friendly root so opening http://localhost:8080 in a browser isn't a 404
app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    service: "Wanderlust API",
    version: "2.0.0",
    health: "/api/health",
    docs: "See README.md — /api/auth, /api/listings, /api/bookings, /api/users, /api/reviews",
    client: process.env.CLIENT_URL || "http://localhost:5173",
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/listings", listingRoutes);
app.use("/api/users", userRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/trips", tripRoutes);

app.use((req, res, next) => {
  res.status(404).json({ success: false, message: "Route not found" });
});

app.use(errorHandler);

const PORT = process.env.PORT || 8080;
const server = app.listen(PORT, () => {
  console.log(`Wanderlust API listening on port ${PORT}`);
});

// Never let a stray promise rejection or thrown error kill the API.
// Log it, and keep the process alive so the frontend never sees a dead backend.
process.on("unhandledRejection", (reason) => {
  console.error("[unhandledRejection]", reason);
});
process.on("uncaughtException", (err) => {
  console.error("[uncaughtException]", err);
});

const shutdown = (signal) => {
  console.log(`${signal} received, closing server...`);
  server.close(() => process.exit(0));
};
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
