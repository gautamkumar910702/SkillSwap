
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../services/api";
import "./Dashboard.css";

const navigation = [
  { label: "Dashboard", icon: "⌂", section: "Dashboard" },
  { label: "My Profile", icon: "♙", section: "My Profile" },
  { label: "My Skills", icon: "◇", section: "My Skills" },
  { label: "Learning Interests", icon: "♡", section: "Learning Interests" },
  { label: "Explore Skills", icon: "⌕", section: "Explore Skills" },
  { label: "Recommended Matches", icon: "♧", section: "Recommended Matches" },
  { label: "Exchange Requests", icon: "▣", section: "Exchange Requests" },
  { label: "My Sessions", icon: "▦", section: "My Sessions" },
  { label: "Reviews & Ratings", icon: "☆", section: "Reviews & Ratings" },
  { label: "Notifications", icon: "♧", section: "Notifications" },
];

const communityNavigation = [
  { label: "Leaderboard", icon: "♙", section: "Leaderboard" },
  { label: "Browse Users", icon: "♧", section: "Browse Users" },
];

function Dashboard() {
  const navigate = useNavigate();

  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem("skillswap_user");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [activeSection, setActiveSection] = useState("Dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [skillModalOpen, setSkillModalOpen] = useState(false);
  const [newSkill, setNewSkill] = useState("");
  const [skillType, setSkillType] = useState("teach");
  const [savingSkill, setSavingSkill] = useState(false);
  const [skillError, setSkillError] = useState("");
  const [skills, setSkills] = useState([]);
  const [learningSkills, setLearningSkills] = useState([
    "Graphic Design",
    "Video Editing",
    "Digital Marketing",
  ]);
  const [matches, setMatches] = useState([]);
  const [matchesLoading, setMatchesLoading] = useState(true);
  const [matchesError, setMatchesError] = useState("");
  const [sessions, setSessions] = useState([]);
  const [sessionLoading, setSessionLoading] = useState(false);
  const [sessionError, setSessionError] = useState("");
  const [reviews, setReviews] = useState([]);
  const [reviewError, setReviewError] = useState("");
  const [reviewRating, setReviewRating] = useState({});
  const [reviewComment, setReviewComment] = useState({});
  const [reviewSavingId, setReviewSavingId] = useState("");
  const [scheduleRequest, setScheduleRequest] = useState(null);
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("10:00");
  const [scheduleDuration, setScheduleDuration] = useState("60");
  const [meetingLink, setMeetingLink] = useState("");
  const [savingSession, setSavingSession] = useState(false);
  const [cancellingSessionId, setCancellingSessionId] = useState("");
  const [notifications, setNotifications] = useState([]);
  const [notificationError, setNotificationError] = useState("");
  const [requestedMatches, setRequestedMatches] = useState([]);
  const [exchangeRequests, setExchangeRequests] = useState({ sent: [], received: [] });
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [requestError, setRequestError] = useState("");
  const [requestModalMatch, setRequestModalMatch] = useState(null);
  const [offeredSkill, setOfferedSkill] = useState("");
  const [requestedSkill, setRequestedSkill] = useState("");
  const [requestMessage, setRequestMessage] = useState("");
  const [requestSaving, setRequestSaving] = useState(false);
  const [updatingRequestId, setUpdatingRequestId] = useState("");
  const [deletingRequestId, setDeletingRequestId] = useState("");
  const [loading, setLoading] = useState(true);
  const [profileError, setProfileError] = useState("");
  const [actionMessage, setActionMessage] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("skillswap_token");

    if (!token) {
      navigate("/login", { replace: true });
      return;
    }

    let cancelled = false;

    async function loadProfile() {
      try {
        const response = await api.get("/auth/me");
        const profile = response.data.user;

        if (cancelled) return;

        setUser(profile);
        setSkills(
          Array.isArray(profile.skillsToTeach)
            ? profile.skillsToTeach
            : []
        );
        setLearningSkills(
          Array.isArray(profile.skillsToLearn)
            ? profile.skillsToLearn
            : []
        );

        localStorage.setItem("skillswap_user", JSON.stringify(profile));

        // Load real community members from the protected discovery API.
        try {
          const matchesResponse = await api.get("/users/discover");
          const discoveredUsers = Array.isArray(matchesResponse.data.users)
            ? matchesResponse.data.users
            : [];

          if (!cancelled) {
            const avatarColors = ["#f7dfed", "#dce9ff", "#e8e1ff", "#d9f4e8"];
            setMatches(
              discoveredUsers.map((person, index) => ({
                ...person,
                id: person.id,
                rating: null,
                reviews: 0,
                color: avatarColors[index % avatarColors.length],
                teaches: Array.isArray(person.teaches) ? person.teaches : [],
                learns: Array.isArray(person.learns) ? person.learns : [],
                matchingSkills: Array.isArray(person.matchingSkills)
                  ? person.matchingSkills
                  : [],
              }))
            );
            setMatchesError("");
          }
        } catch (matchError) {
          if (!cancelled) {
            setMatchesError(
              matchError.message || "Community members could not be loaded."
            );
          }
        } finally {
          if (!cancelled) setMatchesLoading(false);
        }

        // Load real sent and received exchange requests.
        try {
          if (!cancelled) setRequestsLoading(true);
          const requestsResponse = await api.get("/exchanges/mine");
          if (!cancelled) {
            setExchangeRequests({
              sent: Array.isArray(requestsResponse.data.sent) ? requestsResponse.data.sent : [],
              received: Array.isArray(requestsResponse.data.received) ? requestsResponse.data.received : [],
            });
            setRequestError("");
          }
        } catch (requestLoadError) {
          if (!cancelled) {
            setRequestError(
              requestLoadError.response?.data?.message ||
              "Exchange requests could not be loaded."
            );
          }
        } finally {
          if (!cancelled) setRequestsLoading(false);
        }
      } catch (error) {
        if (cancelled) return;

        if (error.response?.status === 401) {
          localStorage.removeItem("skillswap_token");
          localStorage.removeItem("skillswap_user");
          navigate("/login", { replace: true });
          return;
        }

        setProfileError(
          error.message || "Your profile could not be refreshed."
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadProfile();

    return () => {
      cancelled = true;
    };
  }, [navigate]);

  // Load real notifications from the backend and refresh every 10 seconds.
  useEffect(() => {
    let cancelled = false;

    async function loadNotifications() {
      try {
        const response = await api.get("/notifications");
        if (cancelled) return;

        const savedNotifications = response.data.notifications || [];
        setNotifications(
          savedNotifications.map((item) => ({
            id: item._id,
            icon: getNotificationIcon(item.type),
            text: item.message,
            title: item.title,
            time: new Date(item.createdAt).toLocaleString(),
            unread: !item.isRead,
            type: item.type,
          }))
        );
        setNotificationError("");
      } catch (error) {
        if (!cancelled) {
          setNotificationError(
            error.response?.data?.message || "Notifications could not be loaded."
          );
          console.error(
            "Load notifications error:",
            error.response?.data || error.message
          );
        }
      }
    }

    loadNotifications();
    const intervalId = setInterval(loadNotifications, 10000);

    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function loadSessions() {
      setSessionLoading(true);
      try {
        const response = await api.get("/sessions/mine");
        if (!cancelled) {
          setSessions(Array.isArray(response.data.sessions) ? response.data.sessions : []);
          setSessionError("");
        }
      } catch (error) {
        if (!cancelled) setSessionError(error.response?.data?.message || "Sessions could not be loaded.");
      } finally {
        if (!cancelled) setSessionLoading(false);
      }
    }
    if (localStorage.getItem("skillswap_token")) loadSessions();
    return () => { cancelled = true; };
  }, []);

  // Load reviews already submitted by the current user.
  useEffect(() => {
    let cancelled = false;

    async function loadReviews() {
      try {
        const response = await api.get("/reviews/given");
        if (!cancelled) {
          setReviews(Array.isArray(response.data.reviews) ? response.data.reviews : []);
          setReviewError("");
        }
      } catch (error) {
        if (!cancelled) {
          setReviewError(
            error.response?.data?.message ||
              "Reviews could not be loaded. Check that the reviews API is enabled."
          );
        }
      }
    }

    if (localStorage.getItem("skillswap_token")) loadReviews();
    return () => { cancelled = true; };
  }, []);

  const visibleMatches = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) return matches;

    return matches.filter((match) =>
      [
        match.name,
        ...match.teaches,
        ...match.learns,
      ].some((value) => value.toLowerCase().includes(term))
    );
  }, [matches, search]);

  const unreadCount = notifications.filter((item) => item.unread).length;

  // Show a rating derived from real review data instead of a hardcoded 4.8.
  const averageRating =
    reviews.length > 0
      ? (
          reviews.reduce((total, review) => total + (Number(review.rating) || 0), 0) /
          reviews.length
        ).toFixed(1)
      : "0.0";

  // Accepted exchange requests are shown as sessions. Scheduling is added separately.
  const acceptedSessions = [
    ...exchangeRequests.sent.map((request) => ({
      ...request,
      partner: request.receiver,
      mySkill: request.offeredSkill,
      partnerSkill: request.requestedSkill,
      direction: "sent",
    })),
    ...exchangeRequests.received.map((request) => ({
      ...request,
      partner: request.sender,
      mySkill: request.requestedSkill,
      partnerSkill: request.offeredSkill,
      direction: "received",
    })),
  ].filter((request) => request.status === "accepted");


  function selectSection(section) {
    setActiveSection(section);
    setSidebarOpen(false);
    setActionMessage("");
  }

  function handleLogout() {
    localStorage.removeItem("skillswap_token");
    localStorage.removeItem("skillswap_user");
    navigate("/login", { replace: true });
  }

  async function handleAddSkill(event) {
    event.preventDefault();

    const value = newSkill.trim();

    if (!value) {
      setSkillError("Please enter a skill name.");
      return;
    }

    const currentSkills = skillType === "teach" ? skills : learningSkills;

    if (currentSkills.some((skill) => skill.toLowerCase() === value.toLowerCase())) {
      setSkillError("This skill is already in your list.");
      return;
    }

    if (currentSkills.length >= 30) {
      setSkillError("You can add a maximum of 30 skills in this list.");
      return;
    }

    const updatedSkills = [...currentSkills, value];

    setSavingSkill(true);
    setSkillError("");
    setActionMessage("");

    try {
      const payload =
        skillType === "teach"
          ? { skillsToTeach: updatedSkills }
          : { skillsToLearn: updatedSkills };

      const response = await api.put("/users/me/skills", payload);
      const updatedUser = response.data.user;

      const savedTeachingSkills = Array.isArray(updatedUser.skillsToTeach)
        ? updatedUser.skillsToTeach
        : [];
      const savedLearningSkills = Array.isArray(updatedUser.skillsToLearn)
        ? updatedUser.skillsToLearn
        : [];

      setSkills(savedTeachingSkills);
      setLearningSkills(savedLearningSkills);
      setUser((previous) => ({ ...previous, ...updatedUser }));

      const savedUser = {
        ...(user || {}),
        ...updatedUser,
        skillsToTeach: savedTeachingSkills,
        skillsToLearn: savedLearningSkills,
      };
      localStorage.setItem("skillswap_user", JSON.stringify(savedUser));

      setNewSkill("");
      setSkillModalOpen(false);
      setActionMessage(
        skillType === "teach"
          ? "Teaching skill saved successfully!"
          : "Learning interest saved successfully!"
      );
    } catch (error) {
      setSkillError(error.message || "Could not save your skill. Please try again.");
    } finally {
      setSavingSkill(false);
    }
  }

  function handleSendRequest(match) {
    if (!skills.length) {
      setActionMessage("Add at least one teaching skill before sending a request.");
      selectSection("My Skills");
      return;
    }
    if (!Array.isArray(match.teaches) || !match.teaches.length) {
      setActionMessage(`${match.name} has not added any teaching skills yet.`);
      return;
    }

    setRequestError("");
    setOfferedSkill(skills[0]);
    setRequestedSkill(match.teaches[0]);
    setRequestMessage("");
    setRequestModalMatch(match);
  }

  async function submitExchangeRequest(event) {
    event.preventDefault();
    if (!requestModalMatch) return;

    setRequestSaving(true);
    setRequestError("");
    setActionMessage("");

    try {
      const response = await api.post("/exchanges", {
        receiverId: requestModalMatch.id,
        offeredSkill,
        requestedSkill,
        message: requestMessage.trim(),
      });

      const createdRequest = response.data.request;
      setExchangeRequests((previous) => ({
        ...previous,
        sent: [createdRequest, ...previous.sent],
      }));
      setRequestedMatches((previous) =>
        previous.includes(requestModalMatch.id)
          ? previous
          : [...previous, requestModalMatch.id]
      );
      setActionMessage(response.data.message || `Request sent to ${requestModalMatch.name}.`);
      setRequestModalMatch(null);
    } catch (error) {
      setRequestError(
        error.response?.data?.message ||
        error.message ||
        "Could not send the exchange request."
      );
    } finally {
      setRequestSaving(false);
    }
  }

  async function handleRequestDecision(request, status) {
    if (!request?._id || !["accepted", "rejected"].includes(status)) return;

    setUpdatingRequestId(request._id);
    setRequestError("");
    setActionMessage("");

    try {
      const response = await api.patch(`/exchanges/${request._id}/status`, { status });
      const updatedRequest =
        response.data?.request ||
        response.data?.exchangeRequest ||
        response.data?.data?.request ||
        null;

      // Update immediately when the API returns the updated request.
      if (updatedRequest?._id) {
        setExchangeRequests((previous) => ({
          ...previous,
          received: previous.received.map((item) =>
            item._id === updatedRequest._id ? { ...item, ...updatedRequest } : item
          ),
        }));
      }

      // Re-fetch from the server so the UI stays correct even if the API
      // response only returns a success message instead of the request object.
      const refreshed = await api.get("/exchanges/mine");
      setExchangeRequests({
        sent: Array.isArray(refreshed.data?.sent) ? refreshed.data.sent : [],
        received: Array.isArray(refreshed.data?.received) ? refreshed.data.received : [],
      });

      const actionWord = status === "rejected" ? "rejected" : "accepted";
      setActionMessage(
        response.data?.message || `Exchange request ${actionWord} successfully.`
      );
    } catch (error) {
      setRequestError(
        error.response?.data?.message ||
        error.message ||
        `Could not ${status === "rejected" ? "reject" : "accept"} this exchange request. Please try again.`
      );
    } finally {
      setUpdatingRequestId("");
    }
  }

  async function handleDeleteExchangeRequest(request) {
    if (!request?._id) return;

    const confirmed = window.confirm(
      "Are you sure you want to delete this exchange request? This action cannot be undone."
    );

    if (!confirmed) return;

    setDeletingRequestId(request._id);
    setRequestError("");
    setActionMessage("");

    try {
      await api.delete(`/exchanges/${request._id}`);

      setExchangeRequests((previous) => ({
        sent: previous.sent.filter((item) => item._id !== request._id),
        received: previous.received.filter((item) => item._id !== request._id),
      }));

      setActionMessage("Exchange request deleted successfully.");
    } catch (error) {
      setRequestError(
        error.response?.data?.message ||
          "Could not delete the exchange request. Please try again."
      );
    } finally {
      setDeletingRequestId("");
    }
  }

  function openScheduleSession(request) {
    setScheduleRequest(request);
    setScheduleDate("");
    setScheduleTime("10:00");
    setScheduleDuration("60");
    setMeetingLink("");
    setSessionError("");
  }

  async function submitScheduleSession(event) {
    event.preventDefault();
    if (!scheduleRequest?._id || !scheduleDate || !scheduleTime) return;
    const scheduledAt = new Date(`${scheduleDate}T${scheduleTime}`).toISOString();
    if (new Date(scheduledAt) <= new Date()) {
      setSessionError("Please choose a future date and time.");
      return;
    }
    setSavingSession(true);
    setSessionError("");
    try {
      const response = await api.post("/sessions", {
        exchangeRequestId: scheduleRequest._id,
        scheduledAt,
        durationMinutes: Number(scheduleDuration),
        meetingLink: meetingLink.trim(),
      });
      const created = response.data.session;
      setSessions((previous) => [...previous.filter((item) => item._id !== created._id), created].sort((a,b) => new Date(a.scheduledAt)-new Date(b.scheduledAt)));
      setScheduleRequest(null);
      setActionMessage("Session scheduled successfully!");
      const refreshed = await api.get("/sessions/mine");
      setSessions(Array.isArray(refreshed.data.sessions) ? refreshed.data.sessions : []);
    } catch (error) {
      setSessionError(error.response?.data?.message || "Could not schedule the session.");
    } finally {
      setSavingSession(false);
    }
  }

  async function handleCancelSession(session) {
    if (!window.confirm("Are you sure you want to cancel this session?")) return;
    setCancellingSessionId(session._id);
    setSessionError("");
    try {
      const response = await api.patch(`/sessions/${session._id}/cancel`);
      setSessions((previous) => previous.map((item) => item._id === session._id ? { ...item, ...(response.data.session || {}), status: "cancelled" } : item));
      setActionMessage("Session cancelled.");
    } catch (error) {
      setSessionError(error.response?.data?.message || "Could not cancel this session.");
    } finally {
      setCancellingSessionId("");
    }
  }

  async function handleCompleteSession(session) {
    if (!session?._id) return;

    setCancellingSessionId(session._id);
    setSessionError("");
    setActionMessage("");

    try {
      const response = await api.patch(`/sessions/${session._id}/complete`);
      setSessions((previous) =>
        previous.map((item) =>
          item._id === session._id
            ? { ...item, ...(response.data.session || {}), status: "completed" }
            : item
        )
      );
      setActionMessage(response.data.message || "Session completed successfully.");
      const refreshed = await api.get("/sessions/mine");
      setSessions(Array.isArray(refreshed.data.sessions) ? refreshed.data.sessions : []);
    } catch (error) {
      setSessionError(
        error.response?.data?.message || "Could not complete this session."
      );
    } finally {
      setCancellingSessionId("");
    }
  }

  function sessionHasReview(sessionId) {
    return reviews.some((review) => {
      const reviewedSessionId =
        review.session?._id || review.session?.id || review.session;
      return String(reviewedSessionId) === String(sessionId);
    });
  }

  async function handleSubmitReview(session) {
    const rating = Number(reviewRating[session._id] || 0);
    const comment = (reviewComment[session._id] || "").trim();

    if (rating < 1 || rating > 5) {
      setReviewError("Please select a rating from 1 to 5 stars.");
      return;
    }

    setReviewSavingId(session._id);
    setReviewError("");
    setActionMessage("");

    try {
      const response = await api.post("/reviews", {
        sessionId: session._id,
        rating,
        comment,
      });

      if (response.data.review) {
        setReviews((previous) => [response.data.review, ...previous]);
      } else {
        const refreshed = await api.get("/reviews/given");
        setReviews(Array.isArray(refreshed.data.reviews) ? refreshed.data.reviews : []);
      }

      setReviewRating((previous) => ({ ...previous, [session._id]: 0 }));
      setReviewComment((previous) => ({ ...previous, [session._id]: "" }));
      setActionMessage(response.data.message || "Review submitted successfully.");
    } catch (error) {
      setReviewError(
        error.response?.data?.message ||
          "Could not submit your review. Check that the reviews API is configured."
      );
    } finally {
      setReviewSavingId("");
    }
  }

  async function markNotificationsRead() {
    try {
      await api.patch("/notifications/read-all");
      setNotifications((previous) =>
        previous.map((item) => ({ ...item, unread: false }))
      );
      setActionMessage("All notifications marked as read.");
    } catch (error) {
      setActionMessage(
        error.response?.data?.message ||
          "Could not mark notifications as read."
      );
    }
  }

  function renderSectionContent() {
    if (activeSection === "My Profile") {
      return (
        <section className="workspace-card section-detail">
          <div className="section-heading">
            <div>
              <span className="eyebrow">YOUR ACCOUNT</span>
              <h2>My Profile</h2>
            </div>
          </div>
          <div className="profile-summary">
            <div className="profile-avatar large">
              {(user?.name || "S").charAt(0).toUpperCase()}
            </div>
            <div>
              <h3>{user?.name || "SkillSwap learner"}</h3>
              <p>{user?.email || "Email unavailable"}</p>
              <p>{user?.bio || "Add a bio to tell others about yourself."}</p>
            </div>
          </div>
          <button
            className="primary-button"
            onClick={() => setActionMessage("Profile editing will be added with the profile update API.")}
          >
            Edit Profile
          </button>
        </section>
      );
    }

    if (activeSection === "My Skills" || activeSection === "Learning Interests") {
      const list = activeSection === "My Skills" ? skills : learningSkills;

      return (
        <section className="workspace-card section-detail">
          <div className="section-heading">
            <div>
              <span className="eyebrow">YOUR LEARNING JOURNEY</span>
              <h2>{activeSection}</h2>
            </div>
            <button className="primary-button" onClick={() => setSkillModalOpen(true)}>
              + Add a Skill
            </button>
          </div>
          <div className="skill-chip-list">
            {list.length ? (
              list.map((skill) => (
                <span className="skill-chip" key={skill}>{skill}</span>
              ))
            ) : (
              <p>No skills added yet. Use Add a Skill to get started.</p>
            )}
          </div>
        </section>
      );
    }

    if (activeSection === "Notifications") {
      return (
        <section className="workspace-card section-detail">
          <div className="section-heading">
            <div>
              <span className="eyebrow">STAY IN THE LOOP</span>
              <h2>Notifications</h2>
            </div>
            <button className="text-button" onClick={markNotificationsRead}>
              Mark all read
            </button>
          </div>
          {notificationError && (
            <p className="inline-alert" role="alert">
              {notificationError}
            </p>
          )}
          <NotificationList notifications={notifications} />
        </section>
      );
    }

    if (activeSection === "My Sessions") {
      return (
        <section className="workspace-card section-detail">
          <div className="section-heading"><div><span className="eyebrow">LEARN TOGETHER</span><h2>My Sessions</h2><p>Schedule sessions for accepted exchanges and manage upcoming meetings.</p></div></div>
          {sessionError && <div className="inline-alert" role="alert">{sessionError}</div>}
          <h3>Accepted exchanges</h3>
          {!acceptedSessions.length ? <p className="muted-text">No accepted exchanges yet. Accept a request first to schedule a session.</p> : (
            <div className="session-list">
              {acceptedSessions.map((item) => {
                const existing = sessions.find((session) => String(session.exchangeRequest?._id || session.exchangeRequest) === String(item._id));
                return <article className="session-item" key={item._id}>
                  <div className="session-avatar avatar-0">{(item.partner?.name || "U").split(" ").map((part) => part[0]).join("").slice(0,2)}</div>
                  <div className="session-info"><h3>{item.mySkill} ↔ {item.partnerSkill}</h3><p>Partner: <strong>{item.partner?.name || "SkillSwap member"}</strong></p>
                    {existing ? <p>Session: {new Date(existing.scheduledAt).toLocaleString()} · {existing.durationMinutes} minutes ({existing.status})</p> : <p>Not scheduled yet</p>}
                    {!existing && <button className="primary-button" onClick={() => openScheduleSession(item)}>Schedule Session</button>}
                  </div>
                </article>;
              })}
            </div>
          )}
          <h3 style={{marginTop:"28px"}}>Scheduled sessions</h3>
          {sessionLoading ? <p className="muted-text">Loading sessions...</p> : !sessions.length ? <p className="muted-text">No sessions scheduled yet.</p> : (
            <div className="session-list">{sessions.map((session,index) => {
              const partner = String(session.host?._id || session.host) === String(user?._id || user?.id) ? session.participant : session.host;
              return <article className="session-item" key={session._id}>
                <div className={`session-avatar avatar-${index%3}`}>{(partner?.name || "U").split(" ").map((part)=>part[0]).join("").slice(0,2)}</div>
                <div className="session-info"><div className="session-title-row"><h3>{session.title}</h3><span className={`status-pill status-${session.status}`}>{session.status}</span></div>
                  <p>With <strong>{partner?.name || "SkillSwap member"}</strong></p><p>📅 {new Date(session.scheduledAt).toLocaleString()}</p><p>Duration: {session.durationMinutes} minutes</p>
                  {session.status === "scheduled" && (
                    <div className="match-actions">
                      <button
                        type="button"
                        className="primary-button"
                        onClick={() => navigate(`/call/${session._id}`)}
                      >
                        Join Call
                      </button>
                      <button
                        type="button"
                        className="secondary-button"
                        disabled={cancellingSessionId === session._id}
                        onClick={() => handleCancelSession(session)}
                      >
                        {cancellingSessionId === session._id ? "Cancelling..." : "Cancel Session"}
                      </button>
                      <button
                        type="button"
                        className="primary-button"
                        disabled={cancellingSessionId === session._id}
                        onClick={() => handleCompleteSession(session)}
                      >
                        {cancellingSessionId === session._id ? "Updating..." : "Complete Session"}
                      </button>
                    </div>
                  )}
                  {session.status === "completed" && (
                    <div className="session-review-panel">
                      {sessionHasReview(session._id) ? (
                        <p className="muted-text">✓ You have reviewed this session.</p>
                      ) : (
                        <>
                          <h4>Review your session</h4>
                          <p className="muted-text">Rate your learning experience from 1 to 5 stars.</p>
                          <div className="review-stars" role="group" aria-label="Session rating">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <button
                                type="button"
                                key={star}
                                aria-label={`${star} star${star > 1 ? "s" : ""}`}
                                className={star <= Number(reviewRating[session._id] || 0) ? "review-star selected" : "review-star"}
                                onClick={() => setReviewRating((previous) => ({ ...previous, [session._id]: star }))}
                              >★</button>
                            ))}
                          </div>
                          <label htmlFor={`review-${session._id}`}>Feedback (optional)</label>
                          <textarea
                            id={`review-${session._id}`}
                            rows={3}
                            maxLength={500}
                            value={reviewComment[session._id] || ""}
                            onChange={(event) => setReviewComment((previous) => ({ ...previous, [session._id]: event.target.value }))}
                            placeholder="Share what went well..."
                          />
                          <button
                            type="button"
                            className="primary-button"
                            disabled={reviewSavingId === session._id}
                            onClick={() => handleSubmitReview(session)}
                          >
                            {reviewSavingId === session._id ? "Submitting..." : "Submit Review"}
                          </button>
                        </>
                      )}
                    </div>
                  )}
                  {session.meetingLink && <p><a href={session.meetingLink} target="_blank" rel="noreferrer">Open external meeting link ↗</a></p>}
                </div>
              </article>;
            })}</div>
          )}
        </section>
      );
    }

    if (activeSection === "Recommended Matches" || activeSection === "Browse Users") {
      return (
        <section className="workspace-card section-detail">
          <div className="section-heading">
            <div>
              <span className="eyebrow">GROW YOUR COMMUNITY</span>
              <h2>{activeSection}</h2>
            </div>
          </div>
          <MatchList
            matches={visibleMatches}
            requestedMatches={requestedMatches}
            onSendRequest={handleSendRequest}
            onViewProfile={(match) =>
              setActionMessage(`Viewing ${match.name}'s preview. Full public profiles will be added next.`)
            }
            loading={matchesLoading}
            error={matchesError}
          />
        </section>
      );
    }

    if (activeSection === "Exchange Requests") {
      return (
        <section className="workspace-card section-detail">
          <div className="section-heading">
            <div>
              <span className="eyebrow">SKILL EXCHANGE</span>
              <h2>Exchange Requests</h2>
              <p>Manage requests you have sent and received.</p>
            </div>
            <button className="text-button" onClick={async () => {
              setRequestsLoading(true);
              setRequestError("");
              try {
                const response = await api.get("/exchanges/mine");
                setExchangeRequests({
                  sent: Array.isArray(response.data.sent) ? response.data.sent : [],
                  received: Array.isArray(response.data.received) ? response.data.received : [],
                });
              } catch (error) {
                setRequestError(error.response?.data?.message || "Could not refresh requests.");
              } finally {
                setRequestsLoading(false);
              }
            }}>Refresh</button>
          </div>

          {requestError && <div className="inline-alert" role="alert">{requestError}</div>}
          {requestsLoading ? (
            <div className="empty-state"><span>↻</span><p>Loading exchange requests...</p></div>
          ) : (
            <>
              <h3>Received Requests ({exchangeRequests.received.length})</h3>
              {!exchangeRequests.received.length ? (
                <p className="muted-text">You have no received requests yet.</p>
              ) : (
                <div className="session-list">
                  {exchangeRequests.received.map((request) => (
                    <article className="session-item" key={request._id}>
                      <div className="session-avatar avatar-0">
                        {(request.sender?.name || "U").split(" ").map((part) => part[0]).join("").slice(0, 2)}
                      </div>
                      <div className="session-info">
                        <div className="session-title-row">
                          <h3>{request.sender?.name || "SkillSwap member"}</h3>
                          <span className={`status-pill status-${request.status}`}>{request.status}</span>
                        </div>
                        <p>Offers: <strong>{request.offeredSkill}</strong></p>
                        <p>Wants to learn: <strong>{request.requestedSkill}</strong></p>
                        {request.message && <p>{request.message}</p>}
                        {request.status === "pending" && (
                          <div className="match-actions">
                            <button className="primary-button" disabled={updatingRequestId === request._id} onClick={() => handleRequestDecision(request, "accepted")}>
                              {updatingRequestId === request._id ? "Updating..." : "Accept"}
                            </button>
                            <button className="secondary-button" disabled={updatingRequestId === request._id} onClick={() => handleRequestDecision(request, "rejected")}>
                              {updatingRequestId === request._id ? "Updating..." : "Reject"}
                            </button>
                          </div>
                        )}
                        <div className="match-actions">
                          {request.status === "accepted" && (
                            <button
                              type="button"
                              className="primary-button"
                              onClick={() => navigate(`/chat/${request._id}`)}
                            >
                              Open Chat
                            </button>
                          )}

                          <button
                            type="button"
                            className="secondary-button"
                            disabled={deletingRequestId === request._id || updatingRequestId === request._id}
                            onClick={() => handleDeleteExchangeRequest(request)}
                          >
                            {deletingRequestId === request._id ? "Deleting..." : "Delete"}
                          </button>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}

              <h3 style={{ marginTop: "28px" }}>Sent Requests ({exchangeRequests.sent.length})</h3>
              {!exchangeRequests.sent.length ? (
                <p className="muted-text">You have not sent any requests yet.</p>
              ) : (
                <div className="session-list">
                  {exchangeRequests.sent.map((request) => (
                    <article className="session-item" key={request._id}>
                      <div className="session-avatar avatar-1">
                        {(request.receiver?.name || "U").split(" ").map((part) => part[0]).join("").slice(0, 2)}
                      </div>
                      <div className="session-info">
                        <div className="session-title-row">
                          <h3>{request.receiver?.name || "SkillSwap member"}</h3>
                          <span className={`status-pill status-${request.status}`}>{request.status}</span>
                        </div>
                        <p>You offer: <strong>{request.offeredSkill}</strong></p>
                        <p>You want to learn: <strong>{request.requestedSkill}</strong></p>
                        {request.message && <p>{request.message}</p>}
                        <div className="match-actions">
                          {request.status === "accepted" && (
                            <button
                              type="button"
                              className="primary-button"
                              onClick={() => navigate(`/chat/${request._id}`)}
                            >
                              Open Chat
                            </button>
                          )}

                          <button
                            type="button"
                            className="secondary-button"
                            disabled={deletingRequestId === request._id}
                            onClick={() => handleDeleteExchangeRequest(request)}
                          >
                            {deletingRequestId === request._id ? "Deleting..." : "Delete"}
                          </button>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </>
          )}
        </section>
      );
    }

    if (activeSection === "Reviews & Ratings") {
      return (
        <section className="workspace-card section-detail">
          <div className="section-heading">
            <div>
              <span className="eyebrow">COMMUNITY FEEDBACK</span>
              <h2>Reviews & Ratings</h2>
              <p>Review completed sessions and see the feedback you have submitted.</p>
            </div>
          </div>
          {reviewError && <div className="inline-alert" role="alert">{reviewError}</div>}
          {!reviews.length ? (
            <p className="muted-text">No reviews submitted yet. Complete a session to leave your first review.</p>
          ) : (
            <div className="session-list">
              {reviews.map((review, index) => {
                const partner = review.reviewee || review.receiver || review.toUser || review.reviewedUser;
                const sessionId = review.session?._id || review.session?.id || review.session;
                const rating = Math.max(0, Math.min(5, Number(review.rating) || 0));
                return (
                  <article className="session-item" key={review._id || `${sessionId}-${index}`}>
                    <div className={`session-avatar avatar-${index % 3}`}>★</div>
                    <div className="session-info">
                      <h3>{partner?.name || "SkillSwap member"}</h3>
                      <p className="review-display-stars">{"★".repeat(rating)}{"☆".repeat(5 - rating)}</p>
                      {review.comment && <p>{review.comment}</p>}
                      {review.createdAt && <p className="muted-text">{new Date(review.createdAt).toLocaleDateString()}</p>}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      );
    }

    const descriptions = {
      "Explore Skills": "Search for skills and discover what other learners can teach.",
      "Exchange Requests": "Your sent and received skill exchange requests will appear here.",
      "Reviews & Ratings": "Your feedback and learner ratings will appear here.",
      Leaderboard: "See how the SkillSwap community grows through sharing knowledge.",
    };

    return (
      <section className="workspace-card section-detail">
        <div className="section-heading">
          <div>
            <span className="eyebrow">SKILLSWAP COMMUNITY</span>
            <h2>{activeSection}</h2>
          </div>
        </div>
        <p className="muted-text">
          {descriptions[activeSection] || "Discover more ways to learn and teach."}
        </p>
        <button className="primary-button" onClick={() => selectSection("Dashboard")}>
          Back to Dashboard
        </button>
      </section>
    );
  }

  if (loading) {
    return (
      <main className="dashboard-loading">
        <div className="loading-mark">⇄</div>
        <p>Loading your SkillSwap dashboard...</p>
      </main>
    );
  }

  return (
    <div className="dashboard-app">
      <header className="topbar">
        <button
          className="mobile-menu-button"
          aria-label="Open navigation menu"
          aria-expanded={sidebarOpen}
          onClick={() => setSidebarOpen((previous) => !previous)}
        >
          ☰
        </button>

        <Link to="/dashboard" className="brand-lockup">
          <span className="brand-symbol">↔</span>
          <span className="brand-copy">
            <strong>Skill<span>Swap</span></strong>
            <small>Learn by Teaching</small>
          </span>
        </Link>

        <label className="global-search">
          <span aria-hidden="true">⌕</span>
          <input
            type="search"
            placeholder="Search for skills, users, or categories..."
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              if (activeSection !== "Dashboard") {
                setActiveSection("Dashboard");
              }
            }}
            aria-label="Search skills and users"
          />
          {search && (
            <button type="button" onClick={() => setSearch("")} aria-label="Clear search">
              ×
            </button>
          )}
        </label>

        <div className="topbar-actions">
          <button
            className="notification-button"
            aria-label={`${unreadCount} unread notifications`}
            onClick={() => selectSection("Notifications")}
          >
            ♧
            {unreadCount > 0 && <span className="notification-count">{unreadCount}</span>}
          </button>

          <div className="profile-menu-wrap">
            <button
              className="profile-menu-trigger"
              onClick={() => setProfileOpen((previous) => !previous)}
              aria-expanded={profileOpen}
            >
              <span className="profile-avatar">
                {(user?.name || "S").charAt(0).toUpperCase()}
              </span>
              <span className="profile-menu-copy">
                <strong>{user?.name || "SkillSwap Learner"}</strong>
                <small>Member</small>
              </span>
              <span className="chevron">⌄</span>
            </button>

            {profileOpen && (
              <div className="profile-dropdown">
                <button onClick={() => {
                  navigate("/my-profile");
                  setProfileOpen(false);
                  setSidebarOpen(false);
                }}>
                  My Profile
                </button>
                <button onClick={handleLogout}>Log out</button>
              </div>
            )}
          </div>
        </div>
      </header>

      {sidebarOpen && (
        <button
          className="sidebar-overlay"
          aria-label="Close navigation menu"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className="dashboard-layout">
        <aside className={`sidebar ${sidebarOpen ? "sidebar-open" : ""}`}>
          <nav className="sidebar-nav" aria-label="Main navigation">
            {navigation.map((item) => (
              <button
                key={item.section}
                className={`nav-item ${activeSection === item.section ? "active" : ""}`}
                onClick={() => {
                  if (item.section === "Explore Skills") {
                    navigate("/explore-skills");
                    setSidebarOpen(false);
                  } else if (item.section === "My Profile") {
                    navigate("/my-profile");
                    setSidebarOpen(false);
                  } else {
                    selectSection(item.section);
                  }
                }}
              >
                <span className="nav-icon">{item.icon}</span>
                <span className="nav-label">{item.label}</span>
                {item.section === "Exchange Requests" && (
                  <span className="nav-badge">{exchangeRequests.received.filter((request) => request.status === "pending").length}</span>
                )}
                {item.section === "Notifications" && unreadCount > 0 && (
                  <span className="nav-badge">{unreadCount}</span>
                )}
              </button>
            ))}

            <div className="sidebar-divider">
              <span>COMMUNITY</span>
            </div>

            {communityNavigation.map((item) => (
              <button
                key={item.section}
                className={`nav-item ${activeSection === item.section ? "active" : ""}`}
                onClick={() => selectSection(item.section)}
              >
                <span className="nav-icon">{item.icon}</span>
                <span className="nav-label">{item.label}</span>
              </button>
            ))}

            <button
              className="sidebar-add-button"
              onClick={() => {
                setSkillError("");
                setSkillModalOpen(true);
                setSidebarOpen(false);
              }}
            >
              <span>＋</span> Add a Skill
            </button>
          </nav>

          <div className="sidebar-footer">
            <span className="sidebar-footer-icon">✦</span>
            <p><strong>Share what you know.</strong><br />Learn what you love.</p>
          </div>
        </aside>

        <main className="dashboard-main">
          {profileError && (
            <div className="inline-alert" role="status">
              Could not refresh your profile: {profileError}
            </div>
          )}

          {actionMessage && (
            <div className="inline-alert success-alert" role="status">
              <span>{actionMessage}</span>
              <button onClick={() => setActionMessage("")} aria-label="Dismiss message">×</button>
            </div>
          )}

          {activeSection !== "Dashboard" ? (
            renderSectionContent()
          ) : (
            <>
              <section className="welcome-row">
                <div className="welcome-copy">
                  <span className="eyebrow">YOUR LEARNING SPACE</span>
                  <h1>Welcome back, {user?.name?.split(" ")[0] || "Learner"}! <span>👋</span></h1>
                  <p>Continue your learning journey and make new connections today.</p>
                </div>

                <div className="progress-card">
                  <div className="progress-icon">⭐</div>
                  <div className="progress-copy">
                    <strong>Your Progress</strong>
                    <p>Keep sharing skills to earn your <b>Knowledge Sharer</b> badge.</p>
                  </div>
                  <div className="progress-ring"><span>60%</span></div>
                </div>
              </section>

              <section className="stats-grid" aria-label="Your statistics">
                <StatCard icon="🎓" value={skills.length} label="Skills Offering" tone="purple" />
                <StatCard icon="📖" value={learningSkills.length} label="Skills Learning" tone="green" />
                <StatCard icon="👥" value={matches.length} label="Community Users" tone="blue" />
                <StatCard icon="🗓️" value={acceptedSessions.length} label="Accepted Exchanges" tone="orange" />
                <StatCard icon="⭐" value={averageRating} label="Average Rating" tone="yellow" />
                <StatCard icon="🏅" value={120} label="Reputation Points" tone="pink" />
              </section>

              <div className="dashboard-columns">
                <div className="dashboard-primary-column">
                  <section className="partner-banner">
                    <div className="partner-banner-copy">
                      <span className="eyebrow">LEARN SOMETHING NEW</span>
                      <h2>Find Your Next <span>Learning Partner</span></h2>
                      <p>Discover people who can teach the skills you want to learn.</p>
                      <button className="primary-button" onClick={() => selectSection("Recommended Matches")}>
                        View Matches <span>→</span>
                      </button>
                    </div>
                    <div className="partner-art" aria-hidden="true">
                      <span className="floating-skill floating-skill-one">💻 Teach JavaScript</span>
                      <span className="partner-illustration">👩🏻‍💻</span>
                      <span className="floating-skill floating-skill-two">🎨 Learn Design</span>
                    </div>
                  </section>

                  <section className="workspace-card">
                    <div className="section-heading">
                      <div>
                        <h2>Recommended Matches</h2>
                        <p>People to exchange skills with</p>
                      </div>
                      <button className="text-button" onClick={() => selectSection("Recommended Matches")}>
                        View All →
                      </button>
                    </div>

                    <MatchList
                      matches={visibleMatches}
                      requestedMatches={requestedMatches}
                      onSendRequest={handleSendRequest}
                      onViewProfile={(match) =>
                        setActionMessage(`Profile preview selected for ${match.name}.`)
                      }
                      loading={matchesLoading}
                      error={matchesError}
                    />
                  </section>

                  <div className="bottom-grid">
                    <section className="workspace-card skills-overview">
                      <div className="section-heading">
                        <h2>Your Skills</h2>
                        <button className="text-button" onClick={() => selectSection("My Skills")}>Manage</button>
                      </div>
                      <h3>Teaching Skills</h3>
                      <div className="skill-chip-list">
                        {skills.slice(0, 5).map((skill) => (
                          <span className="skill-chip" key={skill}>{skill}</span>
                        ))}
                        {skills.length > 5 && <span className="skill-chip muted-chip">+{skills.length - 5} more</span>}
                        {!skills.length && <span className="muted-text">No skills added yet</span>}
                      </div>
                      <h3>Learning Interests</h3>
                      <div className="skill-chip-list">
                        {learningSkills.slice(0, 5).map((skill) => (
                          <span className="skill-chip learn-chip" key={skill}>{skill}</span>
                        ))}
                        {learningSkills.length > 5 && <span className="skill-chip muted-chip">+{learningSkills.length - 5} more</span>}
                        {!learningSkills.length && <span className="muted-text">No interests added yet</span>}
                      </div>
                      <button className="secondary-button full-width-button" onClick={() => setSkillModalOpen(true)}>
                        + Add a Skill
                      </button>
                    </section>

                    <section className="workspace-card activity-card">
                      <div className="section-heading">
                        <h2>Your Activity</h2>
                        <span className="activity-period">This Month</span>
                      </div>
                      <ActivityRow icon="◉" label="Profile views" value="24" change="+12%" />
                      <ActivityRow icon="👥" label="New matches" value="15" change="+25%" />
                      <ActivityRow icon="⇄" label="Exchange requests" value={requestedMatches.length + 5} change="+20%" />
                      <ActivityRow icon="▦" label="Completed sessions" value="3" change="+50%" />
                    </section>
                  </div>
                </div>

                <div className="dashboard-secondary-column">
                  <section className="workspace-card sessions-card">
                    <div className="section-heading"><h2>Upcoming Sessions</h2><button className="text-button" onClick={() => selectSection("My Sessions")}>View All</button></div>
                    {sessions.filter((item)=>item.status==="scheduled").slice(0,3).length ? <div className="session-list">
                      {sessions.filter((item)=>item.status==="scheduled").slice(0,3).map((session,index)=>(
                        <article className="session-item" key={session._id}><div className={`session-avatar avatar-${index%3}`}>▦</div><div className="session-info"><h3>{session.title}</h3><p>{new Date(session.scheduledAt).toLocaleString()}</p><p>{session.durationMinutes} minutes</p><button type="button" className="primary-button" onClick={() => navigate(`/call/${session._id}`)}>Join Call</button></div></article>
                      ))}
                    </div> : <div className="empty-state"><p>No scheduled sessions yet.</p><button className="secondary-button" onClick={()=>selectSection("My Sessions")}>Schedule a Session</button></div>}
                  </section>

                    <section className="workspace-card notifications-card">
                    <div className="section-heading">
                      <h2>Recent Notifications</h2>
                      <button className="text-button" onClick={() => selectSection("Notifications")}>View All</button>
                    </div>
                    <NotificationList notifications={notifications.slice(0, 5)} />
                    {unreadCount > 0 && (
                      <button className="mark-read-button" onClick={markNotificationsRead}>
                        Mark all as read
                      </button>
                    )}
                  </section>
                </div>
              </div>
            </>
          )}

          <footer className="dashboard-footer">
            <span>© {new Date().getFullYear()} SkillSwap</span>
            <span>Learn by Teaching 💜</span>
          </footer>
        </main>
      </div>

      {requestModalMatch && (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget && !requestSaving) setRequestModalMatch(null);
        }}>
          <section className="skill-modal" role="dialog" aria-modal="true" aria-labelledby="exchange-request-heading">
            <button className="modal-close" onClick={() => setRequestModalMatch(null)} aria-label="Close dialog" disabled={requestSaving}>×</button>
            <span className="eyebrow">START LEARNING TOGETHER</span>
            <h2 id="exchange-request-heading">Request an Exchange</h2>
            <p>Send a skill exchange request to {requestModalMatch.name}.</p>
            <form onSubmit={submitExchangeRequest}>
              <label htmlFor="offered-skill">Skill you will teach</label>
              <select id="offered-skill" value={offeredSkill} onChange={(event) => setOfferedSkill(event.target.value)} required>
                {skills.map((skill) => <option key={skill} value={skill}>{skill}</option>)}
              </select>

              <label htmlFor="requested-skill">Skill you want to learn</label>
              <select id="requested-skill" value={requestedSkill} onChange={(event) => setRequestedSkill(event.target.value)} required>
                {(requestModalMatch.teaches || []).map((skill) => <option key={skill} value={skill}>{skill}</option>)}
              </select>

              <label htmlFor="exchange-message">Message (optional)</label>
              <textarea id="exchange-message" value={requestMessage} onChange={(event) => setRequestMessage(event.target.value)} maxLength={500} rows={3} placeholder="Introduce yourself and suggest an exchange..." />

              {requestError && <p className="form-error" role="alert">{requestError}</p>}
              <div className="modal-actions">
                <button type="button" className="secondary-button" onClick={() => setRequestModalMatch(null)} disabled={requestSaving}>Cancel</button>
                <button type="submit" className="primary-button" disabled={requestSaving || !offeredSkill || !requestedSkill}>
                  {requestSaving ? "Sending..." : "Send Request"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {scheduleRequest && (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event)=>{if(event.target===event.currentTarget&&!savingSession)setScheduleRequest(null);}}>
          <section className="skill-modal" role="dialog" aria-modal="true" aria-labelledby="schedule-session-heading">
            <button className="modal-close" onClick={()=>setScheduleRequest(null)} aria-label="Close dialog" disabled={savingSession}>×</button>
            <span className="eyebrow">PLAN YOUR LEARNING</span><h2 id="schedule-session-heading">Schedule a Session</h2>
            <p>{scheduleRequest.mySkill} ↔ {scheduleRequest.partnerSkill} with {scheduleRequest.partner?.name || "your exchange partner"}</p>
            <form onSubmit={submitScheduleSession}>
              <label htmlFor="session-date">Date</label><input id="session-date" type="date" min={new Date().toLocaleDateString("en-CA")} value={scheduleDate} onChange={(event)=>setScheduleDate(event.target.value)} required />
              <label htmlFor="session-time">Start time</label><input id="session-time" type="time" value={scheduleTime} onChange={(event)=>setScheduleTime(event.target.value)} required />
              <label htmlFor="session-duration">Duration</label><select id="session-duration" value={scheduleDuration} onChange={(event)=>setScheduleDuration(event.target.value)}><option value="30">30 minutes</option><option value="45">45 minutes</option><option value="60">60 minutes</option><option value="90">90 minutes</option><option value="120">120 minutes</option></select>
              <label htmlFor="meeting-link">Meeting link (optional)</label><input id="meeting-link" type="url" value={meetingLink} onChange={(event)=>setMeetingLink(event.target.value)} placeholder="https://meet.google.com/..." />
              {sessionError && <p className="form-error" role="alert">{sessionError}</p>}
              <div className="modal-actions"><button type="button" className="secondary-button" onClick={()=>setScheduleRequest(null)} disabled={savingSession}>Cancel</button><button type="submit" className="primary-button" disabled={savingSession}>{savingSession?"Scheduling...":"Schedule Session"}</button></div>
            </form>
          </section>
        </div>
      )}

      {skillModalOpen && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setSkillModalOpen(false);
          }}
        >
          <section
            className="skill-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-skill-heading"
          >
            <button
              className="modal-close"
              onClick={() => setSkillModalOpen(false)}
              aria-label="Close dialog"
            >
              ×
            </button>
            <span className="eyebrow">GROW YOUR SKILLS</span>
            <h2 id="add-skill-heading">Add a Skill</h2>
            <p>Add a skill you can teach or one you want to learn.</p>

            <form onSubmit={handleAddSkill}>
              <label htmlFor="skill-type">I want to...</label>
              <select
                id="skill-type"
                value={skillType}
                onChange={(event) => {
                  setSkillType(event.target.value);
                  setSkillError("");
                }}
              >
                <option value="teach">Teach this skill</option>
                <option value="learn">Learn this skill</option>
              </select>

              <label htmlFor="new-skill">Skill name</label>
              <input
                id="new-skill"
                value={newSkill}
                onChange={(event) => {
                  setNewSkill(event.target.value);
                  if (skillError) setSkillError("");
                }}
                placeholder="e.g. React, Photography, English"
                maxLength={60}
                required
                autoFocus
              />

              {skillError && (
                <p className="form-error" role="alert">
                  {skillError}
                </p>
              )}

              <div className="modal-actions">
                <button type="button" className="secondary-button" onClick={() => setSkillModalOpen(false)}>
                  Cancel
                </button>
                <button
                  type="submit"
                  className="primary-button"
                  disabled={savingSkill}
                >
                  {savingSkill ? "Saving..." : "Add Skill"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon, value, label, tone }) {
  return (
    <article className="stat-card">
      <div className={`stat-icon ${tone}`}>{icon}</div>
      <div className="stat-copy">
        <strong>{value}</strong>
        <span>{label}</span>
      </div>
    </article>
  );
}

function MatchList({
  matches,
  requestedMatches,
  onSendRequest,
  onViewProfile,
  loading = false,
  error = "",
}) {
  if (loading) {
    return (
      <div className="empty-state">
        <span>↻</span>
        <p>Finding SkillSwap community members...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="empty-state">
        <span>!</span>
        <p>{error}</p>
      </div>
    );
  }

  if (!matches.length) {
    return (
      <div className="empty-state">
        <span>⌕</span>
        <p>No other members found yet. Invite a friend to join SkillSwap!</p>
      </div>
    );
  }

  return (
    <div className="matches-grid">
      {matches.map((match) => (
        <article className="match-card" key={match.id}>
          <div className="match-person">
            <div className="match-avatar" style={{ background: match.color }}>
              {match.initials}
            </div>
            <div className="match-person-info">
              <h3>{match.name}</h3>
              {typeof match.rating === "number" || typeof match.rating === "string" ? (
                <p>
                  <span className="rating-star">★</span> {match.rating}
                  <span className="review-count"> ({match.reviews || 0} reviews)</span>
                </p>
              ) : (
                <p className="review-count">SkillSwap community member</p>
              )}
            </div>
          </div>

          {match.matchingSkills?.length > 0 && (
            <div className="match-skills">
              <h4>Matches your interests</h4>
              <div className="skill-chip-list">
                {match.matchingSkills.map((skill) => (
                  <span className="skill-chip" key={skill}>{skill}</span>
                ))}
              </div>
            </div>
          )}

          <div className="match-skills">
            <h4>Teaches</h4>
            <div className="skill-chip-list">
              {match.teaches.map((skill) => (
                <span className="skill-chip" key={skill}>{skill}</span>
              ))}
            </div>
          </div>

          <div className="match-skills">
            <h4>Wants to Learn</h4>
            <div className="skill-chip-list">
              {match.learns.map((skill) => (
                <span className="skill-chip learn-chip" key={skill}>{skill}</span>
              ))}
            </div>
          </div>

          <div className="match-actions">
            <button className="secondary-button" onClick={() => onViewProfile(match)}>
              View Profile
            </button>
            <button
              className="primary-button"
              onClick={() => onSendRequest(match)}
              disabled={requestedMatches.includes(match.id)}
            >
              {requestedMatches.includes(match.id) ? "Requested ✓" : "Send Request"}
            </button>
          </div>
        </article>
      ))}
    </div>
  );
}

function SessionList({ sessions, onAction }) {
  return (
    <div className="session-list">
      {sessions.map((session, index) => (
        <article className="session-item" key={session.id}>
          <div className={`session-avatar avatar-${index % 3}`}>
            {session.partner.split(" ").map((part) => part[0]).join("").slice(0, 2)}
          </div>
          <div className="session-info">
            <div className="session-title-row">
              <h3>{session.title}</h3>
              <span className={`status-pill status-${session.status.toLowerCase()}`}>
                {session.status}
              </span>
            </div>
            <p>★ with {session.partner}</p>
            <p>▦ {session.date}</p>
            <p>◷ {session.time}</p>
            <button
              className={session.status === "Confirmed" ? "primary-button session-action" : "secondary-button session-action"}
              onClick={() => onAction(session)}
            >
              {session.status === "Confirmed" ? "Join Session" : "View Details"}
            </button>
          </div>
        </article>
      ))}
    </div>
  );
}

function getNotificationIcon(type) {
  const icons = {
    exchange_received: "🤝",
    exchange_accepted: "✅",
    exchange_rejected: "❌",
    exchange_cancelled: "↩️",
    session_scheduled: "📅",
    session_updated: "🗓️",
    session_cancelled: "❌",
    session_reminder: "⏰",
    session_completed: "🎓",
    review_received: "⭐",
    rating_updated: "🌟",
    skill_match: "🎯",
    skill_updated: "📚",
    achievement_earned: "🏆",
    reputation_updated: "🌟",
    system: "🔔",
  };

  return icons[type] || "🔔";
}

function NotificationList({ notifications }) {
  if (!notifications.length) {
    return <p className="muted-text">You're all caught up!</p>;
  }

  return (
    <div className="notification-list">
      {notifications.map((item) => (
        <article className={`notification-item ${item.unread ? "unread" : ""}`} key={item.id}>
          <div className="notification-icon">{item.icon}</div>
          <div className="notification-copy">
            {item.title && <strong>{item.title}</strong>}
            <p>{item.text}</p>
            <span>{item.time}</span>
          </div>
          {item.unread && <span className="unread-dot" aria-label="Unread" />}
        </article>
      ))}
    </div>
  );
}

function ActivityRow({ icon, label, value, change }) {
  return (
    <div className="activity-row">
      <span className="activity-icon">{icon}</span>
      <span className="activity-label">{label}</span>
      <strong>{value}</strong>
      <span className="activity-change">{change}</span>
    </div>
  );
}

export default Dashboard;
