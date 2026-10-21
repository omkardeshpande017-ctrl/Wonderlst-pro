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

// DEMO_MODE=1 runs the whole API from an in-memory store (no MongoDB).
// Useful for a public preview deployment: nothing to provision, nothing to seed.
const DEMO_MODE = process.env.DEMO_MODE === "1" || process.env.DEMO_MODE === "true";

const authRoutes = require("./routes/authRoutes");
const listingRoutes = require("./routes/listingRoutes");
const userRoutes = require("./routes/userRoutes");
const bookingRoutes = require("./routes/bookingRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const reviewRoutes = require("./routes/reviewRoutes");
const tripRoutes = require("./routes/tripRoutes");

const demo = DEMO_MODE ? require("./demo/routes") : null;

if (!DEMO_MODE) connectDB();
else console.log("DEMO_MODE on — using the in-memory demo store (no database)");

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
      // Same-origin / curl / server-to-server requests have no Origin header.
      // In DEMO_MODE any *.vercel.app origin is also accepted so a fresh
      // deployment works without touching environment variables.
      const isVercel = DEMO_MODE && origin && /\.vercel\.app$/.test(origin);
      if (!origin || isVercel || allowedOrigins.includes(origin) || allowedOrigins.includes("*")) {
        return cb(null, true);
      }
      return cb(new Error(`CORS: ${origin} is not allowed`));
    },
    credentials: true,
  })
);
// Keep raw multipart bodies available so routes can re-parse them with multer
// (Express's json parser would otherwise swallow the stream).
app.use((req, res, next) => {
  const type = req.headers["content-type"] || "";
  if (type.startsWith("multipart/form-data")) return next();
  return express.json()(req, res, next);
});
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(mongoSanitize());
if (process.env.NODE_ENV !== "production") app.use(morgan("dev"));

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  // Production gets a generous allowance; development/testing is looser still
  // because the smoke test makes ~50 calls per run.
  max: process.env.NODE_ENV === "production" ? 2000 : 5000,
  standardHeaders: true,
  legacyHeaders: false,
  // Health checks and the test suite must never be throttled
  skip: (req) => req.path === "/api/health" || req.path === "/health",
});
app.use("/api", apiLimiter);

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Wanderlust API is running",
    mode: DEMO_MODE ? "demo" : "database",
  });
});

// Friendly root so opening http://localhost:8080 in a browser isn't a 404
app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    service: "Wanderlust API",
    version: "2.0.0",
    health: "/api/health",
    docs: "See README.md — /api/auth, /api/listings, /api/bookings, /api/users, /api/reviews",
    mode: DEMO_MODE ? "demo" : "database",
    client: process.env.CLIENT_URL || "http://localhost:5173",
  });
});

app.use("/api/auth", demo ? demo.authRouter() : authRoutes);
app.use("/api/listings", demo ? demo.listingRouter() : listingRoutes);
app.use("/api/users", demo ? demo.userRouter() : userRoutes);
app.use("/api/bookings", demo ? demo.bookingRouter() : bookingRoutes);
app.use("/api/notifications", demo ? demo.notificationRouter() : notificationRoutes);
app.use("/api/reviews", demo ? demo.reviewRouter() : reviewRoutes);
app.use("/api/trips", demo ? demo.tripRouter() : tripRoutes);

app.use((req, res, next) => {
  res.status(404).json({ success: false, message: "Route not found" });
});

app.use(errorHandler);

const PORT = process.env.PORT || 8080;

// On Vercel (serverless) the app is exported instead of listening on a port.
if (process.env.VERCEL) {
  module.exports = app;
} else {
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
}

module.exports = app;
