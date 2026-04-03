import { create } from "zustand";
import { storeToken, clearToken, getToken } from "../api/client";
import * as authApi from "../api/auth";
import type { UserResponse, LoginRequest, RegisterRequest } from "../types/api";

interface AuthState {
  user: UserResponse | null;
  token: string | null;
  isLoading: boolean;
  isReady: boolean; // true after initial token check

  // Actions
  login: (body: LoginRequest) => Promise<void>;
  register: (body: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
  hydrate: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isLoading: false,
  isReady: false,

  hydrate: async () => {
    // Called once on app start — check for stored token
    try {
      const token = await getToken();
      if (token) {
        set({ token });
        const user = await authApi.getMe();
        set({ user, isReady: true });
      } else {
        set({ isReady: true });
      }
    } catch {
      // Token expired or invalid — clear it
      await clearToken();
      set({ user: null, token: null, isReady: true });
    }
  },

  login: async (body) => {
    set({ isLoading: true });
    try {
      const { access_token } = await authApi.login(body);
      await storeToken(access_token);
      set({ token: access_token });
      const user = await authApi.getMe();
      set({ user, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  register: async (body) => {
    set({ isLoading: true });
    try {
      await authApi.register(body);
      // Auto-login after registration
      await get().login({ email: body.email, password: body.password });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  logout: async () => {
    await clearToken();
    set({ user: null, token: null });
  },

  refreshUser: async () => {
    try {
      const user = await authApi.getMe();
      set({ user });
    } catch {
      // If refresh fails, force logout
      await get().logout();
    }
  },
}));
