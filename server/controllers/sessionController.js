const { validationResult } = require("express-validator");
const mongoose = require("mongoose");
const { AccessToken } = require("livekit-server-sdk");

const Session = require("../models/Session");
const ExchangeRequest = require("../models/ExchangeRequest");
const createNotification = require("../utils/createNotification");

// Schedule a session for an accepted exchange request
async function scheduleSession(req, res) {
  try {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Please check the session details.",
        errors: errors.array().map((error) => ({
          field: error.path,
          message: error.msg,
        })),
      });
    }

    const {
      exchangeRequestId,
      scheduledAt,
      durationMinutes = 60,
      meetingLink = "",
    } = req.body;

    if (!mongoose.isValidObjectId(exchangeRequestId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid exchange request ID.",
      });
    }

    const date = new Date(scheduledAt);

    if (Number.isNaN(date.getTime()) || date <= new Date()) {
      return res.status(400).json({
        success: false,
        message: "Choose a session date and time in the future.",
      });
    }

    const exchange = await ExchangeRequest.findById(exchangeRequestId)
      .populate("sender", "name")
      .populate("receiver", "name");

    if (!exchange) {
      return res.status(404).json({
        success: false,
        message: "Exchange request not found.",
      });
    }

    const userId = req.user._id.toString();
    const senderId = exchange.sender._id.toString();
    const receiverId = exchange.receiver._id.toString();

    if (userId !== senderId && userId !== receiverId) {
      return res.status(403).json({
        success: false,
        message: "You are not a participant in this exchange.",
      });
    }

    if (exchange.status !== "accepted") {
      return res.status(409).json({
        success: false,
        message: "Only accepted exchange requests can be scheduled.",
      });
    }

    const existingSession = await Session.findOne({
      exchangeRequest: exchange._id,
    });

    if (existingSession) {
      return res.status(409).json({
        success: false,
        message: "A session has already been created for this exchange.",
        session: existingSession,
      });
    }

    const isSender = userId === senderId;
    const otherUser = isSender ? exchange.receiver : exchange.sender;

    let session;

    try {
      session = await Session.create({
        exchangeRequest: exchange._id,
        host: req.user._id,
        participant: otherUser._id,
        title: `${exchange.offeredSkill} ↔ ${exchange.requestedSkill}`,
        scheduledAt: date,
        durationMinutes: Number(durationMinutes),
        meetingLink: meetingLink.trim(),
      });
    } catch (error) {
      if (error.code === 11000) {
        return res.status(409).json({
          success: false,
          message: "A session already exists for this exchange.",
        });
      }

      throw error;
    }

    const populatedSession = await Session.findById(session._id)
      .populate("host", "name profileImage")
      .populate("participant", "name profileImage")
      .populate("exchangeRequest");

    try {
      await createNotification({
        recipient: otherUser._id,
        sender: req.user._id,
        type: "session_scheduled",
        title: "New session scheduled",
        message: `${req.user.name || "Your exchange partner"} scheduled "${session.title}" for ${date.toLocaleString()}.`,
        exchangeRequest: exchange._id,
      });
    } catch (notificationError) {
      console.error(
        "Failed to create session notification:",
        notificationError.message,
      );
    }

    return res.status(201).json({
      success: true,
      message: "Session scheduled successfully.",
      session: populatedSession,
    });
  } catch (error) {
    console.error("Schedule session error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Could not schedule the session.",
    });
  }
}

// Get sessions for the logged-in user
async function getMySessions(req, res) {
  try {
    const sessions = await Session.find({
      $or: [{ host: req.user._id }, { participant: req.user._id }],
    })
      .populate("host", "name profileImage")
      .populate("participant", "name profileImage")
      .populate("exchangeRequest")
      .sort({ scheduledAt: 1 })
      .limit(100)
      .lean();

    return res.status(200).json({
      success: true,
      sessions,
    });
  } catch (error) {
    console.error("Get sessions error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Could not load your sessions.",
    });
  }
}

