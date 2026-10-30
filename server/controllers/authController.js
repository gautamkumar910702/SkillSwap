const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { validationResult } = require("express-validator");
const User = require("../models/User");
const emailTransporter = require("../config/email");

function checkValidation(req, res) {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    res.status(400).json({
      success: false,
      message: "Please check your input.",
      errors: errors.array().map((error) => ({
        field: error.path,
        message: error.msg,
      })),
    });

    return false;
  }

  return true;
}

function createToken(userId) {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is not configured.");
  }

  return jwt.sign({ userId: userId.toString() }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });
}

// POST /api/auth/register
async function register(req, res) {
  try {
    if (!checkValidation(req, res)) {
      return;
    }

    const { name, email, password } = req.body;

    const normalizedEmail = email.trim().toLowerCase();

    const existingUser = await User.findOne({
      email: normalizedEmail,
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists.",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
    });

    const token = createToken(user._id);

    return res.status(201).json({
      success: true,
      message: "Account created successfully.",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        bio: user.bio,
        profileImage: user.profileImage,
        skillsToTeach: user.skillsToTeach,
        skillsToLearn: user.skillsToLearn,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists.",
      });
    }

    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: "Please check your registration details.",
      });
    }

    console.error("Registration error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Account registration failed. Please try again.",
    });
  }
}

// POST /api/auth/login
async function login(req, res) {
  try {
    if (!checkValidation(req, res)) {
      return;
    }

    const { email, password } = req.body;

    const user = await User.findOne({
      email: email.trim().toLowerCase(),
    }).select("+password");

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    const passwordMatches = await bcrypt.compare(password, user.password);

    if (!passwordMatches) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    const token = createToken(user._id);

    return res.status(200).json({
      success: true,
      message: "Login successful.",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        bio: user.bio,
        profileImage: user.profileImage,
        skillsToTeach: user.skillsToTeach,
        skillsToLearn: user.skillsToLearn,
      },
    });
  } catch (error) {
    console.error("Login error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Login failed. Please try again.",
    });
  }
}

// POST /api/auth/forgot-password
async function forgotPassword(req, res) {
  try {
    if (!checkValidation(req, res)) {
      return;
    }

    const email = req.body.email.trim().toLowerCase();

    const genericMessage =
      "If an account exists with this email, you will receive a password reset link.";

    const user = await User.findOne({ email });

    // Do not reveal whether an email is registered.
    if (!user || !user.isActive) {
      return res.status(200).json({
        success: true,
        message: genericMessage,
      });
    }

    // Generate a secure random token.
    const resetToken = crypto.randomBytes(32).toString("hex");

    // Store only the hashed token in the database.
    user.passwordResetToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    user.passwordResetExpires = Date.now() + 15 * 60 * 1000;

    await user.save({ validateBeforeSave: false });

    const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";

    const resetUrl = `${clientUrl.replace(/\/$/, "")}/reset-password/${resetToken}`;

    try {
      await emailTransporter.sendMail({
        from: `"SkillSwap" <${process.env.EMAIL_USER}>`,
        to: user.email,
        subject: "SkillSwap Password Reset",

        text: `You requested a password reset for your SkillSwap account.

Open this link to reset your password:
${resetUrl}

This link expires in 15 minutes.

If you did not request this, you can ignore this email.`,

        html: `
          <div style="font-family: Arial, sans-serif; max-width: 550px; margin: auto; padding: 25px; color: #1f2937;">
            <h2 style="color: #2563eb;">SkillSwap Password Reset</h2>

            <p>Hello ${user.name},</p>

            <p>We received a request to reset your SkillSwap account password.</p>

            <p style="margin: 25px 0;">
              <a href="${resetUrl}" style="background: #2563eb; color: white; padding: 12px 22px; text-decoration: none; border-radius: 7px; display: inline-block;">
                Reset Password
              </a>
            </p>

            <p>This link expires in <strong>15 minutes</strong>.</p>

            <p>If you did not request a password reset, you can safely ignore this email.</p>

            <p>Regards,<br />SkillSwap Team</p>
          </div>
        `,
      });
    } catch (emailError) {
      user.passwordResetToken = undefined;
      user.passwordResetExpires = undefined;

      await user.save({ validateBeforeSave: false });

      throw emailError;
    }

    return res.status(200).json({
      success: true,
      message: genericMessage,
    });
  } catch (error) {
    console.error("Forgot password error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to send the password reset email. Please try again.",
    });
  }
}

// POST /api/auth/reset-password/:token
async function resetPassword(req, res) {
  try {
    if (!checkValidation(req, res)) {
      return;
    }

    const { token } = req.params;
    const { password } = req.body;

    // Hash the received token before database lookup.
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    // Find user with a valid, unexpired reset token.
    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() },
    }).select("+password +passwordResetToken +passwordResetExpires");

    if (!user || !user.isActive) {
      return res.status(400).json({
        success: false,
        message: "Password reset link is invalid or has expired.",
      });
    }

    // Hash and update the new password.
    user.password = await bcrypt.hash(password, 12);

    // Clear reset token so it cannot be reused.
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;

    await user.save();

    return res.status(200).json({
      success: true,
      message:
        "Password reset successful. Please log in with your new password.",
    });
  } catch (error) {
    console.error("Reset password error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to reset password. Please try again.",
    });
  }
}

// GET /api/auth/me
async function getMe(req, res) {
  return res.status(200).json({
    success: true,
    user: {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      bio: req.user.bio,
      profileImage: req.user.profileImage,
      skillsToTeach: req.user.skillsToTeach,
      skillsToLearn: req.user.skillsToLearn,
      createdAt: req.user.createdAt,
    },
  });
}

module.exports = {
  register,
  login,
  getMe,
  forgotPassword,
  resetPassword,
};
