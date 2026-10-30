const express = require("express");
const { body } = require("express-validator");
const { protect } = require("../middleware/authMiddleware");

const {
  updateMyProfile,
  updateMySkills,
  discoverUsers,
} = require("../controllers/userController");

const router = express.Router();

// Validate profile fields
const validateProfile = [
  body("name")
    .optional()
    .isString()
    .withMessage("Name must be text.")
    .bail()
    .trim()
    .isLength({ min: 2, max: 60 })
    .withMessage("Name must contain 2 to 60 characters."),

  body("bio")
    .optional()
    .isString()
    .withMessage("Bio must be text.")
    .bail()
    .isLength({ max: 500 })
    .withMessage("Bio cannot exceed 500 characters."),

  body("profileImage")
    .optional()
    .isString()
    .withMessage("Profile image must be a URL.")
    .bail()
    .trim()
    .custom((value) => {
      if (value === "") return true;

      try {
        const url = new URL(value);

        if (!["http:", "https:"].includes(url.protocol)) {
          throw new Error();
        }

        return true;
      } catch {
        throw new Error("Profile image must be a valid HTTP or HTTPS URL.");
      }
    }),
];

// Validate skills
const validateSkills = [
  body("skillsToTeach")
    .optional()
    .isArray({ max: 30 })
    .withMessage("Teaching skills must be an array of up to 30 skills."),

  body("skillsToTeach.*")
    .optional()
    .isString()
    .withMessage("Each teaching skill must be text.")
    .bail()
    .trim()
    .isLength({ min: 1, max: 60 })
    .withMessage("Each teaching skill must contain 1 to 60 characters."),

  body("skillsToLearn")
    .optional()
    .isArray({ max: 30 })
    .withMessage("Learning skills must be an array of up to 30 skills."),

  body("skillsToLearn.*")
    .optional()
    .isString()
    .withMessage("Each learning skill must be text.")
    .bail()
    .trim()
    .isLength({ min: 1, max: 60 })
    .withMessage("Each learning skill must contain 1 to 60 characters."),
];

// Discover users
router.get("/discover", protect, discoverUsers);

// Update logged-in user's profile
router.put("/me", protect, validateProfile, updateMyProfile);

// Update logged-in user's skills
router.put("/me/skills", protect, validateSkills, updateMySkills);

module.exports = router;
