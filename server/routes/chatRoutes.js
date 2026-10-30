const express = require("express");
const { param, query } = require("express-validator");

const { protect } = require("../middleware/authMiddleware");

const {
  getChatMessages,
  markMessagesAsRead,
} = require("../controllers/chatController");

const router = express.Router();

const validateExchangeId = [
  param("exchangeId").isMongoId().withMessage("Invalid exchange request ID."),
];

const validateMessageQuery = [
  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Message limit must be between 1 and 100."),
];

// Get chat history
router.get(
  "/:exchangeId/messages",
  protect,
  validateExchangeId,
  validateMessageQuery,
  getChatMessages,
);

// Mark received messages as read
router.patch(
  "/:exchangeId/read",
  protect,
  validateExchangeId,
  markMessagesAsRead,
);

module.exports = router;
