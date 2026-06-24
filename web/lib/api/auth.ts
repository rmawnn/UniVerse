import api from "./client";

/* ── Request shapes ──────────────────────────────────────── */

export interface LoginRequest {
  identifier: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  full_name: string;
  username: string;
}

/* ── Response shapes ─────────────────────────────────────── */

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface UserResponse {
  id: string;
  email: string;
  username: string;
  full_name: string;
  university_id: string | null;
  department: string | null;
  academic_year: number | null;
  bio: string | null;
  profile_image_url: string | null;
  cover_image_url: string | null;
  skills: string[];
  is_active: boolean;
  email_verified: boolean;
  is_verified_student: boolean;
  role: string;
  created_at: string;
  updated_at: string;
}

export interface MyProfileResponse extends UserResponse {
  university_name: string | null;
  posts_count: number;
  followers_count: number;
  following_count: number;
  communities_count: number;
}

/* ── API calls ───────────────────────────────────────────── */

export async function loginApi(data: LoginRequest): Promise<TokenResponse> {
  const res = await api.post<TokenResponse>("/auth/login", data);
  return res.data;
}

export async function registerApi(data: RegisterRequest): Promise<UserResponse> {
  const res = await api.post<UserResponse>("/auth/register", data);
  return res.data;
}

export async function getMe(): Promise<MyProfileResponse> {
  const res = await api.get<MyProfileResponse>("/users/me");
  return res.data;
}

export async function refreshTokenApi(
  refreshToken: string,
): Promise<TokenResponse> {
  const res = await api.post<TokenResponse>("/auth/refresh", {
    refresh_token: refreshToken,
  });
  return res.data;
}

export async function logoutApi(refreshToken: string): Promise<void> {
  await api.post("/auth/logout", { refresh_token: refreshToken });
}

/* ── Password reset ─────────────────────────────────────── */

export interface MessageResponse {
  message: string;
}

export async function forgotPasswordApi(email: string): Promise<MessageResponse> {
  const res = await api.post<MessageResponse>("/auth/forgot-password", { email });
  return res.data;
}

export async function resetPasswordApi(
  token: string,
  new_password: string,
): Promise<MessageResponse> {
  const res = await api.post<MessageResponse>("/auth/reset-password", {
    token,
    new_password,
  });
  return res.data;
}
