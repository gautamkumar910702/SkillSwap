
import { useCallback, useEffect, useState } from "react";
import api from "../services/api";
import "./Sessions.css";

function getOtherUser(session, currentUserId) {
  const host = session.host;
  const participant = session.participant;

  const hostId = host?._id || host?.id || host;
  const participantId =
    participant?._id || participant?.id || participant;

  return String(hostId) === String(currentUserId)
    ? participant
    : host;
}

function formatDate(date) {
  if (!date) return "Date not available";

  return new Date(date).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function Sessions() {
  const [sessions, setSessions] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [currentUserId, setCurrentUserId] = useState("");
  const [ratings, setRatings] = useState({});
  const [comments, setComments] = useState({});
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const savedUser = JSON.parse(
        localStorage.getItem("skillswap_user") || "{}"
      );

      const userId = savedUser._id || savedUser.id || "";
      setCurrentUserId(userId);

      const [sessionResponse, reviewResponse] =
        await Promise.all([
          api.get("/sessions/mine"),
          api.get("/reviews/given"),
        ]);

      setSessions(sessionResponse.data.sessions || []);
      setReviews(reviewResponse.data.reviews || []);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Could not load your sessions. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const hasReviewed = (sessionId) =>
    reviews.some((review) => {
      const id =
        review.session?._id || review.session?.id || review.session;

      return String(id) === String(sessionId);
    });

  async function completeSession(sessionId) {
    setBusyId(sessionId);
    setError("");
    setSuccess("");

    try {
      const response = await api.patch(
        `/sessions/${sessionId}/complete`
      );

      setSuccess(
        response.data.message || "Session completed successfully."
      );

      await loadData();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Could not complete this session."
      );
    } finally {
      setBusyId("");
    }
  }

  async function submitReview(session) {
    const sessionId = session._id;
    const rating = ratings[sessionId] || 0;
    const comment = comments[sessionId] || "";

    if (rating < 1 || rating > 5) {
      setError("Please select a rating from 1 to 5 stars.");
      return;
    }

    setBusyId(sessionId);
    setError("");
    setSuccess("");

    try {
      const response = await api.post("/reviews", {
        sessionId,
        rating,
        comment,
      });

      setReviews((previous) => [
        response.data.review,
        ...previous,
      ]);

      setSuccess("Your review was submitted successfully!");

      setRatings((previous) => ({
        ...previous,
        [sessionId]: 0,
      }));

      setComments((previous) => ({
        ...previous,
        [sessionId]: "",
      }));
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Could not submit your review."
      );
    } finally {
      setBusyId("");
    }
  }

  if (loading) {
    return (
      <div className="sessions-page">
        <p className="sessions-loading">Loading your sessions...</p>
      </div>
    );
  }

  return (
    <main className="sessions-page">
      <header className="sessions-header">
        <div>
          <p className="sessions-eyebrow">YOUR LEARNING JOURNEY</p>
          <h1>Sessions & Reviews</h1>
          <p className="sessions-subtitle">
            Manage your skill-sharing sessions and share your experience.
          </p>
        </div>

        <button
          className="sessions-refresh"
          onClick={loadData}
          disabled={loading || Boolean(busyId)}
        >
          Refresh
        </button>
      </header>

      {error && (
        <div className="sessions-alert sessions-alert-error">
          {error}
        </div>
      )}

      {success && (
        <div className="sessions-alert sessions-alert-success">
          {success}
        </div>
      )}

      <section className="sessions-stats">
        <div className="sessions-stat">
          <span>Total sessions</span>
          <strong>{sessions.length}</strong>
        </div>

        <div className="sessions-stat">
          <span>Upcoming</span>
          <strong>
            {sessions.filter((s) => s.status === "scheduled").length}
          </strong>
        </div>

        <div className="sessions-stat">
          <span>Completed</span>
          <strong>
            {sessions.filter((s) => s.status === "completed").length}
          </strong>
        </div>

        <div className="sessions-stat">
          <span>Reviews given</span>
          <strong>{reviews.length}</strong>
        </div>
      </section>

      <section className="sessions-list-section">
        <h2>Your sessions</h2>

        {sessions.length === 0 ? (
          <div className="sessions-empty">
            <span className="sessions-empty-icon">📅</span>
            <h3>No sessions yet</h3>
            <p>
              When you schedule a session through an accepted exchange,
              it will appear here.
            </p>
          </div>
        ) : (
          <div className="sessions-list">
            {sessions.map((session) => {
              const otherUser = getOtherUser(
                session,
                currentUserId
              );

              const sessionId = session._id;
              const reviewed = hasReviewed(sessionId);
              const status = session.status || "scheduled";

              return (
                <article
                  className="session-card"
                  key={sessionId}
                >
                  <div className="session-card-top">
                    <div className="session-avatar">
                      {otherUser?.name
                        ?.trim()
                        ?.charAt(0)
                        ?.toUpperCase() || "U"}
                    </div>

                    <div className="session-person">
                      <h3>{otherUser?.name || "Exchange partner"}</h3>
                      <p>{session.title || "Skill-sharing session"}</p>
                    </div>

                    <span
                      className={`session-status status-${status}`}
                    >
                      {status}
                    </span>
                  </div>

                  <div className="session-details">
                    <div>
                      <span>Date & time</span>
                      <strong>
                        {formatDate(session.scheduledAt)}
                      </strong>
                    </div>

                    <div>
                      <span>Duration</span>
                      <strong>
                        {session.durationMinutes} minutes
                      </strong>
                    </div>
                  </div>

                  {status === "scheduled" && (
                    <div className="session-actions">
                      <button
                        className="session-primary-button"
                        disabled={busyId === sessionId}
                        onClick={() => completeSession(sessionId)}
                      >
                        {busyId === sessionId
                          ? "Processing..."
                          : "Mark as Completed"}
                      </button>

                      <p className="session-hint">
                        Available after the scheduled session duration
                        has ended.
                      </p>
                    </div>
                  )}

                  {status === "cancelled" && (
                    <p className="session-hint">
                      This session was cancelled.
                    </p>
                  )}

                  {status === "completed" && (
                    <div className="session-review-area">
                      {reviewed ? (
                        <div className="session-reviewed">
                          <span>✓</span>
                          You have reviewed this session.
                        </div>
                      ) : (
                        <>
                          <h4>How was your session?</h4>
                          <p className="session-review-subtitle">
                            Share feedback with {otherUser?.name || "your partner"}.
                          </p>

                          <div
                            className="session-stars"
                            role="group"
                            aria-label="Choose a rating"
                          >
                            {[1, 2, 3, 4, 5].map((star) => (
                              <button
                                type="button"
                                key={star}
                                className={
                                  star <= (ratings[sessionId] || 0)
                                    ? "session-star selected"
                                    : "session-star"
                                }
                                onClick={() =>
                                  setRatings((previous) => ({
                                    ...previous,
                                    [sessionId]: star,
                                  }))
                                }
                                aria-label={`${star} star${star > 1 ? "s" : ""}`}
                                aria-pressed={
                                  star === ratings[sessionId]
                                }
                              >
                                ★
                              </button>
                            ))}
                          </div>

                          <label
                            className="session-comment-label"
                            htmlFor={`comment-${sessionId}`}
                          >
                            Your feedback (optional)
                          </label>

                          <textarea
                            id={`comment-${sessionId}`}
                            value={comments[sessionId] || ""}
                            onChange={(event) =>
                              setComments((previous) => ({
                                ...previous,
                                [sessionId]: event.target.value,
                              }))
                            }
                            placeholder="What did you learn? How was the experience?"
                            maxLength={500}
                            rows={3}
                          />

                          <div className="session-review-footer">
                            <span>
                              {(comments[sessionId] || "").length}/500
                            </span>

                            <button
                              className="session-primary-button"
                              disabled={busyId === sessionId}
                              onClick={() => submitReview(session)}
                            >
                              {busyId === sessionId
                                ? "Submitting..."
                                : "Submit Review"}
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