// Generate a secure LiveKit access token for an authorized session member
async function createLiveKitToken(req, res) {
  try {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Invalid session ID.",
      });
    }

    const { id } = req.params;

    const session = await Session.findById(id);

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
        message: "You are not allowed to join this session.",
      });
    }

    if (session.status !== "scheduled") {
      return res.status(409).json({
        success: false,
        message: "This session is not available to join.",
      });
    }

    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    const serverUrl = process.env.LIVEKIT_URL;

    if (!apiKey || !apiSecret || !serverUrl) {
      console.error("LiveKit environment variables are missing.");

      return res.status(500).json({
        success: false,
        message: "Video calling is not configured on the server.",
      });
    }

    const roomName = `skillswap-session-${session._id}`;

    const token = new AccessToken(apiKey, apiSecret, {
      identity: userId,
      name: req.user.name || "SkillSwap User",
      ttl: "2h",
    });

    token.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });

    const jwt = await token.toJwt();

    return res.status(200).json({
      success: true,
      token: jwt,
      serverUrl,
      roomName,
    });
  } catch (error) {
    console.error("Create LiveKit token error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Could not prepare the video call.",
    });
  }
}

// Mark a session as completed
async function completeSession(req, res) {
  try {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Invalid session ID.",
      });
    }

    const { id } = req.params;

    const session = await Session.findOne({
      _id: id,
      $or: [{ host: req.user._id }, { participant: req.user._id }],
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Session not found or you are not a participant.",
      });
    }

    if (session.status === "completed") {
      return res.status(200).json({
        success: true,
        message: "Session is already completed.",
        session,
      });
    }

    if (session.status !== "scheduled") {
      return res.status(409).json({
        success: false,
        message: "Only scheduled sessions can be completed.",
      });
    }

    const endsAt = new Date(
      session.scheduledAt.getTime() + session.durationMinutes * 60 * 1000,
    );

    if (new Date() < endsAt) {
      return res.status(409).json({
        success: false,
        message: "The scheduled session duration has not ended yet.",
      });
    }

    session.status = "completed";
    await session.save();

    return res.status(200).json({
      success: true,
      message: "Session marked as completed. You can now submit a review.",
      session,
    });
  } catch (error) {
    console.error("Complete session error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Could not complete the session.",
    });
  }
}

// Cancel a session belonging to the logged-in user
async function cancelSession(req, res) {
  try {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Invalid session ID.",
      });
    }

    const { id } = req.params;

    const session = await Session.findOne({
      _id: id,
      $or: [{ host: req.user._id }, { participant: req.user._id }],
    });

    if (!session) {
      const exists = await Session.exists({ _id: id });

      if (!exists) {
        return res.status(404).json({
          success: false,
          message: "Session not found.",
        });
      }

      return res.status(403).json({
        success: false,
        message: "You are not allowed to cancel this session.",
      });
    }

    if (session.status !== "scheduled") {
      return res.status(409).json({
        success: false,
        message: "Only scheduled sessions can be cancelled.",
      });
    }

    session.status = "cancelled";
    await session.save();

    const otherUserId =
      session.host.toString() === req.user._id.toString()
        ? session.participant
        : session.host;

    try {
      await createNotification({
        recipient: otherUserId,
        sender: req.user._id,
        type: "session_cancelled",
        title: "Session cancelled",
        message: `${req.user.name || "Your exchange partner"} cancelled "${session.title}".`,
        exchangeRequest: session.exchangeRequest,
      });
    } catch (notificationError) {
      console.error(
        "Failed to create cancellation notification:",
        notificationError.message,
      );
    }

    return res.status(200).json({
      success: true,
      message: "Session cancelled successfully.",
      session,
    });
  } catch (error) {
    console.error("Cancel session error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Could not cancel the session.",
    });
  }
}

module.exports = {
  scheduleSession,
  getMySessions,
  cancelSession,
  createLiveKitToken,
  completeSession,
};
