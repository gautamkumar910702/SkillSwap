const express = require("express");
const { protect } = require("../middleware/authMiddleware");

const {
  getMyNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} = require("../controllers/notificationController");

const router = express.Router();

// Every notification route requires login.
router.use(protect);

router.get("/", getMyNotifications);

// Keep this route before /:id/read.
router.patch("/read-all", markAllNotificationsRead);

router.patch("/:id/read", markNotificationRead);

module.exports = router;
