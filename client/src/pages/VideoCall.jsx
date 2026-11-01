
import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  LiveKitRoom,
  VideoConference,
} from "@livekit/components-react";

import api from "../services/api";
import chatSocket from "../services/chatSocket";
import "./VideoCall.css";

function VideoCall() {
  const { sessionId, exchangeId, callId } = useParams();
  const navigate = useNavigate();

  const [connection, setConnection] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const isDirectCall = Boolean(exchangeId && callId);

  // Prevent sending CALL_END more than once.
  const callEndedRef = useRef(false);

  const endDirectCall = useCallback(() => {
    if (!isDirectCall || !callId || callEndedRef.current) return;

    callEndedRef.current = true;
    chatSocket.endCall(callId);
  }, [isDirectCall, callId]);

  const handleLeaveCall = () => {
    endDirectCall();
    navigate("/dashboard", { replace: true });
  };

  useEffect(() => {
    let cancelled = false;

    async function prepareCall() {
      try {
        setLoading(true);
        setError("");
        setConnection(null);

        let response;

        if (isDirectCall) {
          response = await api.post(
            `/calls/${exchangeId}/${callId}/token`
          );
        } else if (sessionId) {
          response = await api.post(
            `/sessions/${sessionId}/token`
          );
        } else {
          throw new Error("Call details are missing.");
        }

        const data = response.data;

        if (!data?.token || !data?.serverUrl) {
          throw new Error(
            "The server did not return the video-call credentials."
          );
        }

        if (!cancelled) {
          setConnection({
            token: data.token,
            serverUrl: data.serverUrl,
          });
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err.response?.data?.message ||
              err.message ||
              "Could not join this video call."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    if (!localStorage.getItem("skillswap_token")) {
      navigate("/login", { replace: true });
    } else {
      prepareCall();
    }

    return () => {
      cancelled = true;
    };
  }, [sessionId, exchangeId, callId, isDirectCall, navigate]);

  if (loading) {
    return (
      <main className="video-call-page">
        <div className="video-call-message">
          <p className="video-call-eyebrow">
            SKILLSWAP LIVE
          </p>

          <h1>Preparing your call…</h1>

          <p>Connecting securely to your session.</p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="video-call-page">
        <div className="video-call-message">
          <p className="video-call-eyebrow">
            SKILLSWAP LIVE
          </p>

          <h1>Could not join the call</h1>

          <p className="video-call-error" role="alert">
            {error}
          </p>

          <Link className="video-call-back" to="/dashboard">
            Back to Dashboard
          </Link>
        </div>
      </main>
    );
  }

  if (!connection) return null;

  return (
    <main className="video-call-page">
      <header className="video-call-header">
        <div>
          <p className="video-call-eyebrow">
            SKILLSWAP LIVE
          </p>

          <h1>
            {isDirectCall
              ? "Direct Skill Exchange Call"
              : "Skill exchange call"}
          </h1>
        </div>

        <button
          type="button"
          className="video-call-back"
          onClick={handleLeaveCall}
        >
          Leave call
        </button>
      </header>

      <div className="video-call-room">
        <LiveKitRoom
          serverUrl={connection.serverUrl}
          token={connection.token}
          connect={true}
          audio={true}
          video={true}
          onError={(roomError) => {
            console.error("LiveKit room error:", roomError);

            setError(
              "Could not connect to the video room. Check camera/microphone permissions and try again."
            );
          }}
          onDisconnected={() => {
            endDirectCall();
            navigate("/dashboard", { replace: true });
          }}
        >
          <VideoConference />
        </LiveKitRoom>
      </div>
    </main>
  );
}

export default VideoCall;
