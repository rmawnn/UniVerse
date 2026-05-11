import api from "@/lib/api-client";
import type {
  PaginatedResponse,
  PaginationParams,
  CommunityResponse,
  CommunityDetailResponse,
  CommunityMemberResponse,
  CommunitySearchResult,
  CreateCommunityRequest,
  UpdateCommunityRequest,
  ExploreCommunityResponse,
} from "@/types/api";

export async function createCommunity(
  body: CreateCommunityRequest
): Promise<CommunityDetailResponse> {
  const { data } = await api.post<CommunityDetailResponse>(
    "/communities",
    body
  );
  return data;
}

export async function updateCommunity(
  communityId: string,
  body: UpdateCommunityRequest
): Promise<CommunityDetailResponse> {
  const { data } = await api.patch<CommunityDetailResponse>(
    `/communities/${communityId}`,
    body
  );
  return data;
}

export async function deleteCommunity(
  communityId: string
): Promise<void> {
  await api.delete(`/communities/${communityId}`);
}

export async function getCommunity(
  communityId: string
): Promise<CommunityDetailResponse> {
  const { data } = await api.get<CommunityDetailResponse>(
    `/communities/${communityId}`
  );
  return data;
}

export async function joinCommunity(
  communityId: string
): Promise<CommunityDetailResponse> {
  const { data } = await api.post<CommunityDetailResponse>(
    `/communities/${communityId}/join`
  );
  return data;
}

export async function leaveCommunity(
  communityId: string
): Promise<void> {
  await api.post(`/communities/${communityId}/leave`);
}

export async function listMyCommunities(): Promise<CommunityResponse[]> {
  const { data } = await api.get<CommunityResponse[]>("/communities/joined");
  return data;
}

export async function listCommunities(
  universityId: string,
  params?: PaginationParams
): Promise<PaginatedResponse<CommunityResponse>> {
  const { data } = await api.get<PaginatedResponse<CommunityResponse>>(
    "/communities",
    { params: { university_id: universityId, ...params } }
  );
  return data;
}

export async function listMembers(
  communityId: string,
  params?: PaginationParams
): Promise<PaginatedResponse<CommunityMemberResponse>> {
  const { data } = await api.get<PaginatedResponse<CommunityMemberResponse>>(
    `/communities/${communityId}/members`,
    { params }
  );
  return data;
}

export async function removeMember(
  communityId: string,
  userId: string
): Promise<void> {
  await api.delete(`/communities/${communityId}/members/${userId}`);
}

export async function exploreCommunities(
  params?: PaginationParams
): Promise<PaginatedResponse<ExploreCommunityResponse>> {
  const { data } = await api.get<PaginatedResponse<ExploreCommunityResponse>>(
    "/explore/communities",
    { params }
  );
  return data;
}

export async function searchCommunities(
  q: string,
  params?: PaginationParams
): Promise<PaginatedResponse<CommunitySearchResult>> {
  const { data } = await api.get<PaginatedResponse<CommunitySearchResult>>(
    "/communities/search",
    { params: { q, ...params } }
  );
  return data;
}
