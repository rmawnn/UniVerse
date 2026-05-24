import { create } from "zustand";
import type { MyProfileResponse } from "@/lib/api/auth";
import { getMe, loginApi, type LoginRequest } from "@/lib/api/auth";

interface AuthState {
  token: string | null;
  user: MyProfileResponse | null;
  isHydrated: boolean;
  isLoading: boolean;

  /** Login — stores JWT, fetches user profile, persists token. */
  login: (creds: LoginRequest) => Promise<void>;

  /** Logout — clears everything and redirects to /login. */
  logout: () => void;

  /** Hydrate from localStorage on app mount. */
  hydrate: () => Promise<void>;

  /** Set user directly (e.g. after register + login). */
  setUser: (user: MyProfileResponse) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: null,
  user: null,
  isHydrated: false,
  isLoading: false,

  login: async (creds) => {
    set({ isLoading: true });
    try {
      const { access_token } = await loginApi(creds);
      localStorage.setItem("uv_token", access_token);
      set({ token: access_token });

      const user = await getMe();
      set({ user, isLoading: false });
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },

  logout: () => {
    localStorage.removeItem("uv_token");
    set({ token: null, user: null });
    window.location.href = "/login";
  },

  hydrate: async () => {
    const token = localStorage.getItem("uv_token");
    if (!token) {
      set({ isHydrated: true });
      return;
    }
    set({ token, isLoading: true });
    try {
      const user = await getMe();
      set({ user, isHydrated: true, isLoading: false });
    } catch {
      // Token expired / invalid — clear it
      localStorage.removeItem("uv_token");
      set({ token: null, user: null, isHydrated: true, isLoading: false });
    }
  },

  setUser: (user) => set({ user }),
}));
