const { validationResult } = require("express-validator");
const User = require("../models/User");

// Update the logged-in user's name, bio and profile image URL
async function updateMyProfile(req, res) {
  try {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Please check your profile details.",
        errors: errors.array().map((error) => ({
          field: error.path,
          message: error.msg,
        })),
      });
    }

    const { name, bio, profileImage } = req.body;

    if (name === undefined && bio === undefined && profileImage === undefined) {
      return res.status(400).json({
        success: false,
        message: "Provide at least one profile field to update.",
      });
    }

    const updates = {};

    if (name !== undefined) {
      if (typeof name !== "string") {
        return res.status(400).json({
          success: false,
          message: "Name must be text.",
        });
      }
      updates.name = name.trim();
    }

    if (bio !== undefined) {
      if (typeof bio !== "string") {
        return res.status(400).json({
          success: false,
          message: "Bio must be text.",
        });
      }
      updates.bio = bio.trim();
    }

    if (profileImage !== undefined) {
      if (typeof profileImage !== "string") {
        return res.status(400).json({
          success: false,
          message: "Profile image must be a URL string.",
        });
      }

      const imageUrl = profileImage.trim();

      if (imageUrl && !/^https?:\/\/\S+$/i.test(imageUrl)) {
        return res.status(400).json({
          success: false,
          message: "Profile image must be a valid HTTP or HTTPS URL.",
        });
      }

      updates.profileImage = imageUrl;
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updates },
      {
        new: true,
        runValidators: true,
      },
    ).select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User account not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Profile saved successfully.",
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
    console.error("Update profile error:", error.message);

    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Could not save your profile.",
    });
  }
}

// Update the logged-in user's teaching and learning skills
async function updateMySkills(req, res) {
  try {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Please check your skills.",
        errors: errors.array().map((error) => ({
          field: error.path,
          message: error.msg,
        })),
      });
    }

    const { skillsToTeach, skillsToLearn } = req.body;

    if (skillsToTeach === undefined && skillsToLearn === undefined) {
      return res.status(400).json({
        success: false,
        message: "Provide skillsToTeach or skillsToLearn.",
      });
    }

    const updates = {};

    if (skillsToTeach !== undefined) {
      updates.skillsToTeach = normalizeSkills(skillsToTeach);
    }

    if (skillsToLearn !== undefined) {
      updates.skillsToLearn = normalizeSkills(skillsToLearn);
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updates },
      {
        new: true,
        runValidators: true,
      },
    ).select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User account not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Skills saved successfully.",
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
    console.error("Update skills error:", error.message);

    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: "Please check your skills.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Could not save your skills.",
    });
  }
}

// Discover other users and rank them by skill compatibility
async function discoverUsers(req, res) {
  try {
    const currentUser = await User.findById(req.user._id).select(
      "skillsToTeach skillsToLearn",
    );

    if (!currentUser) {
      return res.status(404).json({
        success: false,
        message: "User account not found.",
      });
    }

    const users = await User.find({
      _id: { $ne: req.user._id },
      isActive: true,
    })
      .select("name bio profileImage skillsToTeach skillsToLearn")
      .limit(200)
      .lean();

    const normalize = (skills = []) =>
      skills.map((skill) => skill.trim().toLowerCase());

    const myLearningSkills = normalize(currentUser.skillsToLearn);
    const myTeachingSkills = normalize(currentUser.skillsToTeach);

    const results = users.map((user) => {
      const theirTeachingSkills = normalize(user.skillsToTeach);
      const theirLearningSkills = normalize(user.skillsToLearn);

      const matchingSkills = (user.skillsToTeach || []).filter((skill) =>
        myLearningSkills.includes(skill.trim().toLowerCase()),
      );

      const theyCanLearnFromMe = (user.skillsToLearn || []).filter((skill) =>
        myTeachingSkills.includes(skill.trim().toLowerCase()),
      );

      const score = matchingSkills.length + theyCanLearnFromMe.length;

      return {
        id: user._id.toString(),
        name: user.name,
        bio: user.bio || "",
        profileImage: user.profileImage || "",
        teaches: user.skillsToTeach || [],
        learns: user.skillsToLearn || [],
        matchingSkills,
        score,
        initials: user.name
          .split(/\s+/)
          .map((part) => part[0])
          .join("")
          .slice(0, 2)
          .toUpperCase(),
      };
    });

    results.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));

    return res.status(200).json({
      success: true,
      count: results.length,
      users: results,
    });
  } catch (error) {
    console.error("Discover users error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Could not load community members.",
    });
  }
}

// Remove duplicate skills without considering letter case
function normalizeSkills(skills) {
  const seen = new Set();

  return skills
    .map((skill) => skill.trim())
    .filter((skill) => {
      const key = skill.toLowerCase();

      if (seen.has(key)) return false;

      seen.add(key);
      return true;
    });
}

module.exports = {
  updateMyProfile,
  updateMySkills,
  discoverUsers,
};
