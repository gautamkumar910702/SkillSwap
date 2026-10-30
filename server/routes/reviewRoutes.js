const express = require("express");
const { body } = require("express-validator");
const { protect } = require("../middleware/authMiddleware");

const {
  createReview,
  getMyReviews,
  getReviewsGiven,
} = require("../controllers/reviewController");

const router = express.Router();

const validateReview = [
  body("sessionId")
    .notEmpty()
    .withMessage("Session ID is required.")
    .bail()
    .isMongoId()
    .withMessage("Invalid session ID."),

  body("rating")
    .isInt({ min: 1, max: 5 })
    .withMessage("Rating must be a whole number from 1 to 5."),

  body("comment")
    .optional()
    .isString()
    .withMessage("Comment must be text.")
    .bail()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Comment cannot exceed 500 characters."),
];

router.get("/mine", protect, getMyReviews);
router.get("/given", protect, getReviewsGiven);
router.post("/", protect, validateReview, createReview);

module.exports = router;
