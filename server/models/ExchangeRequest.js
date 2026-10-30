const mongoose = require("mongoose");

const exchangeRequestSchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    receiver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    offeredSkill: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 60,
    },

    requestedSkill: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 60,
    },

    message: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
    },

    status: {
      type: String,
      enum: ["pending", "accepted", "rejected", "cancelled"],
      default: "pending",
      index: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

// Prevent duplicate pending requests for the same skill exchange.
exchangeRequestSchema.index(
  {
    sender: 1,
    receiver: 1,
    offeredSkill: 1,
    requestedSkill: 1,
    status: 1,
  },
  { name: "exchange_request_lookup" },
);

module.exports = mongoose.model("ExchangeRequest", exchangeRequestSchema);
