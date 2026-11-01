const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const http = require("http");
const jwt = require("jsonwebtoken");
const { WebSocketServer, WebSocket } = require("ws");
require("dotenv").config();

// Routes
const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const exchangeRoutes = require("./routes/exchangeRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const sessionRoutes = require("./routes/sessionRoutes");
const reviewRoutes = require("./routes/reviewRoutes");
const chatRoutes = require("./routes/chatRoutes");
const callRoutes = require("./routes/callRoutes");

// Models
const User = require("./models/User");
const ExchangeRequest = require("./models/ExchangeRequest");
const Message = require("./models/Message");
const Call = require("./models/Call");

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 5000;

// -----------------------------------------
// CORS CONFIGURATION
// -----------------------------------------

const allowedOrigins = [
  process.env.CLIENT_URL,
  "https://skill-swap-green-psi.vercel.app",
  "https://skill-swap-ai-mock-interview.vercel.app",
  "https://skill-swap-git-main-ai-mock-interview.vercel.app",
  "http://localhost:5173",
  "http://localhost:5174",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:5174",
].filter(Boolean);

function isAllowedOrigin(origin) {
  if (!origin) return true;

  if (allowedOrigins.includes(origin)) {
    return true;
  }

  return /^https:\/\/skill-swap-[a-z0-9-]+\.vercel\.app$/i.test(origin);
}

const corsOptions = {
  origin: (origin, callback) => {
    if (isAllowedOrigin(origin)) {
      return callback(null, true);
    }

    console.warn("CORS blocked origin:", origin);
    return callback(new Error("Origin not allowed by CORS."));
  },

  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));
app.use(express.json({ limit: "10kb" }));

// -----------------------------------------
// HEALTH CHECK
// -----------------------------------------

app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Welcome to the SkillSwap API!",
  });
});

// -----------------------------------------
// API ROUTES
// -----------------------------------------

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/exchanges", exchangeRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/sessions", sessionRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/calls", callRoutes);

// -----------------------------------------
// WEBSOCKET CHAT SERVER
// -----------------------------------------

const wss = new WebSocketServer({
  server,
  path: "/ws",
  maxPayload: 10 * 1024,
});

const onlineUsers = new Map();
const userWatchedExchanges = new Map();

// -----------------------------------------
// SEND WEBSOCKET JSON RESPONSE
// -----------------------------------------

function sendWS(ws, data) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(data));
  }
}

// -----------------------------------------
// VERIFY ACCEPTED EXCHANGE
// -----------------------------------------

async function verifyChatAccess(exchangeId, userId) {
  if (!mongoose.isValidObjectId(exchangeId)) {
    return null;
  }

  return ExchangeRequest.findOne({
    _id: exchangeId,
    status: "accepted",
    $or: [{ sender: userId }, { receiver: userId }],
  });
}

// -----------------------------------------
// REGISTER CONNECTED USER
// -----------------------------------------

function registerUser(userId, ws) {
  const connections = onlineUsers.get(userId) || new Set();

  connections.add(ws);
  onlineUsers.set(userId, connections);
}

// -----------------------------------------
// REMOVE DISCONNECTED USER
// -----------------------------------------

function removeUser(userId, ws) {
  if (!userId) return;

  const connections = onlineUsers.get(userId);

  if (!connections) return;

  connections.delete(ws);

  if (connections.size === 0) {
    onlineUsers.delete(userId);
  }
}

// -----------------------------------------
// DELIVER MESSAGE TO USER
// -----------------------------------------

function deliverMessage(userId, data) {
  const connections = onlineUsers.get(userId);

  if (!connections) return;

  for (const connection of connections) {
    sendWS(connection, data);
  }
}

// -----------------------------------------
// NOTIFY PARTNER PRESENCE
// -----------------------------------------

async function notifyPartnerPresence(exchangeId, userId, status) {
  const exchange = await verifyChatAccess(exchangeId, userId);

  if (!exchange) return;

  const partnerId =
    exchange.sender.toString() === userId
      ? exchange.receiver.toString()
      : exchange.sender.toString();

  const connections = onlineUsers.get(partnerId);

  if (!connections) return;

  const presenceData = {
    type: "PRESENCE_UPDATE",
    exchangeId: exchangeId.toString(),
    userId,
    status,
  };

  for (const connection of connections) {
    if (connection.watchedExchanges?.has(exchangeId.toString())) {
      sendWS(connection, presenceData);
    }
  }
}

// -----------------------------------------
// WEBSOCKET CONNECTION
// -----------------------------------------

