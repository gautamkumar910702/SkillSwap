
import { useCallback, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import api from "../services/api";

function ProtectedRoute({ children }) {
  const [status, setStatus] = useState("checking");

  const verifySession = useCallback(async () => {
    const token = localStorage.getItem("skillswap_token");

    if (!token) {
      setStatus("unauthenticated");
      return;
    }

    setStatus("checking");

    try {
      await api.get("/auth/me");
      setStatus("authenticated");
    } catch (error) {
      if (error.response?.status === 401) {
        localStorage.removeItem("skillswap_token");
        localStorage.removeItem("skillswap_user");
        setStatus("unauthenticated");
      } else {
        setStatus("error");
      }
    }
  }, []);

  useEffect(() => {
    verifySession();
  }, [verifySession]);

  if (status === "checking") {
    return (
      <main className="dashboard-loading">
        <div className="loading-mark">⇄</div>
        <p>Verifying your session...</p>
      </main>
    );
  }

  if (status === "unauthenticated") {
    return <Navigate to="/login" replace />;
  }

  if (status === "error") {
    return (
      <main className="dashboard-loading">
        <h2>Unable to verify your session</h2>
        <p>Please check your internet connection and try again.</p>
        <button
          type="button"
          className="primary-button"
          onClick={verifySession}
        >
          Try Again
        </button>
      </main>
    );
  }

  return children;
}

export default ProtectedRoute;
