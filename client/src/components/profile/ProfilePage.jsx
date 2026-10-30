
import React, { useEffect, useState } from "react";
import api from "../../services/api";
import "./ProfilePage.css";

const getErrorMessage = (error) =>
  error.response?.data?.message ||
  error.response?.data?.errors?.[0]?.msg ||
  error.message ||
  "Something went wrong. Please try again.";

const ProfilePage = () => {
  const [user, setUser] = useState(null);
  const [form, setForm] = useState({
    name: "",
    bio: "",
    profileImage: "",
    skillsToTeach: [],
    skillsToLearn: [],
  });

  const [teachInput, setTeachInput] = useState("");
  const [learnInput, setLearnInput] = useState("");
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadProfile = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/auth/me");
      const currentUser = response.data?.user;

      if (!currentUser) {
        throw new Error("User profile was not returned by the server.");
      }

      setUser(currentUser);
      setForm({
        name: currentUser.name || "",
        bio: currentUser.bio || "",
        profileImage: currentUser.profileImage || "",
        skillsToTeach: currentUser.skillsToTeach || [],
        skillsToLearn: currentUser.skillsToLearn || [],
      });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const addSkill = (field, value, clearInput) => {
    const skill = value.trim();

    if (!skill) return;

    if (skill.length > 60) {
      setError("Each skill must be 60 characters or fewer.");
      return;
    }

    if (form[field].length >= 30) {
      setError("You can add up to 30 skills in each category.");
      return;
    }

    const alreadyExists = form[field].some(
      (item) => item.toLowerCase() === skill.toLowerCase()
    );

    if (alreadyExists) {
      setError("This skill has already been added.");
      return;
    }

    setError("");
    setForm((previous) => ({
      ...previous,
      [field]: [...previous[field], skill],
    }));

    clearInput("");
  };

  const removeSkill = (field, skillToRemove) => {
    setForm((previous) => ({
      ...previous,
      [field]: previous[field].filter(
        (skill) => skill !== skillToRemove
      ),
    }));
  };

  const handleSave = async (event) => {
    event.preventDefault();

    if (!form.name.trim() || form.name.trim().length < 2) {
      setError("Name must contain at least 2 characters.");
      return;
    }

    if (form.name.trim().length > 60) {
      setError("Name cannot exceed 60 characters.");
      return;
    }

    if (form.bio.length > 500) {
      setError("Bio cannot exceed 500 characters.");
      return;
    }

    const imageUrl = form.profileImage.trim();

    if (imageUrl) {
      try {
        const parsedUrl = new URL(imageUrl);

        if (!["http:", "https:"].includes(parsedUrl.protocol)) {
          throw new Error();
        }
      } catch {
        setError("Please enter a valid HTTP or HTTPS profile image URL.");
        return;
      }
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      // Update basic profile information
      await api.put("/users/me", {
        name: form.name.trim(),
        bio: form.bio.trim(),
        profileImage: imageUrl,
      });

      // Update skills
      await api.put("/users/me/skills", {
        skillsToTeach: form.skillsToTeach,
        skillsToLearn: form.skillsToLearn,
      });

      // Reload profile from the database
      await loadProfile();

      setEditing(false);
      setSuccess("Profile updated successfully!");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <main className="profile-page">
        <div className="profile-message">Loading your profile...</div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="profile-page">
        <div className="profile-message">
          <p>{error || "Unable to load your profile."}</p>
          <button type="button" onClick={loadProfile}>
            Try Again
          </button>
        </div>
      </main>
    );
  }

  const displayName = user.name || "Unnamed User";
  const initials = displayName
    .trim()
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <main className="profile-page">
      <section className="profile-container">
        <header className="profile-heading">
          <div>
            <h1>My Profile</h1>
            <p>Manage your SkillSwap profile and skills.</p>
          </div>

          {!editing && (
            <button
              type="button"
              className="profile-edit-button"
              onClick={() => {
                setError("");
                setSuccess("");
                setEditing(true);
              }}
            >
              Edit Profile
            </button>
          )}
        </header>

        {error && (
          <div className="profile-alert profile-alert-error" role="alert">
            {error}
          </div>
        )}

        {success && (
          <div
            className="profile-alert profile-alert-success"
            role="status"
          >
            {success}
          </div>
        )}

        <section className="profile-card">
          <div className="profile-avatar">
            {user.profileImage ? (
              <img
                src={user.profileImage}
                alt={`${displayName}'s profile`}
                onError={(event) => {
                  event.currentTarget.style.display = "none";
                }}
              />
            ) : (
              <span>{initials || "U"}</span>
            )}
          </div>

          <div className="profile-basic-info">
            <h2>{displayName}</h2>
            <p className="profile-email">{user.email}</p>
            <p className="profile-bio">
              {user.bio || "No bio added yet."}
            </p>
          </div>
        </section>

        {editing ? (
          <form className="profile-form" onSubmit={handleSave}>
            <h2>Edit Profile</h2>

            <div className="profile-field">
              <label htmlFor="profile-name">Full Name</label>
              <input
                id="profile-name"
                name="name"
                type="text"
                value={form.name}
                onChange={handleChange}
                minLength={2}
                maxLength={60}
                required
              />
            </div>

            <div className="profile-field">
              <label htmlFor="profile-email">Email</label>
              <input
                id="profile-email"
                type="email"
                value={user.email || ""}
                readOnly
                disabled
              />
              <small>Email editing is not enabled.</small>
            </div>

            <div className="profile-field">
              <label htmlFor="profile-bio">Bio</label>
              <textarea
                id="profile-bio"
                name="bio"
                value={form.bio}
                onChange={handleChange}
                maxLength={500}
                rows={4}
                placeholder="Tell others a little about yourself..."
              />
              <small>{form.bio.length}/500 characters</small>
            </div>

            <div className="profile-field">
              <label htmlFor="profile-image">Profile Image URL</label>
              <input
                id="profile-image"
                name="profileImage"
                type="url"
                value={form.profileImage}
                onChange={handleChange}
                placeholder="https://example.com/image.jpg"
              />
              <small>Enter a publicly accessible image URL.</small>
            </div>

            <div className="profile-field">
              <label htmlFor="teach-skill">Skills I Can Teach</label>
              <div className="profile-skill-input">
                <input
                  id="teach-skill"
                  type="text"
                  value={teachInput}
                  maxLength={60}
                  onChange={(event) => setTeachInput(event.target.value)}
                  placeholder="Enter a skill"
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      addSkill(
                        "skillsToTeach",
                        teachInput,
                        setTeachInput
                      );
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={() =>
                    addSkill("skillsToTeach", teachInput, setTeachInput)
                  }
                >
                  Add
                </button>
              </div>

              <div className="profile-skills-list">
                {form.skillsToTeach.map((skill) => (
                  <span className="profile-skill" key={skill}>
                    {skill}
                    <button
                      type="button"
                      aria-label={`Remove ${skill}`}
                      onClick={() => removeSkill("skillsToTeach", skill)}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>

            <div className="profile-field">
              <label htmlFor="learn-skill">Skills I Want to Learn</label>
              <div className="profile-skill-input">
                <input
                  id="learn-skill"
                  type="text"
                  value={learnInput}
                  maxLength={60}
                  onChange={(event) => setLearnInput(event.target.value)}
                  placeholder="Enter a skill"
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      addSkill(
                        "skillsToLearn",
                        learnInput,
                        setLearnInput
                      );
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={() =>
                    addSkill("skillsToLearn", learnInput, setLearnInput)
                  }
                >
                  Add
                </button>
              </div>

              <div className="profile-skills-list">
                {form.skillsToLearn.map((skill) => (
                  <span className="profile-skill" key={skill}>
                    {skill}
                    <button
                      type="button"
                      aria-label={`Remove ${skill}`}
                      onClick={() => removeSkill("skillsToLearn", skill)}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>

            <div className="profile-form-actions">
              <button
                type="button"
                className="profile-cancel-button"
                disabled={saving}
                onClick={() => {
                  setForm({
                    name: user.name || "",
                    bio: user.bio || "",
                    profileImage: user.profileImage || "",
                    skillsToTeach: user.skillsToTeach || [],
                    skillsToLearn: user.skillsToLearn || [],
                  });
                  setError("");
                  setEditing(false);
                }}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="profile-save-button"
                disabled={saving}
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        ) : (
          <>
            <section className="profile-card">
              <h2>Skills I Can Teach</h2>
              {user.skillsToTeach?.length ? (
                <div className="profile-skills-list">
                  {user.skillsToTeach.map((skill) => (
                    <span className="profile-skill" key={skill}>
                      {skill}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="profile-empty">
                  No teaching skills added yet.
                </p>
              )}
            </section>

            <section className="profile-card">
              <h2>Skills I Want to Learn</h2>
              {user.skillsToLearn?.length ? (
                <div className="profile-skills-list">
                  {user.skillsToLearn.map((skill) => (
                    <span className="profile-skill" key={skill}>
                      {skill}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="profile-empty">
                  No learning skills added yet.
                </p>
              )}
            </section>

            <section className="profile-card">
              <h2>Account Information</h2>
              <p>
                <strong>Member since: </strong>
                {user.createdAt
                  ? new Date(user.createdAt).toLocaleDateString()
                  : "Not available"}
              </p>
            </section>
          </>
        )}
      </section>
    </main>
  );
};

export default ProfilePage;
