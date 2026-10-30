
import { useState } from "react";
import { Link } from "react-router-dom";
import Button from "../components/Button";
import api from "../services/api";
import "./Login.css";

function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();

    setError("");
    setMessage("");

    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      setError("Email address is required.");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setError("Please enter a valid email address.");
      return;
    }

    setIsLoading(true);

    try {
      const response = await api.post("/auth/forgot-password", {
        email: normalizedEmail,
      });

      setMessage(
        response.data.message ||
          "If an account exists with this email, you will receive a password reset link."
      );

      setEmail("");
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          "Unable to process your request. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="forgot-heading">
        <Link to="/" className="auth-brand" aria-label="SkillSwap home">
          <span className="auth-brand-icon" aria-hidden="true">
            ⇄
          </span>
          <span>SkillSwap</span>
        </Link>

        <div className="auth-heading">
          <h1 id="forgot-heading">Forgot Password?</h1>
          <p>
            Don't worry! Enter your registered email address
            and we'll help you reset your password.
          </p>
        </div>

        <form
          className="auth-form"
          onSubmit={handleSubmit}
          noValidate
        >
          <div className="auth-field">
            <label htmlFor="forgot-email">Email address</label>

            <input
              id="forgot-email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                setError("");
                setMessage("");
              }}
              aria-invalid={Boolean(error)}
              disabled={isLoading}
            />

            {error && (
              <p className="auth-error" role="alert">
                {error}
              </p>
            )}
          </div>

          {message && (
            <p className="auth-notice" role="status">
              {message}
            </p>
          )}

          <Button
            type="submit"
            variant="primary"
            className="auth-submit"
            disabled={isLoading}
          >
            {isLoading ? "Sending..." : "Send Reset Link"}
          </Button>
        </form>

        <p className="auth-switch">
          Remember your password?{" "}
          <Link to="/login" className="auth-inline-link">
            Back to Login
          </Link>
        </p>

        <Link to="/" className="auth-back-link">
          ← Back to home
        </Link>
      </section>
    </main>
  );
}

export default ForgotPassword;
