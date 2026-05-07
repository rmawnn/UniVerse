import axios from "axios";

const STORAGE_KEY = "universe_access_token";
const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

// ── Axios instance ──────────────────────────────────────────

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15_000,
  headers: { "Content-Type": "application/json" },
});

// ── Request interceptor: attach JWT ─────────────────────────

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem(STORAGE_KEY);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// ── Response interceptor: normalise errors ──────────────────

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Request was cancelled (e.g. component unmounted) — not a real error
    if (error.code === "ERR_CANCELED") {
      return Promise.reject({ status: 0, message: "Request cancelled", data: null });
    }

    if (error.response) {
      const { status, data } = error.response;
      const message = data?.detail ?? data?.message ?? "Something went wrong";

      // Debug: log API errors
      console.error(`[API ${status}] ${error.config?.method?.toUpperCase()} ${error.config?.url}: ${message}`);

      // Token expired or invalid — clear auth and redirect to login
      if (status === 401) {
        clearToken();
        if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
          window.location.href = "/login";
        }
      }

      return Promise.reject({ status, message, data });
    }

    // No response at all — genuine network failure
    console.error(`[API Network Error] ${error.config?.method?.toUpperCase()} ${error.config?.url}:`, error.message);
    return Promise.reject({
      status: 0,
      message: "Network error — check your connection",
      data: null,
    });
  }
);

// ── Token helpers ───────────────────────────────────────────

export function storeToken(token: string): void {
  localStorage.setItem(STORAGE_KEY, token);
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(STORAGE_KEY);
}

export function clearToken(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export default api;
