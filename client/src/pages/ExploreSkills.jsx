
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";
import "./ExploreSkills.css";

function ExploreSkills() {
  const [users, setUsers] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [selectedSkills, setSelectedSkills] = useState({});
  const [messages, setMessages] = useState({});
  const [sendingId, setSendingId] = useState("");

  useEffect(() => {
    let active = true;

    async function loadData() {
      try {
        setLoading(true);
        setError("");

        const [usersResponse, requestsResponse] = await Promise.all([
          api.get("/users/discover"),
          api.get("/exchanges/mine"),
        ]);

        if (!active) return;

        setUsers(usersResponse.data.users || []);

        const data = requestsResponse.data;
        const requestList = Array.isArray(data)
          ? data
          : data.requests || data.exchanges || [];

        setRequests(requestList);
      } catch (err) {
        if (active) {
          setError(
            err.response?.data?.message ||
              "Could not load skills. Please try again."
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadData();

    return () => {
      active = false;
    };
  }, []);

  const categories = useMemo(() => {
    const skills = users.flatMap((user) => user.teaches || []);
    return ["All", ...new Set(skills.map((skill) => skill.trim()).filter(Boolean)
      .sort((a, b) => a.localeCompare(b)))];
  }, [users]);

  const filteredUsers = useMemo(() => {
    const term = search.trim().toLowerCase();

    return users.filter((user) => {
      const teaches = user.teaches || [];

      const matchesSearch =
        !term ||
        (user.name || "").toLowerCase().includes(term) ||
        (user.bio || "").toLowerCase().includes(term) ||
        teaches.some((skill) => skill.toLowerCase().includes(term));

      const matchesCategory =
        category === "All" ||
        teaches.some(
          (skill) => skill.toLowerCase() === category.toLowerCase()
        );

      return matchesSearch && matchesCategory;
    });
  }, [users, search, category]);

  function getRequestStatus(userId, requestedSkill) {
    const existing = requests.find((request) => {
      const receiverId =
        request.receiver?._id ||
        request.receiver?.id ||
        request.receiverId?._id ||
        request.receiverId;

      const sameReceiver = String(receiverId || "") === String(userId);
      const sameSkill =
        (request.requestedSkill || "").toLowerCase() ===
        requestedSkill.toLowerCase();

      return sameReceiver && sameSkill;
    });

    return existing?.status || "";
  }

  async function handleRequest(user, requestedSkill) {
    const offeredSkill = selectedSkills[user.id];

    if (!offeredSkill) {
      setMessages((previous) => ({
        ...previous,
        [user.id]: "Please select a skill you can teach in return.",
      }));
      return;
    }

    if (offeredSkill.toLowerCase() === requestedSkill.toLowerCase()) {
      setMessages((previous) => ({
        ...previous,
        [user.id]: "Choose a different skill to offer in exchange.",
      }));
      return;
    }

    try {
      setSendingId(user.id);
      setMessages((previous) => ({ ...previous, [user.id]: "" }));

      await api.post("/exchanges", {
        receiverId: user.id,
        offeredSkill,
        requestedSkill,
        message: messages[`draft-${user.id}`] || "",
      });

      const refreshed = await api.get("/exchanges/mine");
      const data = refreshed.data;
      const requestList = Array.isArray(data)
        ? data
        : data.requests || data.exchanges || [];

      setRequests(requestList);

      setMessages((previous) => ({
        ...previous,
        [user.id]: "Request sent successfully!",
      }));
    } catch (err) {
      setMessages((previous) => ({
        ...previous,
        [user.id]:
          err.response?.data?.message ||
          "Could not send the request. Please try again.",
      }));
    } finally {
      setSendingId("");
    }
  }

  if (loading) {
    return (
      <main className="explore-page">
        <p className="explore-status">Loading skills...</p>
      </main>
    );
  }

  return (
    <main className="explore-page">
      <header className="explore-header">
        <div>
          <p className="explore-eyebrow">YOUR NEXT SKILL STARTS HERE</p>
          <h1>Explore Skills</h1>
          <p>Discover people, exchange knowledge, and learn together.</p>
        </div>

        <Link to="/dashboard" className="explore-back">
          ← Back to Dashboard
        </Link>
      </header>

      <section className="explore-toolbar">
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search skills, people, or interests..."
          aria-label="Search skills and people"
        />

        <select
          value={category}
          onChange={(event) => setCategory(event.target.value)}
          aria-label="Filter by skill"
        >
          {categories.map((item) => (
            <option key={item} value={item}>
              {item === "All" ? "All skills" : item}
            </option>
          ))}
        </select>
      </section>

      {error && (
        <div className="explore-alert" role="alert">
          {error}
          <button onClick={() => window.location.reload()}>Retry</button>
        </div>
      )}

      {!error && filteredUsers.length === 0 && (
        <div className="explore-empty">
          <h2>No skills found</h2>
          <p>
            Try another search or ask community members to add skills they can
            teach.
          </p>
        </div>
      )}

      <section className="explore-grid">
        {filteredUsers.map((user) => {
          const teaches = user.teaches || [];
          const learns = user.learns || [];
          const requestedSkill = selectedSkills[`requested-${user.id}`] ||
            teaches[0] ||
            "";

          const status = requestedSkill
            ? getRequestStatus(user.id, requestedSkill)
            : "";

          return (
            <article className="explore-card" key={user.id}>
              <div className="explore-person">
                {user.profileImage ? (
                  <img
                    className="explore-avatar"
                    src={user.profileImage}
                    alt={`${user.name}'s profile`}
                  />
                ) : (
                  <div className="explore-avatar explore-initials">
                    {user.initials || user.name?.slice(0, 2).toUpperCase()}
                  </div>
                )}

                <div className="explore-person-info">
                  <h2>{user.name}</h2>
                  <span>
                    {user.score > 0
                      ? `${user.score} skill match${user.score === 1 ? "" : "es"}`
                      : "Community member"}
                  </span>
                </div>
              </div>

              <p className="explore-bio">
                {user.bio || "Ready to share knowledge and learn something new."}
              </p>

              <h3>Can teach</h3>
              <div className="explore-tags">
                {teaches.length ? (
                  teaches.map((skill) => (
                    <button
                      type="button"
                      className={`explore-tag ${
                        (user.matchingSkills || []).some(
                          (match) =>
                            match.toLowerCase() === skill.toLowerCase()
                        )
                          ? "is-match"
                          : ""
                      }`}
                      key={skill}
                      onClick={() =>
                        setSelectedSkills((previous) => ({
                          ...previous,
                          [`requested-${user.id}`]: skill,
                        }))
                      }
                      title="Select this skill to learn"
                    >
                      {skill}
                    </button>
                  ))
                ) : (
                  <span className="explore-muted">No teaching skills added</span>
                )}
              </div>

              {learns.length > 0 && (
                <>
                  <h3>Wants to learn</h3>
                  <div className="explore-tags">
                    {learns.slice(0, 4).map((skill) => (
                      <span className="explore-tag learn-tag" key={skill}>
                        {skill}
                      </span>
                    ))}
                  </div>
                </>
              )}

              {teaches.length > 0 && (
                <div className="explore-request">
                  <label htmlFor={`offer-${user.id}`}>
                    Skill you can teach in return
                  </label>

                  <select
                    id={`offer-${user.id}`}
                    value={selectedSkills[user.id] || ""}
                    onChange={(event) =>
                      setSelectedSkills((previous) => ({
                        ...previous,
                        [user.id]: event.target.value,
                      }))
                    }
                  >
                    <option value="">Choose your skill</option>
                    {user.learns?.length ? (
                      user.learns.map((skill) => (
                        <option value={skill} key={skill}>
                          {skill}
                        </option>
                      ))
                    ) : (
                      <option disabled value="">
                        This user has not listed learning interests
                      </option>
                    )}
                  </select>

                  <label htmlFor={`message-${user.id}`}>
                    Message (optional)
                  </label>
                  <textarea
                    id={`message-${user.id}`}
                    rows={2}
                    maxLength={500}
                    placeholder="Hi! I'd like to learn this skill..."
                    value={messages[`draft-${user.id}`] || ""}
                    onChange={(event) =>
                      setMessages((previous) => ({
                        ...previous,
                        [`draft-${user.id}`]: event.target.value,
                      }))
                    }
                  />

                  <button
                    type="button"
                    className="explore-request-button"
                    disabled={
                      sendingId === user.id ||
                      !requestedSkill ||
                      Boolean(status)
                    }
                    onClick={() => handleRequest(user, requestedSkill)}
                  >
                    {sendingId === user.id
                      ? "Sending..."
                      : status
                        ? `Request ${status}`
                        : "Request to Learn"}
                  </button>

                  {messages[user.id] && (
                    <p className="explore-feedback" role="status">
                      {messages[user.id]}
                    </p>
                  )}
                </div>
              )}
            </article>
          );
        })}
      </section>

      <footer className="explore-footer">
        Showing {filteredUsers.length} of {users.length} community members
      </footer>
    </main>
  );
}

export default ExploreSkills;
