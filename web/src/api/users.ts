import api from "@/lib/api-client";
import type {
  PaginatedResponse,
  PaginationParams,
  UserResponse,
  UserSearchResult,
  PublicUserProfile,
  FollowResponse,
  UserInsightsResponse,
} from "@/types/api";

export interface UpdateProfileRequest {
  full_name?: string;
  bio?: string | null;
  profile_image_url?: string | null;
  department?: string | null;
  academic_year?: number | null;
}

export async function updateProfile(
  data: UpdateProfileRequest
): Promise<UserResponse> {
  const { data: result } = await api.patch<UserResponse>("/users/me", data);
  return result;
}

export async function searchUsers(
  q: string,
  params?: PaginationParams
): Promise<PaginatedResponse<UserSearchResult>> {
  const { data } = await api.get<PaginatedResponse<UserSearchResult>>(
    "/users/search",
    { params: { q, ...params } }
  );
  return data;
}

export async function getUserProfile(
  userId: string
): Promise<PublicUserProfile> {
  const { data } = await api.get<PublicUserProfile>(`/users/${userId}`);
  return data;
}

export async function followUser(userId: string): Promise<FollowResponse> {
  const { data } = await api.post<FollowResponse>(`/users/${userId}/follow`);
  return data;
}

export async function unfollowUser(userId: string): Promise<FollowResponse> {
  const { data } = await api.delete<FollowResponse>(`/users/${userId}/follow`);
  return data;
}

export async function listFollowers(
  userId: string,
  params?: PaginationParams
): Promise<PaginatedResponse<UserSearchResult>> {
  const { data } = await api.get<PaginatedResponse<UserSearchResult>>(
    `/users/${userId}/followers`,
    { params }
  );
  return data;
}

export async function listFollowing(
  userId: string,
  params?: PaginationParams
): Promise<PaginatedResponse<UserSearchResult>> {
  const { data } = await api.get<PaginatedResponse<UserSearchResult>>(
    `/users/${userId}/following`,
    { params }
  );
  return data;
}

export async function getMyInsights(): Promise<UserInsightsResponse> {
  const { data } = await api.get<UserInsightsResponse>("/users/me/insights");
  return data;
}

export async function getFollowSuggestions(
  limit: number = 10,
): Promise<UserSearchResult[]> {
  const { data } = await api.get<UserSearchResult[]>("/users/suggestions", {
    params: { limit },
  });
  return data;
}
