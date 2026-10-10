const Notification = require("../models/Notification");

// Fire-and-forget: a failed notification should never break the main request
module.exports = async (userId, { title, message = "", link = "" }) => {
  try {
    await Notification.create({ user: userId, title, message, link });
  } catch (err) {
    console.error("Notification error:", err.message);
  }
};
