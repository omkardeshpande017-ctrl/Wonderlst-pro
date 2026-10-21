// Serverless entry for the API on Vercel.
//
// It re-uses the real Express app from ../server/server.js (which exports `app`
// when process.env.VERCEL is set) and enables the in-memory demo store when no
// database is configured, so a fresh deployment works with zero setup.
//
// Environment variables (Project -> Settings -> Environment Variables):
//   DEMO_MODE=1   in-memory demo data, no database needed
//   MONGO_URI     use MongoDB Atlas instead of the demo store
//   JWT_SECRET    long random string (a default is used if missing)
//   CLIENT_URL    frontend origin(s), comma separated
process.env.VERCEL = process.env.VERCEL || "1";
process.env.DEMO_MODE =
  process.env.DEMO_MODE || (process.env.MONGO_URI ? "0" : "1");
process.env.JWT_SECRET = process.env.JWT_SECRET || "wanderlust-demo-secret-change-me-32chars";
process.env.NODE_ENV = process.env.NODE_ENV || "production";

// The Express app has all its dependencies listed in ./package.json, and the
// whole API source is bundled into this function.
module.exports = require("../server/server.js");
