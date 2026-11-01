
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../services/api";
import chatSocket from "../services/chatSocket";
import { useCall } from "../components/CallProvider";
import "./ChatPage.css";

function getCurrentUserId() {
  try {
    const token = localStorage.getItem("skillswap_token");
    if (!token) return null;

    const payload = token.split(".")[1];
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const decoded = JSON.parse(atob(normalized));

    return decoded.userId || null;
  } catch {
    return null;
  }
}

function ChatPage() {
  const { exchangeId } = useParams();
  const navigate = useNavigate();
  const { setOutgoingCall } = useCall();

  const currentUserId = getCurrentUserId();

  const [messages, setMessages] = useState([]);
  const [partner, setPartner] = useState(null);
  const [exchange, setExchange] = useState(null);
  const [messageInput, setMessageInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [connected, setConnected] = useState(false);
  const [partnerStatus, setPartnerStatus] = useState("checking");
  const [error, setError] = useState("");
  const [socketError, setSocketError] = useState("");

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const partnerIdRef = useRef(null);
  const messagesLoadedRef = useRef(false);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, []);

  // Load chat history and exchange participant details.
  useEffect(() => {
    let active = true;

    async function loadChat() {
      try {
        setLoading(true);
        setError("");
        messagesLoadedRef.current = false;

        if (!currentUserId) {
          throw new Error("Please log in again to access chat.");
        }

        const [chatResponse, exchangeResponse] = await Promise.all([
          api.get(`/chat/${exchangeId}/messages?limit=100`),
          api.get("/exchanges/mine"),
        ]);

        if (!active) return;

        const chatData = chatResponse.data;
        const exchangeData = exchangeResponse.data;

        if (!chatData.success) {
          throw new Error("Could not load chat messages.");
        }

        const allRequests = [
          ...(exchangeData.sent || []),
          ...(exchangeData.received || []),
        ];

        const currentExchange = allRequests.find(
          (request) => request._id === exchangeId
        );

        if (!currentExchange || currentExchange.status !== "accepted") {
          throw new Error("This exchange is not available for chat.");
        }

        const senderId =
          currentExchange.sender?._id?.toString() ||
          currentExchange.sender?.toString();

        const receiverId =
          currentExchange.receiver?._id?.toString() ||
          currentExchange.receiver?.toString();

        const partnerUser =
          senderId === currentUserId
            ? currentExchange.receiver
            : receiverId === currentUserId
              ? currentExchange.sender
              : null;

        if (!partnerUser) {
          throw new Error("You are not a participant in this exchange.");
        }

        const partnerId =
          partnerUser._id?.toString() || partnerUser.toString();

        partnerIdRef.current = partnerId;

        setExchange(currentExchange);
        setPartner(partnerUser);
        setMessages(chatData.messages || []);
        messagesLoadedRef.current = true;
      } catch (err) {
        if (active) {
          setError(
            err.response?.data?.message ||
              err.message ||
              "Unable to load chat."
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadChat();

    return () => {
      active = false;
    };
  }, [exchangeId, currentUserId]);

  // Connect WebSocket and listen for real-time chat events.
  useEffect(() => {
    let active = true;

    const handleNewMessage = (data) => {
      if (!active || data.exchangeId !== exchangeId || !data.message) {
        return;
      }

      const senderId =
        data.message.sender?._id?.toString() ||
        data.message.sender?.toString();

      setMessages((previousMessages) => {
        const alreadyExists = previousMessages.some(
          (message) => message._id === data.message._id
        );

        if (alreadyExists) return previousMessages;

        return [...previousMessages, data.message];
      });

      // Automatically mark incoming messages as read.
      if (senderId !== currentUserId) {
        try {
          chatSocket.markRead(exchangeId);
        } catch (err) {
          console.error("Could not mark message as read:", err.message);
        }
      }
    };

    const handlePresenceUpdate = (data) => {
      if (
        !active ||
        data.exchangeId !== exchangeId ||
        data.userId?.toString() !== partnerIdRef.current
      ) {
        return;
      }

      setPartnerStatus(data.status === "online" ? "online" : "offline");
    };

    const handleMessagesRead = (data) => {
      if (
        !active ||
        data.exchangeId !== exchangeId ||
        data.readerId?.toString() !== partnerIdRef.current
      ) {
        return;
      }

      setMessages((previousMessages) =>
        previousMessages.map((message) => {
          const senderId =
            message.sender?._id?.toString() ||
            message.sender?.toString();

          if (senderId === currentUserId && !message.readAt) {
            return {
              ...message,
              readAt: data.readAt || new Date().toISOString(),
            };
          }

          return message;
        })
      );
    };

    const handleSocketError = (data) => {
      if (active) {
        setSocketError(data.message || "Chat connection error.");
      }
    };

    const handleCallError = (data) => {
      if (!active) return;
      setOutgoingCall(null);
      setSocketError(data.message || "Unable to start the call.");
    };

    const handleDisconnect = () => {
      if (active) {
        setConnected(false);
        setPartnerStatus("offline");
        setSocketError("Connection lost. Please reconnect.");
      }
    };

    const unsubscribeMessage = chatSocket.on(
      "NEW_MESSAGE",
      handleNewMessage
    );

    const unsubscribePresence = chatSocket.on(
      "PRESENCE_UPDATE",
      handlePresenceUpdate
    );

    const unsubscribeRead = chatSocket.on(
      "MESSAGES_READ",
      handleMessagesRead
    );

    const unsubscribeError = chatSocket.on(
      "ERROR",
      handleSocketError
    );

    const unsubscribeDisconnect = chatSocket.on(
      "DISCONNECTED",
      handleDisconnect
    );

    const unsubscribeCallError = chatSocket.on(
      "CALL_ERROR",
      handleCallError
    );

    const connectAndWatch = () => {
      chatSocket
        .connect()
        .then(() => {
          if (!active) return;

          setConnected(true);
          setSocketError("");

          // Subscribe to this exchange's presence updates.
          chatSocket.watchChat(exchangeId);

          // Mark existing incoming messages as read.
          if (messagesLoadedRef.current) {
            chatSocket.markRead(exchangeId);
          }
        })
        .catch((err) => {
          if (active) {
            setConnected(false);
            setSocketError(err.message || "Unable to connect to chat.");
          }
        });
    };

    connectAndWatch();

    return () => {
      active = false;
      unsubscribeMessage();
      unsubscribePresence();
      unsubscribeRead();
      unsubscribeError();
      unsubscribeDisconnect();
      unsubscribeCallError();

      // Do not disconnect here.
      // CallProvider manages the shared WebSocket connection.
    };
  }, [exchangeId, currentUserId, setOutgoingCall]);

  // Scroll to the latest message when messages change.
  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Start a direct call with the exchange partner.
  function handleStartCall() {
    if (!connected) {
      setSocketError("Chat connection is not ready. Please reconnect.");
      return;
    }

    if (partnerStatus !== "online") {
      setSocketError("Your exchange partner is currently offline.");
      return;
    }

    if (!exchangeId || !partner) return;

    const callId =
      globalThis.crypto?.randomUUID?.() ||
      `call-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

    const callDetails = {
      callId,
      exchangeId,
      callerName: "You",
      receiverName: partner.name || "SkillSwap User",
    };

    try {
      setSocketError("");
      setOutgoingCall(callDetails);
      chatSocket.startCall(exchangeId, callId);
    } catch (err) {
      setOutgoingCall(null);
      setSocketError(err.message || "Could not start the call.");
    }
  }

  async function handleSendMessage(event) {
    event.preventDefault();

    const content = messageInput.trim();

    if (!content || sending) return;

    if (!connected) {
      setSocketError("Chat is not connected. Please reconnect.");
      return;
    }

    try {
      setSending(true);
      setSocketError("");

      chatSocket.sendMessage(exchangeId, content);

      setMessageInput("");
      inputRef.current?.focus();
    } catch (err) {
      setSocketError(err.message || "Could not send message.");
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(event) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSendMessage(event);
    }
  }

  function formatMessageTime(date) {
    if (!date) return "";

    return new Date(date).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function isOwnMessage(message) {
    const senderId =
      message.sender?._id?.toString() ||
      message.sender?.toString();

    return senderId === currentUserId;
  }

  if (loading) {
    return (
      <main className="chat-page">
        <div className="chat-state">
          <div className="chat-loader" />
          <p>Loading your conversation...</p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="chat-page">
        <div className="chat-state">
          <div className="chat-state-icon">!</div>
          <h2>Unable to open chat</h2>
          <p>{error}</p>
          <button
            className="chat-back-button"
            onClick={() => navigate("/dashboard")}
          >
            Back to Dashboard
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="chat-page">
      <section className="chat-container">
        {/* Chat Header */}
        <header className="chat-header">
          <button
            className="chat-back-icon"
            onClick={() => navigate("/dashboard")}
            aria-label="Back to dashboard"
          >
            ←
          </button>

          <div className="chat-partner-info">
            <div className="chat-avatar">
              {partner?.profileImage ? (
                <img
                  src={partner.profileImage}
                  alt={partner.name || "Chat partner"}
                />
              ) : (
                <span>
                  {partner?.name?.charAt(0)?.toUpperCase() || "U"}
                </span>
              )}
            </div>

            <div className="chat-partner-details">
              <h2>{partner?.name || "SkillSwap User"}</h2>

              <span className="chat-subtitle">
                {exchange?.offeredSkill || "Skill Exchange"}
                {" "}·{" "}
                {exchange?.requestedSkill || "Conversation"}
              </span>
            </div>
          </div>

          <button
            type="button"
            className="chat-call-button"
            onClick={handleStartCall}
            disabled={!connected || partnerStatus !== "online"}
            title={
              partnerStatus !== "online"
                ? "Your partner must be online to call"
                : "Start video call"
            }
          >
            📹 Call
          </button>

          {/* Partner Online / Offline Status */}
          <div className="chat-connection">
            <span
              className={`connection-dot ${
                partnerStatus === "online"
                  ? "online"
                  : "offline"
              }`}
            />

            <span>
              {partnerStatus === "checking"
                ? "Checking..."
                : partnerStatus === "online"
                  ? "Online"
                  : "Offline"}
            </span>
          </div>
        </header>

        {/* Connection Error */}
        {socketError && (
          <div className="chat-alert">
            <span>{socketError}</span>

            {!connected && (
              <button
                onClick={() => {
                  setSocketError("");
                  chatSocket
                    .connect()
                    .then(() => {
                      setConnected(true);
                      setSocketError("");
                      chatSocket.watchChat(exchangeId);
                      chatSocket.markRead(exchangeId);
                    })
                    .catch((err) => {
                      setSocketError(err.message);
                    });
                }}
              >
                Reconnect
              </button>
            )}
          </div>
        )}

        {/* Messages */}
        <div className="chat-messages">
          {messages.length === 0 ? (
            <div className="chat-empty">
              <div className="chat-empty-icon">✉</div>
              <h3>Start your conversation</h3>
              <p>
                Your exchange request has been accepted.
                Send a message and start learning together!
              </p>
            </div>
          ) : (
            messages.map((message) => {
              const own = isOwnMessage(message);

              return (
                <div
                  key={message._id}
                  className={`message-row ${
                    own ? "message-own" : "message-other"
                  }`}
                >
                  {!own && (
                    <div className="message-avatar">
                      {partner?.profileImage ? (
                        <img
                          src={partner.profileImage}
                          alt={partner.name || "User"}
                        />
                      ) : (
                        <span>
                          {partner?.name?.charAt(0)?.toUpperCase() || "U"}
                        </span>
                      )}
                    </div>
                  )}

                  <div className="message-content">
                    <div className="message-bubble">
                      {message.content}
                    </div>

                    <span className="message-time">
                      {formatMessageTime(message.createdAt)}
                      {own && (
                        message.readAt ? " · Read" : " · Sent"
                      )}
                    </span>
                  </div>
                </div>
              );
            })
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Message Input */}
        <form className="chat-input-area" onSubmit={handleSendMessage}>
          <textarea
            ref={inputRef}
            value={messageInput}
            onChange={(event) => setMessageInput(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Write a message..."
            maxLength={2000}
            rows={1}
            disabled={!connected}
          />

          <button
            type="submit"
            className="chat-send-button"
            disabled={!connected || !messageInput.trim() || sending}
            aria-label="Send message"
          >
            {sending ? "..." : "➤"}
          </button>
        </form>

        <div className="chat-input-footer">
          <span>Press Enter to send · Shift + Enter for a new line</span>
          <span>{messageInput.length}/2000</span>
        </div>
      </section>
    </main>
  );
}

export default ChatPage;
