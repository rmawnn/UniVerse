import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_BASE_URL } from "../utils/config";

const STORAGE_KEY = "universe_access_token";

// ── Axios instance ──────────────────────────────────────────

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15_000,
  headers: { "Content-Type": "application/json" },
});

// ── Request interceptor: attach JWT ─────────────────────────

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem(STORAGE_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── Response interceptor: normalise errors ──────────────────

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      // Server returned an error status
      const { status, data } = error.response;

      // 401 → token expired or invalid
      if (status === 401) {
        // Auth store will handle logout; just bubble up
      }

      const message =
        data?.detail ?? data?.message ?? "Something went wrong";

      return Promise.reject({ status, message, data });
    }

    // Network error (offline, timeout, etc.)
    return Promise.reject({
      status: 0,
      message: "Network error — check your connection",
      data: null,
    });
  }
);

// ── Token helpers (used by auth store) ──────────────────────

export async function storeToken(token: string): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, token);
}

export async function getToken(): Promise<string | null> {
  return AsyncStorage.getItem(STORAGE_KEY);
}

export async function clearToken(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEY);
}

export default api;
