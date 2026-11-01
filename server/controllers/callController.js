const { AccessToken } = require("livekit-server-sdk");
const mongoose = require("mongoose");
const Call = require("../models/Call");
const ExchangeRequest = require("../models/ExchangeRequest");

const getLiveKitCredentials = () => {
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  const serverUrl = process.env.LIVEKIT_URL;

  if (!apiKey || !apiSecret || !serverUrl) {
    throw new Error("LiveKit environment variables are missing.");
  }

  return { apiKey, apiSecret, serverUrl };
};

// Generate LiveKit token for an accepted call.
const createCallToken = async (req, res) => {
  try {
    const { exchangeId, callId } = req.params;
    const userId = req.user._id.toString();

    if (!mongoose.isValidObjectId(exchangeId) || !callId) {
      return res.status(400).json({
        success: false,
        message: "Invalid call details.",
      });
    }

    const call = await Call.findOne({
      callId,
      exchangeRequest: exchangeId,
      status: "accepted",
      $or: [{ caller: userId }, { receiver: userId }],
    });

    if (!call) {
      return res.status(403).json({
        success: false,
        message: "Call is not accepted or you are not a participant.",
      });
    }

    const exchange = await ExchangeRequest.findOne({
      _id: exchangeId,
      status: "accepted",
      $or: [{ sender: userId }, { receiver: userId }],
    });

    if (!exchange) {
      return res.status(403).json({
        success: false,
        message: "You are not allowed to join this exchange call.",
      });
    }

    const { apiKey, apiSecret, serverUrl } = getLiveKitCredentials();

    const roomName = `skillswap-call-${call.callId}`;

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
    console.error("Create call token error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to create call token.",
    });
  }
};

module.exports = {
  createCallToken,
};
