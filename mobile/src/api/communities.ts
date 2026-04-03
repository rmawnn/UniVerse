import api from "./client";
import type {
  PaginatedResponse,
  PaginationParams,
  CommunityResponse,
  CommunityDetailResponse,
  CommunitySearchResult,
  CreateCommunityRequest,
} from "../types/api";

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

export async function getCommunity(
  communityId: string
): Promise<CommunityDetailResponse> {
  const { data } = await api.get<CommunityDetailResponse>(
    `/communities/${communityId}`
  );
  return data;
}

export async function searchCommunities(
  q: string,
  params?: PaginationParams & { university_id?: string }
): Promise<PaginatedResponse<CommunitySearchResult>> {
  const { data } = await api.get<PaginatedResponse<CommunitySearchResult>>(
    "/communities/search",
    { params: { q, ...params } }
  );
  return data;
}

export async function createCommunity(
  body: CreateCommunityRequest
): Promise<CommunityDetailResponse> {
  const { data } = await api.post<CommunityDetailResponse>("/communities", body);
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
