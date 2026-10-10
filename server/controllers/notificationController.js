const Notification = require("../models/Notification");
const catchAsync = require("../utils/catchAsync");

exports.getNotifications = catchAsync(async (req, res) => {
  const [notifications, unread] = await Promise.all([
    Notification.find({ user: req.user._id }).sort("-createdAt").limit(30),
    Notification.countDocuments({ user: req.user._id, read: false }),
  ]);
  res.status(200).json({ success: true, unread, notifications });
});

exports.markRead = catchAsync(async (req, res) => {
  await Notification.updateOne({ _id: req.params.id, user: req.user._id }, { read: true });
  res.status(200).json({ success: true });
});

exports.markAllRead = catchAsync(async (req, res) => {
  await Notification.updateMany({ user: req.user._id, read: false }, { read: true });
  res.status(200).json({ success: true });
});
