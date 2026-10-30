
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Button from "../components/Button";
import api from "../services/api";
import "./Login.css";

function ResetPassword() {
  const { token } = useParams();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    password: "",
    confirmPassword: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  function handleChange(event) {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));

    setErrors((previous) => ({
      ...previous,
      [name]: "",
    }));

    setMessage("");
  }

  function validateForm() {
    const newErrors = {};

    if (!formData.password) {
      newErrors.password = "New password is required.";
    } else if (
      formData.password.length < 8 ||
      formData.password.length > 128
    ) {
      newErrors.password =
        "Password must contain 8 to 128 characters.";
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = "Please confirm your password.";
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match.";
    }

    return newErrors;
  }

  async function handleSubmit(event) {
    event.preventDefault();

    setErrors({});
    setMessage("");

    const validationErrors = validateForm();
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    if (!token) {
      setMessage("Invalid password reset link.");
      return;
    }

    setIsLoading(true);

    try {
      const response = await api.post(
        `/auth/reset-password/${token}`,
        {
          password: formData.password,
        }
      );

      setMessage(
        response.data.message ||
          "Password reset successful."
      );

      setFormData({
        password: "",
        confirmPassword: "",
      });

      setTimeout(() => {
        navigate("/login", { replace: true });
      }, 2000);
    } catch (error) {
      setMessage(
        error.response?.data?.message ||
          error.message ||
          "Unable to reset password. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="reset-heading">
        <Link to="/" className="auth-brand" aria-label="SkillSwap home">
          <span className="auth-brand-icon" aria-hidden="true">
            ⇄
          </span>
          <span>SkillSwap</span>
        </Link>

        <div className="auth-heading">
          <h1 id="reset-heading">Reset Password</h1>
          <p>
            Create a new password for your SkillSwap account.
          </p>
        </div>

        <form
          className="auth-form"
          onSubmit={handleSubmit}
          noValidate
        >
          <div className="auth-field">
            <label htmlFor="reset-password">
              New Password
            </label>

            <div className="auth-password-wrapper">
              <input
                id="reset-password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                placeholder="Enter new password"
                value={formData.password}
                onChange={handleChange}
                aria-invalid={Boolean(errors.password)}
                disabled={isLoading}
              />

              <button
                type="button"
                className="auth-password-toggle"
                onClick={() =>
                  setShowPassword((previous) => !previous)
                }
                aria-label={
                  showPassword ? "Hide password" : "Show password"
                }
                disabled={isLoading}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>

            {errors.password && (
              <p className="auth-error">
                {errors.password}
              </p>
            )}
          </div>

          <div className="auth-field">
            <label htmlFor="reset-confirm-password">
              Confirm New Password
            </label>

            <div className="auth-password-wrapper">
              <input
                id="reset-confirm-password"
                name="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                autoComplete="new-password"
                placeholder="Confirm new password"
                value={formData.confirmPassword}
                onChange={handleChange}
                aria-invalid={Boolean(errors.confirmPassword)}
                disabled={isLoading}
              />

              <button
                type="button"
                className="auth-password-toggle"
                onClick={() =>
                  setShowConfirmPassword((previous) => !previous)
                }
                aria-label={
                  showConfirmPassword
                    ? "Hide password"
                    : "Show password"
                }
                disabled={isLoading}
              >
                {showConfirmPassword ? "Hide" : "Show"}
              </button>
            </div>

            {errors.confirmPassword && (
              <p className="auth-error">
                {errors.confirmPassword}
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
            {isLoading ? "Updating Password..." : "Reset Password"}
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

export default ResetPassword;
