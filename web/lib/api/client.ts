import axios from "axios";

/**
 * Centralized Axios instance for all backend calls.
 * - Reads JWT from localStorage
 * - Attaches Authorization header automatically
 * - Provides a response error interceptor
 */
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1",
  headers: { "Content-Type": "application/json" },
});

/* ── Request interceptor: attach JWT ─────────────────────── */
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("uv_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

/* ── Response interceptor: normalize errors ──────────────── */
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      const status = error.response.status;
      const detail =
        error.response.data?.detail ??
        error.response.data?.message ??
        "Something went wrong";

      // On 401, clear stored token (session expired / invalid)
      if (status === 401 && typeof window !== "undefined") {
        localStorage.removeItem("uv_token");
        // Redirect to login if not already there
        if (!window.location.pathname.startsWith("/login")) {
          window.location.href = "/login";
        }
      }

      return Promise.reject(new ApiError(detail, status));
    }
    return Promise.reject(
      new ApiError("Network error — please check your connection", 0),
    );
  },
);

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export default api;
