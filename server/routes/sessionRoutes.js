const express = require("express");
const { body, param } = require("express-validator");
const { protect } = require("../middleware/authMiddleware");

const {
  scheduleSession,
  getMySessions,
  cancelSession,
  createLiveKitToken,
  completeSession,
} = require("../controllers/sessionController");

const router = express.Router();

const validateScheduleSession = [
  body("exchangeRequestId")
    .notEmpty()
    .withMessage("Exchange request ID is required.")
    .bail()
    .isMongoId()
    .withMessage("Invalid exchange request ID."),

  body("scheduledAt")
    .notEmpty()
    .withMessage("Session date and time are required.")
    .bail()
    .isISO8601()
    .withMessage("Please provide a valid date and time."),

  body("durationMinutes")
    .optional()
    .isInt({ min: 30, max: 120 })
    .withMessage("Duration must be between 30 and 120 minutes.")
    .bail()
    .custom((value) => [30, 45, 60, 90, 120].includes(Number(value)))
    .withMessage("Choose a duration of 30, 45, 60, 90, or 120 minutes."),

  body("meetingLink")
    .optional({ checkFalsy: true })
    .isURL({ require_protocol: true })
    .withMessage("Meeting link must be a valid URL."),
];

const validateSessionId = [
  param("id").isMongoId().withMessage("Invalid session ID."),
];

// Schedule a session for an accepted exchange
router.post("/", protect, validateScheduleSession, scheduleSession);

// Get sessions belonging to the logged-in user
router.get("/mine", protect, getMySessions);

// Generate a secure LiveKit token for a session participant
router.post("/:id/token", protect, validateSessionId, createLiveKitToken);

// Complete a session after its scheduled duration has ended
router.patch("/:id/complete", protect, validateSessionId, completeSession);

// Cancel a scheduled session
router.patch("/:id/cancel", protect, validateSessionId, cancelSession);

module.exports = router;
