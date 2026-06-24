import axios from "axios";

/**
 * Centralized Axios instance for all backend calls.
 * - Reads JWT from localStorage
 * - Attaches Authorization header automatically
 * - Attempts token refresh on 401 before forcing logout
 */
export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 60_000,
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

/* ── Response interceptor: handle errors + token refresh ─── */

let isRefreshing = false;
let refreshSubscribers: Array<{
  resolve: (token: string) => void;
  reject: (err: Error) => void;
}> = [];

function onTokenRefreshed(newToken: string) {
  refreshSubscribers.forEach((sub) => sub.resolve(newToken));
  refreshSubscribers = [];
}

function onRefreshFailed(err: Error) {
  refreshSubscribers.forEach((sub) => sub.reject(err));
  refreshSubscribers = [];
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response) {
      const status = error.response.status;
      const rawDetail =
        error.response.data?.detail ??
        error.response.data?.message ??
        "Something went wrong";
      const detail = formatApiError(rawDetail);

      if (
        status === 401 &&
        typeof window !== "undefined" &&
        !originalRequest._retry &&
        !originalRequest.url?.includes("/auth/refresh") &&
        !originalRequest.url?.includes("/auth/login")
      ) {
        originalRequest._retry = true;

        if (!isRefreshing) {
          isRefreshing = true;

          const refreshToken = localStorage.getItem("uv_refresh");
          if (refreshToken) {
            try {
              const res = await axios.post(
                `${api.defaults.baseURL}/auth/refresh`,
                { refresh_token: refreshToken },
              );
              const { access_token, refresh_token: newRefresh } = res.data;
              localStorage.setItem("uv_token", access_token);
              localStorage.setItem("uv_refresh", newRefresh);

              isRefreshing = false;
              onTokenRefreshed(access_token);

              originalRequest.headers.Authorization = `Bearer ${access_token}`;
              return api(originalRequest);
            } catch {
              isRefreshing = false;
              const sessionErr = new ApiError("Session expired", 401);
              onRefreshFailed(sessionErr);
              localStorage.removeItem("uv_token");
              localStorage.removeItem("uv_refresh");
              if (!window.location.pathname.startsWith("/login")) {
                window.location.href = "/login";
              }
              return Promise.reject(sessionErr);
            }
          } else {
            isRefreshing = false;
          }
        }

        return new Promise((resolve, reject) => {
          refreshSubscribers.push({
            resolve: (newToken: string) => {
              originalRequest.headers.Authorization = `Bearer ${newToken}`;
              resolve(api(originalRequest));
            },
            reject,
          });
        });
      }

      if (status === 401 && typeof window !== "undefined") {
        localStorage.removeItem("uv_token");
        localStorage.removeItem("uv_refresh");
        if (!window.location.pathname.startsWith("/login")) {
          window.location.href = "/login";
        }
      }

      return Promise.reject(new ApiError(detail, status));
    }

    const isTimeout = error.code === "ECONNABORTED";
    const message = isTimeout
      ? "Request timed out — the server may be starting up, please try again"
      : "Network error — please check your connection";
    return Promise.reject(new ApiError(message, 0));
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

export function formatApiError(detail: unknown): string {
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    const msgs = detail
      .map((item) => {
        if (typeof item === "string") return item;
        if (item && typeof item === "object" && typeof item.msg === "string") {
          return item.msg;
        }
        return null;
      })
      .filter(Boolean) as string[];
    if (msgs.length > 0) return msgs.join(". ");
  }
  if (detail && typeof detail === "object") {
    const obj = detail as Record<string, unknown>;
    if (typeof obj.message === "string") return obj.message;
    if (typeof obj.msg === "string") return obj.msg;
  }
  return "Something went wrong";
}

export default api;
