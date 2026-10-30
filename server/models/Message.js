const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    exchangeRequest: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ExchangeRequest",
      required: true,
      index: true,
    },

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

    content: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 2000,
    },

    readAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

// Efficient conversation history queries
messageSchema.index({
  exchangeRequest: 1,
  createdAt: -1,
});

// Efficient unread message queries
messageSchema.index({
  receiver: 1,
  exchangeRequest: 1,
  readAt: 1,
});

module.exports = mongoose.model("Message", messageSchema);
