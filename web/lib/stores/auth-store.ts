import { create } from "zustand";
import type { MyProfileResponse } from "@/lib/api/auth";
import {
  getMe,
  loginApi,
  logoutApi,
  refreshTokenApi,
  type LoginRequest,
} from "@/lib/api/auth";

interface AuthState {
  token: string | null;
  refreshToken: string | null;
  user: MyProfileResponse | null;
  isHydrated: boolean;
  isLoading: boolean;

  /** Login — stores JWT pair, fetches user profile, persists tokens. */
  login: (creds: LoginRequest) => Promise<void>;

  /** Logout — invalidates refresh token on server, clears everything. */
  logout: () => void;

  /** Hydrate from localStorage on app mount. */
  hydrate: () => Promise<void>;

  /** Set user directly (e.g. after register + login). */
  setUser: (user: MyProfileResponse) => void;

  /** Attempt to refresh the access token using the stored refresh token. */
  attemptRefresh: () => Promise<boolean>;
}

const TOKEN_KEY = "uv_token";
const REFRESH_KEY = "uv_refresh";

export const useAuthStore = create<AuthState>((set, get) => ({
  token: null,
  refreshToken: null,
  user: null,
  isHydrated: false,
  isLoading: false,

  login: async (creds) => {
    set({ isLoading: true });
    try {
      const { access_token, refresh_token } = await loginApi(creds);
      localStorage.setItem(TOKEN_KEY, access_token);
      localStorage.setItem(REFRESH_KEY, refresh_token);
      set({ token: access_token, refreshToken: refresh_token });

      const user = await getMe();
      set({ user, isLoading: false });
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },

  logout: () => {
    const { refreshToken } = get();
    // Invalidate refresh token on server (fire-and-forget)
    if (refreshToken) {
      logoutApi(refreshToken).catch(() => {});
    }
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
    set({ token: null, refreshToken: null, user: null });
    window.location.href = "/login";
  },

  hydrate: async () => {
    const token = localStorage.getItem(TOKEN_KEY);
    const refreshToken = localStorage.getItem(REFRESH_KEY);
    if (!token) {
      set({ isHydrated: true });
      return;
    }
    set({ token, refreshToken, isLoading: true });
    try {
      const user = await getMe();
      set({ user, isHydrated: true, isLoading: false });
    } catch {
      // Token expired — try refresh
      if (refreshToken) {
        try {
          const { access_token, refresh_token: newRefresh } =
            await refreshTokenApi(refreshToken);
          localStorage.setItem(TOKEN_KEY, access_token);
          localStorage.setItem(REFRESH_KEY, newRefresh);
          set({ token: access_token, refreshToken: newRefresh });
          const user = await getMe();
          set({ user, isHydrated: true, isLoading: false });
          return;
        } catch {
          // Refresh also failed — clear everything
        }
      }
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(REFRESH_KEY);
      set({
        token: null,
        refreshToken: null,
        user: null,
        isHydrated: true,
        isLoading: false,
      });
    }
  },

  setUser: (user) => set({ user }),

  attemptRefresh: async () => {
    const { refreshToken } = get();
    if (!refreshToken) return false;
    try {
      const { access_token, refresh_token: newRefresh } =
        await refreshTokenApi(refreshToken);
      localStorage.setItem(TOKEN_KEY, access_token);
      localStorage.setItem(REFRESH_KEY, newRefresh);
      set({ token: access_token, refreshToken: newRefresh });
      return true;
    } catch {
      // Refresh failed — force logout
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(REFRESH_KEY);
      set({ token: null, refreshToken: null, user: null });
      return false;
    }
  },
}));
