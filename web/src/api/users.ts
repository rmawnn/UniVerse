import api from "@/lib/api-client";
import type { PaginatedResponse, PaginationParams, UserSearchResult } from "@/types/api";

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
