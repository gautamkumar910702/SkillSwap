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

// Models
const User = require("./models/User");
const ExchangeRequest = require("./models/ExchangeRequest");
const Message = require("./models/Message");

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 5000;

// Allowed frontend origins
const allowedOrigins = [
  process.env.CLIENT_URL || "http://localhost:5173",
  "http://localhost:5173",
  "http://localhost:5174",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:5174",
];

// Middleware
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      console.warn("CORS blocked origin:", origin);
      return callback(new Error("Origin not allowed by CORS."));
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    optionsSuccessStatus: 204,
  }),
);

app.use(express.json({ limit: "10kb" }));

// Health check
app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Welcome to the SkillSwap API!",
  });
});

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/exchanges", exchangeRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/sessions", sessionRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/chat", chatRoutes);

// -----------------------------------------
// WEBSOCKET CHAT SERVER
// -----------------------------------------

const wss = new WebSocketServer({
  server,
  path: "/ws",
  maxPayload: 10 * 1024,
});

// Store active WebSocket connections and exchanges watched by each user.
const onlineUsers = new Map();
const userWatchedExchanges = new Map();

// Send JSON response
function sendWS(ws, data) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(data));
  }
}

// Verify accepted exchange and user membership
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

// Register connected user
function registerUser(userId, ws) {
  const connections = onlineUsers.get(userId) || new Set();

  connections.add(ws);
  onlineUsers.set(userId, connections);
}

// Remove disconnected user
function removeUser(userId, ws) {
  if (!userId) return;

  const connections = onlineUsers.get(userId);

  if (!connections) return;

  connections.delete(ws);

  if (connections.size === 0) {
    onlineUsers.delete(userId);
  }
}

// Deliver message to user's active connections
function deliverMessage(userId, data) {
  const connections = onlineUsers.get(userId);

  if (!connections) return;

  for (const connection of connections) {
    sendWS(connection, data);
  }
}

// Notify the other participant about a user's chat presence.
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

// WebSocket connection
wss.on("connection", (ws, request) => {
  let authenticatedUser = null;
  let authTimeout;

  // Exchanges this connection is currently watching for presence updates.
  ws.watchedExchanges = new Set();

  // Validate browser origin
  const origin = request.headers.origin;

  if (origin && !allowedOrigins.includes(origin)) {
    ws.close(1008, "Origin not allowed");
    return;
  }

  console.log("New WebSocket connection.");

  // Require authentication within 10 seconds
  authTimeout = setTimeout(() => {
    if (!authenticatedUser) {
      sendWS(ws, {
        type: "ERROR",
        message: "Authentication timeout.",
      });

      ws.close(1008, "Authentication required");
    }
  }, 10000);

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
      // STEP 2: HANDLE CHAT EVENTS
      // ---------------------------------

      // Subscribe this connection to presence updates for an accepted exchange.
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

        // Send the partner's current presence to this connection.
        sendWS(ws, {
          type: "PRESENCE_UPDATE",
          exchangeId,
          userId: partnerId,
          status: onlineUsers.has(partnerId) ? "online" : "offline",
        });

        // Tell the partner that this user has opened the chat.
        await notifyPartnerPresence(exchangeId, authenticatedUser, "online");

        return;
      }

      // Mark received messages as read and notify the original sender.
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

      // SEND_MESSAGE: Existing message functionality.
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

      // ---------------------------------
      // STEP 3: VERIFY ACCEPTED EXCHANGE
      // ---------------------------------

      const exchange = await verifyChatAccess(exchangeId, authenticatedUser);

      if (!exchange) {
        sendWS(ws, {
          type: "ERROR",
          message: "Chat is allowed only for accepted exchanges.",
        });
        return;
      }

      // Determine receiver using database IDs
      const senderId = authenticatedUser;

      const receiverId =
        exchange.sender.toString() === senderId
          ? exchange.receiver.toString()
          : exchange.sender.toString();

      // ---------------------------------
      // STEP 4: SAVE MESSAGE
      // ---------------------------------

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

      // Deliver message to receiver
      deliverMessage(receiverId, messageData);

      // Confirm to sender and other sender devices
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

  // ---------------------------------
  // HANDLE DISCONNECTION
  // ---------------------------------

  ws.on("close", () => {
    clearTimeout(authTimeout);

    if (authenticatedUser) {
      removeUser(authenticatedUser, ws);

      // Keep the user online while any tab/device remains connected.
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
