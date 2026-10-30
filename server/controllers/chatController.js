const mongoose = require("mongoose");
const ExchangeRequest = require("../models/ExchangeRequest");
const Message = require("../models/Message");

// Verify that the logged-in user belongs to an accepted exchange.
async function verifyAcceptedExchange(exchangeId, userId) {
  if (!mongoose.isValidObjectId(exchangeId)) {
    return null;
  }

  return ExchangeRequest.findOne({
    _id: exchangeId,
    status: "accepted",
    $or: [{ sender: userId }, { receiver: userId }],
  });
}

// Get messages of an accepted exchange
async function getChatMessages(req, res) {
  try {
    const { exchangeId } = req.params;
    const userId = req.user._id;

    const exchange = await verifyAcceptedExchange(exchangeId, userId);

    if (!exchange) {
      return res.status(403).json({
        success: false,
        message: "Chat access is allowed only for accepted exchanges.",
      });
    }

    const limit = Math.min(
      Math.max(parseInt(req.query.limit, 10) || 50, 1),
      100,
    );

    const messages = await Message.find({
      exchangeRequest: exchange._id,
      $or: [{ sender: userId }, { receiver: userId }],
    })
      .populate("sender", "name profileImage")
      .populate("receiver", "name profileImage")
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    // Mark received messages as read
    await Message.updateMany(
      {
        exchangeRequest: exchange._id,
        receiver: userId,
        readAt: null,
      },
      {
        $set: { readAt: new Date() },
      },
    );

    return res.status(200).json({
      success: true,
      exchange: {
        id: exchange._id,
        sender: exchange.sender,
        receiver: exchange.receiver,
        offeredSkill: exchange.offeredSkill,
        requestedSkill: exchange.requestedSkill,
      },
      messages: messages.reverse(),
    });
  } catch (error) {
    console.error("Get chat messages error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Could not load chat messages.",
    });
  }
}

// Mark received messages as read
async function markMessagesAsRead(req, res) {
  try {
    const { exchangeId } = req.params;
    const userId = req.user._id;

    const exchange = await verifyAcceptedExchange(exchangeId, userId);

    if (!exchange) {
      return res.status(403).json({
        success: false,
        message: "Chat access is allowed only for accepted exchanges.",
      });
    }

    const result = await Message.updateMany(
      {
        exchangeRequest: exchange._id,
        receiver: userId,
        readAt: null,
      },
      {
        $set: { readAt: new Date() },
      },
    );

    return res.status(200).json({
      success: true,
      message: "Messages marked as read.",
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    console.error("Mark messages as read error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Could not update message read status.",
    });
  }
}

module.exports = {
  getChatMessages,
  markMessagesAsRead,
  verifyAcceptedExchange,
};
