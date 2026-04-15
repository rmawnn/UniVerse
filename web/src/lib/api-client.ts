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
    if (error.response) {
      const { status, data } = error.response;
      const message = data?.detail ?? data?.message ?? "Something went wrong";
      return Promise.reject({ status, message, data });
    }
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
