import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 15000,
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("skillswap_token");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error),
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Preserve response/status so authentication checks can detect HTTP 401.
    if (error.response) {
      error.message =
        error.response.data?.message ||
        "Something went wrong. Please try again.";
    } else if (error.code === "ECONNABORTED") {
      error.message = "Request timed out. Please try again.";
    } else {
      error.message =
        "Cannot connect to the server. Please check your connection.";
    }

    return Promise.reject(error);
  },
);

export default api;
