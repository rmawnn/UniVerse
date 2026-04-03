import { Platform } from "react-native";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "universe_access_token";

// ── Base URL ────────────────────────────────────────────────
// Android emulator:  10.0.2.2 maps to host machine's localhost
// iOS simulator:     localhost works directly
// Physical device:   replace with your machine's LAN IP
//                    (run `ipconfig` on Windows or `ifconfig` on Mac)
//
// Backend must be running on port 8000 (docker-compose or uvicorn).
// Docker-compose exposes backend on 0.0.0.0:8000, which is reachable
// from emulators via the addresses above.

const API_HOST = Platform.select({
  android: "10.0.2.2",  // Android emulator → host machine
  default: "localhost",  // iOS simulator / web
});

const BASE_URL = `http://${API_HOST}:8000/api/v1`;

// ── Axios instance ──────────────────────────────────────────

const api = axios.create({
  baseURL: BASE_URL,
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