wss.on("connection", (ws, request) => {
  let authenticatedUser = null;
  let authTimeout;

  ws.watchedExchanges = new Set();

  const origin = request.headers.origin;

  if (!isAllowedOrigin(origin)) {
    ws.close(1008, "Origin not allowed");
    return;
  }

  console.log("New WebSocket connection.");

  authTimeout = setTimeout(() => {
    if (!authenticatedUser) {
      sendWS(ws, {
        type: "ERROR",
        message: "Authentication timeout.",
      });

      ws.close(1008, "Authentication required");
    }
  }, 10000);

  // -----------------------------------------
  // HANDLE WEBSOCKET MESSAGES
  // -----------------------------------------

  ws.on("message", async (rawMessage) => {
    try {
      const payload = JSON.parse(rawMessage.toString());

      // ---------------------------------
      // STEP 1: AUTHENTICATION
      // ---------------------------------

      if (!authenticatedUser) {
        if (payload.type !== "AUTH" || typeof payload.token !== "string") {
          sendWS(ws, {
            type: "ERROR",
            message: "Authentication required.",
          });

          ws.close(1008, "Authentication required");
          return;
        }

        const decoded = jwt.verify(payload.token, process.env.JWT_SECRET);

        if (!decoded.userId || !mongoose.isValidObjectId(decoded.userId)) {
          ws.close(1008, "Invalid authentication token");
          return;
        }

        const user = await User.findById(decoded.userId).select("_id isActive");

        if (!user || !user.isActive) {
          ws.close(1008, "User account inactive");
          return;
        }

        authenticatedUser = user._id.toString();

        clearTimeout(authTimeout);

        registerUser(authenticatedUser, ws);

        sendWS(ws, {
          type: "AUTH_SUCCESS",
          message: "WebSocket authentication successful.",
          userId: authenticatedUser,
        });

        console.log("Authenticated user:", authenticatedUser);

        return;
      }

      // ---------------------------------
      // STEP 2: HANDLE CALL EVENTS
      // ---------------------------------

      // START CALL
      if (payload.type === "CALL_START") {
        const { exchangeId, callId } = payload;

        if (
          typeof exchangeId !== "string" ||
          !mongoose.isValidObjectId(exchangeId) ||
          typeof callId !== "string" ||
          !/^[a-zA-Z0-9-]{10,100}$/.test(callId)
        ) {
          sendWS(ws, {
            type: "CALL_ERROR",
            callId,
            message: "Invalid call details.",
          });
          return;
        }

        const exchange = await verifyChatAccess(exchangeId, authenticatedUser);

        if (!exchange) {
          sendWS(ws, {
            type: "CALL_ERROR",
            callId,
            message: "Calls are allowed only for accepted exchanges.",
          });
          return;
        }

        const receiverId =
          exchange.sender.toString() === authenticatedUser
            ? exchange.receiver.toString()
            : exchange.sender.toString();

        if (!onlineUsers.has(receiverId)) {
          sendWS(ws, {
            type: "CALL_ERROR",
            callId,
            message: "User is currently offline.",
          });
          return;
        }

        const existingCall = await Call.findOne({
          status: { $in: ["ringing", "accepted"] },
          $or: [
            { caller: authenticatedUser },
            { receiver: authenticatedUser },
            { caller: receiverId },
            { receiver: receiverId },
          ],
        });

        if (existingCall) {
          sendWS(ws, {
            type: "CALL_ERROR",
            callId,
            message: "One of the users is already in a call.",
          });
          return;
        }

        const caller = await User.findById(authenticatedUser)
          .select("name")
          .lean();

        await Call.create({
          callId,
          exchangeRequest: exchange._id,
          caller: authenticatedUser,
          receiver: receiverId,
          status: "ringing",
        });

        deliverMessage(receiverId, {
          type: "INCOMING_CALL",
          callId,
          exchangeId,
          caller: {
            _id: authenticatedUser,
            name: caller?.name || "SkillSwap User",
          },
        });

        sendWS(ws, {
          type: "CALL_RINGING",
          callId,
          exchangeId,
          receiverId,
        });

        return;
      }

      // ACCEPT CALL
      if (payload.type === "CALL_ACCEPT") {
        const { callId } = payload;

        const call = await Call.findOneAndUpdate(
          {
            callId,
            receiver: authenticatedUser,
            status: "ringing",
          },
          {
            $set: {
              status: "accepted",
              acceptedAt: new Date(),
            },
          },
          { new: true },
        );

        if (!call) {
          sendWS(ws, {
            type: "CALL_ERROR",
            callId,
            message: "Call is no longer available.",
          });
          return;
        }

        const callData = {
          type: "CALL_ACCEPTED",
          callId,
          exchangeId: call.exchangeRequest.toString(),
        };

        deliverMessage(call.caller.toString(), callData);
        sendWS(ws, callData);

        return;
      }

      // REJECT CALL
      if (payload.type === "CALL_REJECT") {
        const { callId } = payload;

        const call = await Call.findOneAndUpdate(
          {
            callId,
            receiver: authenticatedUser,
            status: "ringing",
          },
          {
            $set: {
              status: "rejected",
              endedAt: new Date(),
            },
          },
          { new: true },
        );

        if (!call) {
          sendWS(ws, {
            type: "CALL_ERROR",
            callId,
            message: "Call is no longer available.",
          });
          return;
        }

        deliverMessage(call.caller.toString(), {
          type: "CALL_REJECTED",
          callId,
          exchangeId: call.exchangeRequest.toString(),
        });

        sendWS(ws, { type: "CALL_REJECTED", callId });

        return;
      }

      // CANCEL CALL
      if (payload.type === "CALL_CANCEL") {
        const { callId } = payload;

        const call = await Call.findOneAndUpdate(
          {
            callId,
            caller: authenticatedUser,
            status: "ringing",
          },
          {
            $set: {
              status: "cancelled",
              endedAt: new Date(),
            },
          },
          { new: true },
        );

        if (!call) {
          sendWS(ws, {
            type: "CALL_ERROR",
            callId,
            message: "Call cannot be cancelled.",
          });
          return;
        }

        deliverMessage(call.receiver.toString(), {
          type: "CALL_CANCELLED",
          callId,
          exchangeId: call.exchangeRequest.toString(),
        });

        sendWS(ws, { type: "CALL_CANCELLED", callId });

        return;
      }

      // END CALL
      if (payload.type === "CALL_END") {
        const { callId } = payload;

        const call = await Call.findOneAndUpdate(
          {
            callId,
            status: "accepted",
            $or: [
              { caller: authenticatedUser },
              { receiver: authenticatedUser },
            ],
          },
          {
            $set: {
              status: "ended",
              endedAt: new Date(),
            },
          },
          { new: true },
        );

        if (!call) {
          sendWS(ws, {
            type: "CALL_ERROR",
            callId,
            message: "Call is already ended or unavailable.",
          });
          return;
        }

        const otherUserId =
          call.caller.toString() === authenticatedUser
            ? call.receiver.toString()
            : call.caller.toString();

        deliverMessage(otherUserId, {
          type: "CALL_ENDED",
          callId,
          exchangeId: call.exchangeRequest.toString(),
        });

        sendWS(ws, { type: "CALL_ENDED", callId });

        return;
      }

      // ---------------------------------
      // STEP 3: HANDLE CHAT EVENTS
      // ---------------------------------

      // WATCH CHAT
      if (payload.type === "WATCH_CHAT") {
        const { exchangeId } = payload;

        if (
          typeof exchangeId !== "string" ||
          !mongoose.isValidObjectId(exchangeId)
        ) {
          sendWS(ws, {
            type: "ERROR",
            message: "Invalid exchange request ID.",
          });

          return;
        }

        const exchange = await verifyChatAccess(exchangeId, authenticatedUser);

        if (!exchange) {
          sendWS(ws, {
            type: "ERROR",
            message: "Chat access is allowed only for accepted exchanges.",
          });

          return;
        }

        ws.watchedExchanges.add(exchangeId);

        const watchedByUser =
          userWatchedExchanges.get(authenticatedUser) || new Set();

        watchedByUser.add(exchangeId);

        userWatchedExchanges.set(authenticatedUser, watchedByUser);

        const partnerId =
          exchange.sender.toString() === authenticatedUser
            ? exchange.receiver.toString()
            : exchange.sender.toString();

        sendWS(ws, {
          type: "PRESENCE_UPDATE",
          exchangeId,
          userId: partnerId,
          status: onlineUsers.has(partnerId) ? "online" : "offline",
        });

        await notifyPartnerPresence(exchangeId, authenticatedUser, "online");

        return;
      }

      // ---------------------------------
      // MARK MESSAGES AS READ
      // ---------------------------------

      if (payload.type === "MARK_READ") {
        const { exchangeId } = payload;

        if (
          typeof exchangeId !== "string" ||
          !mongoose.isValidObjectId(exchangeId)
        ) {
          sendWS(ws, {
            type: "ERROR",
            message: "Invalid exchange request ID.",
          });

          return;
        }

        const exchange = await verifyChatAccess(exchangeId, authenticatedUser);

        if (!exchange) {
          sendWS(ws, {
            type: "ERROR",
            message: "Chat access is allowed only for accepted exchanges.",
          });

          return;
        }

        const readAt = new Date();

        const result = await Message.updateMany(
          {
            exchangeRequest: exchange._id,
            receiver: authenticatedUser,
            readAt: null,
          },
          {
            $set: { readAt },
          },
        );

        if (result.modifiedCount > 0) {
          const originalSenderId =
            exchange.sender.toString() === authenticatedUser
              ? exchange.receiver.toString()
              : exchange.sender.toString();

          deliverMessage(originalSenderId, {
            type: "MESSAGES_READ",
            exchangeId,
            readerId: authenticatedUser,
            readAt,
          });
        }

        sendWS(ws, {
          type: "READ_MARKED",
          exchangeId,
          modifiedCount: result.modifiedCount,
        });

        return;
      }

      // ---------------------------------
      // SEND MESSAGE
      // ---------------------------------

      if (payload.type !== "SEND_MESSAGE") {
        sendWS(ws, {
          type: "ERROR",
          message: "Unsupported WebSocket event.",
        });

        return;
      }

      const { exchangeId, content } = payload;

      if (
        typeof exchangeId !== "string" ||
        !mongoose.isValidObjectId(exchangeId)
      ) {
        sendWS(ws, {
          type: "ERROR",
          message: "Invalid exchange request ID.",
        });

        return;
      }

      if (typeof content !== "string") {
        sendWS(ws, {
          type: "ERROR",
          message: "Message must be text.",
        });

        return;
      }

      const cleanContent = content.trim();

      if (!cleanContent || cleanContent.length > 2000) {
        sendWS(ws, {
          type: "ERROR",
          message: "Message must contain 1 to 2000 characters.",
        });

        return;
      }

      const exchange = await verifyChatAccess(exchangeId, authenticatedUser);

      if (!exchange) {
        sendWS(ws, {
          type: "ERROR",
          message: "Chat is allowed only for accepted exchanges.",
        });

        return;
      }

      const senderId = authenticatedUser;

      const receiverId =
        exchange.sender.toString() === senderId
          ? exchange.receiver.toString()
          : exchange.sender.toString();

      const savedMessage = await Message.create({
        exchangeRequest: exchange._id,
        sender: senderId,
        receiver: receiverId,
        content: cleanContent,
      });

      const populatedMessage = await Message.findById(savedMessage._id)
        .populate("sender", "name profileImage")
        .populate("receiver", "name profileImage")
        .lean();

      const messageData = {
        type: "NEW_MESSAGE",
        exchangeId: exchange._id.toString(),
        message: populatedMessage,
      };

      deliverMessage(receiverId, messageData);
      deliverMessage(senderId, messageData);
    } catch (error) {
      console.error("WebSocket error:", error.message);

      if (
        error.name === "JsonWebTokenError" ||
        error.name === "TokenExpiredError" ||
        error.name === "NotBeforeError"
      ) {
        sendWS(ws, {
          type: "ERROR",
          message: "Invalid or expired authentication token.",
        });

        ws.close(1008, "Authentication failed");
        return;
      }

      sendWS(ws, {
        type: "ERROR",
        message: "Could not process your message.",
      });
    }
  });

  // -----------------------------------------
  // HANDLE DISCONNECTION
  // -----------------------------------------

  ws.on("close", () => {
    clearTimeout(authTimeout);

    if (authenticatedUser) {
      removeUser(authenticatedUser, ws);

      if (!onlineUsers.has(authenticatedUser)) {
        const watchedExchanges =
          userWatchedExchanges.get(authenticatedUser) || new Set();

        userWatchedExchanges.delete(authenticatedUser);

        for (const exchangeId of watchedExchanges) {
          notifyPartnerPresence(exchangeId, authenticatedUser, "offline").catch(
            (error) => {
              console.error("Presence update error:", error.message);
            },
          );
        }
      }
    }

    console.log("WebSocket connection closed.");
  });

  ws.on("error", (error) => {
    console.error("WebSocket connection error:", error.message);
  });
});

// -----------------------------------------
// ERROR HANDLING
// -----------------------------------------

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "API endpoint not found.",
  });
});

app.use((error, req, res, next) => {
  console.error("Server error:", error.message);

  if (res.headersSent) {
    return next(error);
  }

  res.status(error.status || 500).json({
    success: false,
    message:
      error.status && error.status < 500
        ? error.message
        : "An unexpected server error occurred.",
  });
});

// -----------------------------------------
// START SERVER
// -----------------------------------------

async function startServer() {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error("MONGODB_URI is missing from the .env file.");
    }

    if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
      throw new Error("JWT_SECRET must contain at least 32 characters.");
    }

    await mongoose.connect(process.env.MONGODB_URI);

    console.log("MongoDB connected successfully!");

    server.listen(PORT, () => {
      console.log(`SkillSwap API running on port ${PORT}`);
      console.log(`SkillSwap WebSocket running on ws://localhost:${PORT}/ws`);
    });
  } catch (error) {
    console.error("Server startup failed:", error.message);
    process.exitCode = 1;
  }
}

startServer();
