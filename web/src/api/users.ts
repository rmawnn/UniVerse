import api from "@/lib/api-client";
import type {
  PaginatedResponse,
  PaginationParams,
  UserSearchResult,
  PublicUserProfile,
  FollowResponse,
} from "@/types/api";

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
