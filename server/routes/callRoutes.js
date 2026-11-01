const express = require("express");
const { param } = require("express-validator");

const { protect } = require("../middleware/authMiddleware");
const { createCallToken } = require("../controllers/callController");

const router = express.Router();

router.post(
  "/:exchangeId/:callId/token",
  protect,
  [
    param("exchangeId").isMongoId().withMessage("Invalid exchange request ID."),

    param("callId")
      .isString()
      .trim()
      .notEmpty()
      .withMessage("Call ID is required.")
      .isLength({ max: 100 })
      .withMessage("Invalid call ID."),
  ],
  createCallToken,
);

module.exports = router;
