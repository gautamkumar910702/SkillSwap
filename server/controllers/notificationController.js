const mongoose = require("mongoose");
const Notification = require("../models/Notification");

// GET /api/notifications
async function getMyNotifications(req, res, next) {
  try {
    const recipientId = req.user._id;

    const [notifications, unreadCount] = await Promise.all([
      Notification.find({ recipient: recipientId })
        .populate("sender", "name profileImage")
        .sort({ createdAt: -1 })
        .limit(100)
        .lean(),

      Notification.countDocuments({
        recipient: recipientId,
        isRead: false,
      }),
    ]);

    return res.status(200).json({
      success: true,
      notifications,
      unreadCount,
    });
  } catch (error) {
    next(error);
  }
}

// PATCH /api/notifications/:id/read
async function markNotificationRead(req, res, next) {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid notification ID.",
      });
    }

    const notification = await Notification.findOneAndUpdate(
      {
        _id: id,
        recipient: req.user._id,
      },
      { $set: { isRead: true } },
      { new: true, runValidators: true },
    );

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Notification marked as read.",
      notification,
    });
  } catch (error) {
    next(error);
  }
}

// PATCH /api/notifications/read-all
async function markAllNotificationsRead(req, res, next) {
  try {
    const result = await Notification.updateMany(
      {
        recipient: req.user._id,
        isRead: false,
      },
      { $set: { isRead: true } },
    );

    return res.status(200).json({
      success: true,
      message: "All notifications marked as read.",
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getMyNotifications,
  markNotificationRead,
  markAllNotificationsRead,
};
