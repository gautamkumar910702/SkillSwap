const WS_URL =
  import.meta.env.VITE_WS_URL ||
  (import.meta.env.PROD
    ? "wss://skillswap-210h.onrender.com/ws"
    : "ws://localhost:5000/ws");

class ChatSocket {
  constructor() {
    this.socket = null;
    this.listeners = new Map();
    this.authenticated = false;
    this.connectingPromise = null;
  }

  connect() {
    if (this.socket?.readyState === WebSocket.OPEN && this.authenticated) {
      return Promise.resolve();
    }

    if (this.connectingPromise) {
      return this.connectingPromise;
    }

    const token = localStorage.getItem("skillswap_token");

    if (!token) {
      return Promise.reject(new Error("Please log in to use chat."));
    }

    this.connectingPromise = new Promise((resolve, reject) => {
      const socket = new WebSocket(WS_URL);
      this.socket = socket;

      let settled = false;
      let authenticated = false;

      const cleanup = () => {
        clearTimeout(connectionTimeout);
      };

      const fail = (message) => {
        if (settled) return;

        settled = true;
        cleanup();
        reject(new Error(message));
      };

      const connectionTimeout = setTimeout(() => {
        if (!authenticated) {
          fail("Chat connection timed out.");
          socket.close();
        }
      }, 12000);

      socket.onopen = () => {
        socket.send(
          JSON.stringify({
            type: "AUTH",
            token,
          }),
        );
      };

      socket.onmessage = (event) => {
        let data;

        try {
          data = JSON.parse(event.data);
        } catch {
          return;
        }

        if (data.type === "AUTH_SUCCESS") {
          authenticated = true;
          this.authenticated = true;

          if (!settled) {
            settled = true;
            cleanup();
            resolve();
          }
        }

        if (data.type === "ERROR" && !authenticated) {
          fail(data.message || "Chat authentication failed.");

          socket.close();
        }

        this.listeners.forEach((callbacks, type) => {
          if (type === data.type) {
            callbacks.forEach((callback) => callback(data));
          }
        });
      };

      socket.onerror = () => {
        fail("Unable to connect to the chat server.");
      };

      socket.onclose = () => {
        cleanup();

        if (!authenticated) {
          fail("Chat connection closed before authentication.");
        }

        if (this.socket === socket) {
          this.socket = null;
          this.authenticated = false;
        }

        this.listeners.forEach((callbacks) => {
          callbacks.forEach((callback) => {
            callback({ type: "DISCONNECTED" });
          });
        });
      };
    }).finally(() => {
      this.connectingPromise = null;
    });

    return this.connectingPromise;
  }

  // Send a chat message
  sendMessage(exchangeId, content) {
    this.send({
      type: "SEND_MESSAGE",
      exchangeId,
      content,
    });
  }

  // Subscribe to partner online/offline status
  watchChat(exchangeId) {
    this.send({
      type: "WATCH_CHAT",
      exchangeId,
    });
  }

  // Mark received messages as read
  markRead(exchangeId) {
    this.send({
      type: "MARK_READ",
      exchangeId,
    });
  }

  // Common WebSocket sender
  send(data) {
    if (
      !this.socket ||
      this.socket.readyState !== WebSocket.OPEN ||
      !this.authenticated
    ) {
      throw new Error("Chat is not connected. Please reconnect.");
    }

    this.socket.send(JSON.stringify(data));
  }

  // Register event listener
  on(type, callback) {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }

    this.listeners.get(type).add(callback);

    return () => this.off(type, callback);
  }

  // Remove event listener
  off(type, callback) {
    const callbacks = this.listeners.get(type);

    if (!callbacks) return;

    callbacks.delete(callback);

    if (callbacks.size === 0) {
      this.listeners.delete(type);
    }
  }

  // Disconnect WebSocket
  disconnect() {
    const socket = this.socket;

    this.socket = null;
    this.authenticated = false;
    this.connectingPromise = null;

    if (socket) {
      socket.close();
    }
  }
}

const chatSocket = new ChatSocket();

export default chatSocket;
