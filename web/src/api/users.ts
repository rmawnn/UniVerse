import api from "@/lib/api-client";
import type {
  PaginatedResponse,
  PaginationParams,
  UserSearchResult,
  PublicUserProfile,
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
