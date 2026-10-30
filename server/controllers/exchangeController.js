const { validationResult } = require("express-validator");
const mongoose = require("mongoose");
const User = require("../models/User");
const ExchangeRequest = require("../models/ExchangeRequest");
const createNotification = require("../utils/createNotification");

// Create a new skill exchange request
async function createRequest(req, res) {
  try {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Please check your exchange request details.",
        errors: errors.array().map((error) => ({
          field: error.path,
          message: error.msg,
        })),
      });
    }

    const { receiverId, offeredSkill, requestedSkill, message = "" } = req.body;

    if (!mongoose.isValidObjectId(receiverId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid receiver ID.",
      });
    }

    if (receiverId === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: "You cannot send an exchange request to yourself.",
      });
    }

    const receiver = await User.findOne({
      _id: receiverId,
      isActive: true,
    }).select("name skillsToTeach skillsToLearn");

    if (!receiver) {
      return res.status(404).json({
        success: false,
        message: "The requested user was not found.",
      });
    }

    const offered = offeredSkill.trim().toLowerCase();
    const requested = requestedSkill.trim().toLowerCase();

    const senderOffersSkill = (req.user.skillsToTeach || []).some(
      (skill) => skill.trim().toLowerCase() === offered,
    );

    const receiverTeachesSkill = (receiver.skillsToTeach || []).some(
      (skill) => skill.trim().toLowerCase() === requested,
    );

    if (!senderOffersSkill || !receiverTeachesSkill) {
      return res.status(400).json({
        success: false,
        message: "Choose a skill you teach and a skill the other user teaches.",
      });
    }

    const duplicate = await ExchangeRequest.findOne({
      sender: req.user._id,
      receiver: receiver._id,
      offeredSkill: {
        $regex: new RegExp(`^${escapeRegex(offeredSkill.trim())}$`, "i"),
      },
      requestedSkill: {
        $regex: new RegExp(`^${escapeRegex(requestedSkill.trim())}$`, "i"),
      },
      status: "pending",
    });

    if (duplicate) {
      return res.status(409).json({
        success: false,
        message: "You already have a pending request for this skill exchange.",
      });
    }

    const exchangeRequest = await ExchangeRequest.create({
      sender: req.user._id,
      receiver: receiver._id,
      offeredSkill: offeredSkill.trim(),
      requestedSkill: requestedSkill.trim(),
      message: message.trim(),
    });

    // Notify the receiver about the new request.
    try {
      await createNotification({
        recipient: receiver._id,
        sender: req.user._id,
        type: "exchange_received",
        title: "New skill exchange request",
        message: `${req.user.name} ne tumhe ${exchangeRequest.offeredSkill} sikhane aur ${exchangeRequest.requestedSkill} seekhne ki request bheji hai.`,
        exchangeRequest: exchangeRequest._id,
      });
    } catch (notificationError) {
      console.error(
        "Failed to create exchange received notification:",
        notificationError.message,
      );
    }

    const populatedRequest = await ExchangeRequest.findById(exchangeRequest._id)
      .populate("sender", "name profileImage")
      .populate("receiver", "name profileImage");

    return res.status(201).json({
      success: true,
      message: "Exchange request sent successfully.",
      request: populatedRequest,
    });
  } catch (error) {
    console.error("Create exchange request error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Could not send the exchange request.",
    });
  }
}

// Get requests sent and received by the logged-in user
async function getMyRequests(req, res) {
  try {
    const requests = await ExchangeRequest.find({
      $or: [{ sender: req.user._id }, { receiver: req.user._id }],
    })
      .populate("sender", "name profileImage")
      .populate("receiver", "name profileImage")
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    const sent = [];
    const received = [];

    for (const request of requests) {
      if (request.sender?._id.toString() === req.user._id.toString()) {
        sent.push(request);
      } else {
        received.push(request);
      }
    }

    return res.status(200).json({
      success: true,
      sent,
      received,
    });
  } catch (error) {
    console.error("Get exchange requests error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Could not load exchange requests.",
    });
  }
}

// Accept or reject a request received by the logged-in user
async function updateRequestStatus(req, res) {
  try {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Invalid request status.",
        errors: errors.array().map((error) => ({
          field: error.path,
          message: error.msg,
        })),
      });
    }

    const { id } = req.params;
    const { status } = req.body;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid exchange request ID.",
      });
    }

    if (!["accepted", "rejected"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Status must be accepted or rejected.",
      });
    }

    // Only the receiver can change a pending request.
    const updatedRequest = await ExchangeRequest.findOneAndUpdate(
      {
        _id: id,
        receiver: req.user._id,
        status: "pending",
      },
      {
        $set: { status },
      },
      {
        new: true,
        runValidators: true,
      },
    )
      .populate("sender", "name profileImage")
      .populate("receiver", "name profileImage");

    if (!updatedRequest) {
      const existingRequest =
        await ExchangeRequest.findById(id).select("receiver status");

      if (!existingRequest) {
        return res.status(404).json({
          success: false,
          message: "Exchange request not found.",
        });
      }

      if (existingRequest.receiver.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: "Only the receiver can update this request.",
        });
      }

      return res.status(409).json({
        success: false,
        message: "This request has already been processed.",
      });
    }

    // Notify the original sender when the request is accepted or rejected.
    try {
      const accepted = updatedRequest.status === "accepted";
      const receiverName = updatedRequest.receiver?.name || req.user.name;

      await createNotification({
        recipient: updatedRequest.sender._id,
        sender: req.user._id,
        type: accepted ? "exchange_accepted" : "exchange_rejected",
        title: accepted
          ? "Exchange request accepted"
          : "Exchange request rejected",
        message: accepted
          ? `${receiverName} accepted your skill exchange request.`
          : `${receiverName} rejected your skill exchange request.`,
        exchangeRequest: updatedRequest._id,
      });
    } catch (notificationError) {
      console.error(
        "Failed to create exchange status notification:",
        notificationError.message,
      );
    }

    return res.status(200).json({
      success: true,
      message: `Exchange request ${status} successfully.`,
      request: updatedRequest,
    });
  } catch (error) {
    console.error("Update exchange request error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Could not update the exchange request.",
    });
  }
}

// Delete an exchange request
async function deleteExchangeRequest(req, res) {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid exchange request ID.",
      });
    }

    // Only the sender or receiver of this request can delete it.
    const exchangeRequest = await ExchangeRequest.findOne({
      _id: id,
      $or: [{ sender: req.user._id }, { receiver: req.user._id }],
    });

    if (!exchangeRequest) {
      // Distinguish a missing request from one belonging to another user.
      const exists = await ExchangeRequest.exists({ _id: id });

      if (!exists) {
        return res.status(404).json({
          success: false,
          message: "Exchange request not found.",
        });
      }

      return res.status(403).json({
        success: false,
        message: "You are not allowed to delete this exchange request.",
      });
    }

    await ExchangeRequest.deleteOne({ _id: exchangeRequest._id });

    return res.status(200).json({
      success: true,
      message: "Exchange request deleted successfully.",
      id: exchangeRequest._id,
    });
  } catch (error) {
    console.error("Delete exchange request error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Could not delete the exchange request.",
    });
  }
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

module.exports = {
  createRequest,
  getMyRequests,
  updateRequestStatus,
  deleteExchangeRequest,
};
