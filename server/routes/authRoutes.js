const express = require("express");
const { body, param } = require("express-validator");

const {
  register,
  login,
  getMe,
  forgotPassword,
  resetPassword,
} = require("../controllers/authController");

const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

// Validate registration fields.
const registerValidation = [
  body("name")
    .trim()
    .isLength({ min: 2, max: 60 })
    .withMessage("Name must contain 2 to 60 characters."),

  body("email")
    .trim()
    .isEmail()
    .withMessage("Please provide a valid email address.")
    .normalizeEmail(),

  body("password")
    .isString()
    .isLength({ min: 8, max: 128 })
    .withMessage("Password must contain 8 to 128 characters."),
];

// Validate login fields.
const loginValidation = [
  body("email")
    .trim()
    .isEmail()
    .withMessage("Please provide a valid email address.")
    .normalizeEmail(),

  body("password").isString().notEmpty().withMessage("Password is required."),
];

// Validate forgot password email.
const forgotPasswordValidation = [
  body("email")
    .trim()
    .isEmail()
    .withMessage("Please provide a valid email address.")
    .normalizeEmail(),
];

// Validate reset password token and new password.
const resetPasswordValidation = [
  param("token")
    .isHexadecimal()
    .isLength({ min: 64, max: 64 })
    .withMessage("Invalid password reset token."),

  body("password")
    .isString()
    .isLength({ min: 8, max: 128 })
    .withMessage("Password must contain 8 to 128 characters."),
];

// POST /api/auth/register
router.post("/register", registerValidation, register);

// POST /api/auth/login
router.post("/login", loginValidation, login);

// POST /api/auth/forgot-password
router.post("/forgot-password", forgotPasswordValidation, forgotPassword);

// POST /api/auth/reset-password/:token
router.post("/reset-password/:token", resetPasswordValidation, resetPassword);

// GET /api/auth/me
router.get("/me", protect, getMe);

module.exports = router;
