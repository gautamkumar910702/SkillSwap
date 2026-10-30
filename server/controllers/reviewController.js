const mongoose = require("mongoose");
const { validationResult } = require("express-validator");

const Review = require("../models/Review");
const Session = require("../models/Session");

// Submit a review for a completed session
async function createReview(req, res) {
  try {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Please check your review details.",
        errors: errors.array().map((error) => ({
          field: error.path,
          message: error.msg,
        })),
      });
    }

    const { sessionId, rating, comment = "" } = req.body;

    if (!mongoose.isValidObjectId(sessionId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid session ID.",
      });
    }

    const session = await Session.findById(sessionId);

    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Session not found.",
      });
    }

    const userId = req.user._id.toString();
    const hostId = session.host.toString();
    const participantId = session.participant.toString();

    if (userId !== hostId && userId !== participantId) {
      return res.status(403).json({
        success: false,
        message: "You are not a participant in this session.",
      });
    }

    if (session.status !== "completed") {
      return res.status(409).json({
        success: false,
        message: "You can review only completed sessions.",
      });
    }

    const reviewee = userId === hostId ? session.participant : session.host;

    try {
      const review = await Review.create({
        session: session._id,
        reviewer: req.user._id,
        reviewee,
        rating: Number(rating),
        comment: comment.trim(),
      });

      const populatedReview = await Review.findById(review._id)
        .populate("reviewer", "name profileImage")
        .populate("reviewee", "name profileImage")
        .populate("session", "title scheduledAt");

      return res.status(201).json({
        success: true,
        message: "Review submitted successfully.",
        review: populatedReview,
      });
    } catch (error) {
      if (error.code === 11000) {
        return res.status(409).json({
          success: false,
          message: "You have already reviewed this session.",
        });
      }

      throw error;
    }
  } catch (error) {
    console.error("Create review error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Could not submit your review.",
    });
  }
}

// Get reviews received by the logged-in user
async function getMyReviews(req, res) {
  try {
    const reviews = await Review.find({
      reviewee: req.user._id,
    })
      .populate("reviewer", "name profileImage")
      .populate("session", "title scheduledAt")
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    const totalReviews = reviews.length;
    const averageRating = totalReviews
      ? Number(
          (
            reviews.reduce((sum, review) => sum + review.rating, 0) /
            totalReviews
          ).toFixed(1),
        )
      : 0;

    return res.status(200).json({
      success: true,
      totalReviews,
      averageRating,
      reviews,
    });
  } catch (error) {
    console.error("Get reviews error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Could not load reviews.",
    });
  }
}

// Get reviews written by the logged-in user
async function getReviewsGiven(req, res) {
  try {
    const reviews = await Review.find({
      reviewer: req.user._id,
    })
      .populate("reviewee", "name profileImage")
      .populate("session", "title scheduledAt")
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    return res.status(200).json({
      success: true,
      reviews,
    });
  } catch (error) {
    console.error("Get reviews given error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Could not load your submitted reviews.",
    });
  }
}

module.exports = {
  createReview,
  getMyReviews,
  getReviewsGiven,
};
