
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useLocation, useNavigate } from "react-router-dom";

import chatSocket from "../services/chatSocket";
import "./CallProvider.css";

const CallContext = createContext(null);

export const useCall = () => useContext(CallContext);

function CallProvider({ children }) {
  const navigate = useNavigate();
  const location = useLocation();

  const [incomingCall, setIncomingCall] = useState(null);
  const [outgoingCall, setOutgoingCall] = useState(null);

  const outgoingCallRef = useRef(null);
  const ringtoneRef = useRef(null);

  const updateOutgoingCall = useCallback((call) => {
    outgoingCallRef.current = call;
    setOutgoingCall(call);
  }, []);

  const stopRingtone = useCallback(() => {
    if (ringtoneRef.current) {
      window.clearInterval(ringtoneRef.current.interval);
      ringtoneRef.current.audioContext.close().catch(() => {});
      ringtoneRef.current = null;
    }
  }, []);

  const playRingtone = useCallback(() => {
    try {
      stopRingtone();

      const AudioContext =
        window.AudioContext || window.webkitAudioContext;

      if (!AudioContext) return;

      const audioContext = new AudioContext();
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();

      oscillator.type = "sine";
      oscillator.frequency.value = 750;
      gain.gain.value = 0.06;

      oscillator.connect(gain);
      gain.connect(audioContext.destination);

      oscillator.start();

      const interval = window.setInterval(() => {
        if (audioContext.state === "closed") return;

        oscillator.frequency.setValueAtTime(
          oscillator.frequency.value === 750 ? 950 : 750,
          audioContext.currentTime
        );
      }, 700);

      ringtoneRef.current = {
        audioContext,
        oscillator,
        interval,
      };
    } catch (error) {
      console.error("Ringtone error:", error);
    }
  }, [stopRingtone]);

  const handleIncomingCall = useCallback(
    (data) => {
      if (!data?.callId || !data?.exchangeId) return;

      setIncomingCall(data);
      playRingtone();
    },
    [playRingtone]
  );

  const handleCallAccepted = useCallback(
    (data) => {
      const currentCall = outgoingCallRef.current;

      if (!currentCall) return;
      if (data?.callId !== currentCall.callId) return;

      stopRingtone();
      updateOutgoingCall(null);

      navigate(
        `/call/exchange/${currentCall.exchangeId}/${currentCall.callId}`
      );
    },
    [navigate, stopRingtone, updateOutgoingCall]
  );

  const handleCallRejected = useCallback(
    (data) => {
      const currentCall = outgoingCallRef.current;

      if (!currentCall || data?.callId !== currentCall.callId) return;

      stopRingtone();
      updateOutgoingCall(null);

      window.alert("Your call was rejected.");
    },
    [stopRingtone, updateOutgoingCall]
  );

  const handleCallCancelled = useCallback(
    (data) => {
      stopRingtone();

      setIncomingCall((current) =>
        current?.callId === data?.callId ? null : current
      );

      if (outgoingCallRef.current?.callId === data?.callId) {
        updateOutgoingCall(null);
      }
    },
    [stopRingtone, updateOutgoingCall]
  );

  const handleCallEnded = useCallback(
    (data) => {
      stopRingtone();

      setIncomingCall((current) =>
        current?.callId === data?.callId ? null : current
      );

      if (outgoingCallRef.current?.callId === data?.callId) {
        updateOutgoingCall(null);
      }
    },
    [stopRingtone, updateOutgoingCall]
  );

  const handleCallError = useCallback(
    (data) => {
      stopRingtone();
      updateOutgoingCall(null);

      window.alert(data?.message || "Unable to complete the call.");
    },
    [stopRingtone, updateOutgoingCall]
  );

  useEffect(() => {
    const token = localStorage.getItem("skillswap_token");

    if (!token) return;

    let mounted = true;

    const listeners = [
      ["INCOMING_CALL", handleIncomingCall],
      ["CALL_ACCEPTED", handleCallAccepted],
      ["CALL_REJECTED", handleCallRejected],
      ["CALL_CANCELLED", handleCallCancelled],
      ["CALL_ENDED", handleCallEnded],
      ["CALL_ERROR", handleCallError],
    ];

    listeners.forEach(([event, callback]) => {
      chatSocket.on(event, callback);
    });

    chatSocket.connect().catch((error) => {
      if (mounted) {
        console.error("Call socket connection error:", error);
      }
    });

    return () => {
      mounted = false;

      listeners.forEach(([event, callback]) => {
        chatSocket.off(event, callback);
      });

      stopRingtone();
    };
  }, [
    location.pathname,
    handleIncomingCall,
    handleCallAccepted,
    handleCallRejected,
    handleCallCancelled,
    handleCallEnded,
    handleCallError,
    stopRingtone,
  ]);

  const acceptIncomingCall = () => {
    if (!incomingCall) return;

    const { exchangeId, callId } = incomingCall;

    stopRingtone();
    setIncomingCall(null);

    chatSocket.acceptCall(callId);

    navigate(`/call/exchange/${exchangeId}/${callId}`);
  };

  const rejectIncomingCall = () => {
    if (!incomingCall) return;

    const callId = incomingCall.callId;

    stopRingtone();
    setIncomingCall(null);

    chatSocket.rejectCall(callId);
  };

  const cancelOutgoingCall = () => {
    const currentCall = outgoingCallRef.current;

    if (!currentCall) return;

    chatSocket.cancelCall(currentCall.callId);
    updateOutgoingCall(null);
  };

  const contextValue = {
    incomingCall,
    outgoingCall,
    setOutgoingCall: updateOutgoingCall,
    cancelOutgoingCall,
  };

  return (
    <CallContext.Provider value={contextValue}>
      {children}

      {incomingCall && (
        <div className="incoming-call-overlay">
          <div className="incoming-call-card">
            <div className="incoming-call-icon">📞</div>

            <h2>Incoming SkillSwap Call</h2>

            <p>
              {incomingCall.caller?.name ||
                incomingCall.callerName ||
                "SkillSwap User"}{" "}
              is calling you.
            </p>

            <div className="incoming-call-actions">
              <button
                type="button"
                className="accept-call-btn"
                onClick={acceptIncomingCall}
              >
                Accept
              </button>

              <button
                type="button"
                className="reject-call-btn"
                onClick={rejectIncomingCall}
              >
                Reject
              </button>
            </div>
          </div>
        </div>
      )}

      {outgoingCall && (
        <div className="incoming-call-overlay">
          <div className="incoming-call-card">
            <div className="incoming-call-icon">📞</div>

            <h2>Calling...</h2>

            <p>Waiting for your exchange partner to answer.</p>

            <div className="incoming-call-actions">
              <button
                type="button"
                className="reject-call-btn"
                onClick={cancelOutgoingCall}
              >
                Cancel Call
              </button>
            </div>
          </div>
        </div>
      )}
    </CallContext.Provider>
  );
}

export default CallProvider;
