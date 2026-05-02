import { create } from "zustand";
import { storeToken, clearToken, getToken } from "@/lib/api-client";
import * as authApi from "@/api/auth";
import type { UserResponse, LoginRequest, RegisterRequest } from "@/types/api";

interface AuthState {
  user: UserResponse | null;
  token: string | null;
  isLoading: boolean;
  isReady: boolean;

  login: (body: LoginRequest) => Promise<void>;
  register: (body: RegisterRequest) => Promise<void>;
  logout: () => void;
  hydrate: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isLoading: false,
  isReady: false,

  hydrate: async () => {
    const token = getToken();
    if (!token) {
      set({ isReady: true });
      return;
    }
    try {
      set({ token });
      const user = await authApi.getMe();
      set({ user, isReady: true });
    } catch {
      clearToken();
      set({ user: null, token: null, isReady: true });
    }
  },

  login: async (body) => {
    set({ isLoading: true });
    try {
      const { access_token } = await authApi.login(body);
      storeToken(access_token);
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
      await get().login({ email: body.email, password: body.password });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  logout: () => {
    clearToken();
    set({ user: null, token: null });
  },

  refreshUser: async () => {
    try {
      const user = await authApi.getMe();
      set({ user });
    } catch {
      get().logout();
    }
  },
}));
