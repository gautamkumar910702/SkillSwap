const express = require("express");
const { body, param } = require("express-validator");
const { protect } = require("../middleware/authMiddleware");

const {
  createRequest,
  getMyRequests,
  updateRequestStatus,
  deleteExchangeRequest,
} = require("../controllers/exchangeController");

const router = express.Router();

const validateCreateRequest = [
  body("receiverId")
    .notEmpty()
    .withMessage("Receiver ID is required.")
    .bail()
    .isMongoId()
    .withMessage("Receiver ID must be a valid MongoDB ID."),

  body("offeredSkill")
    .isString()
    .withMessage("Offered skill must be text.")
    .bail()
    .trim()
    .isLength({ min: 1, max: 60 })
    .withMessage("Offered skill must contain 1 to 60 characters."),

  body("requestedSkill")
    .isString()
    .withMessage("Requested skill must be text.")
    .bail()
    .trim()
    .isLength({ min: 1, max: 60 })
    .withMessage("Requested skill must contain 1 to 60 characters."),

  body("message")
    .optional()
    .isString()
    .withMessage("Message must be text.")
    .bail()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Message cannot exceed 500 characters."),
];

const validateStatus = [
  param("id").isMongoId().withMessage("Invalid exchange request ID."),

  body("status")
    .isIn(["accepted", "rejected"])
    .withMessage("Status must be accepted or rejected."),
];

const validateDelete = [
  param("id").isMongoId().withMessage("Invalid exchange request ID."),
];

router.post("/", protect, validateCreateRequest, createRequest);

router.get("/mine", protect, getMyRequests);

router.patch("/:id/status", protect, validateStatus, updateRequestStatus);

router.delete("/:id", protect, validateDelete, deleteExchangeRequest);

module.exports = router;
