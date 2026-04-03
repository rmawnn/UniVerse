import api from "./client";
import type {
  RegisterRequest,
  LoginRequest,
  TokenResponse,
  UserResponse,
} from "../types/api";

export async function register(body: RegisterRequest): Promise<UserResponse> {
  const { data } = await api.post<UserResponse>("/auth/register", body);
  return data;
}

export async function login(body: LoginRequest): Promise<TokenResponse> {
  const { data } = await api.post<TokenResponse>("/auth/login", body);
  return data;
}

export async function getMe(): Promise<UserResponse> {
  const { data } = await api.get<UserResponse>("/users/me");
  return data;
}

export async function updateProfile(
  body: Partial<{
    full_name: string;
    bio: string;
    profile_image_url: string;
    department: string;
    academic_year: number;
  }>
): Promise<UserResponse> {
  const { data } = await api.patch<UserResponse>("/users/me", body);
  return data;
}
