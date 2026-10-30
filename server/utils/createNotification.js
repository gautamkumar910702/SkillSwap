const Notification = require("../models/Notification");

async function createNotification({
  recipient,
  sender = null,
  type,
  title,
  message,
  exchangeRequest = null,
  relatedId = null,
  relatedModel = null,
}) {
  if (!recipient || !type || !title || !message) {
    throw new Error(
      "recipient, type, title and message are required for a notification.",
    );
  }

  return Notification.create({
    recipient,
    sender,
    type,
    title,
    message,
    exchangeRequest,
    relatedId,
    relatedModel,
  });
}

module.exports = createNotification;
