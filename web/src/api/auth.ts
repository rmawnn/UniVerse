import api from "@/lib/api-client";
import type {
  RegisterRequest,
  LoginRequest,
  TokenResponse,
  UserResponse,
} from "@/types/api";

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
