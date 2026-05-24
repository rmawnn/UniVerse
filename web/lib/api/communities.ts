import api from "./client";
import type { PaginatedResponse } from "./feed";

/* ── Response shapes ─────────────────────────────────────── */

export interface CommunityResponse {
  id: string;
  name: string;
  description: string | null;
  university_id: string;
  created_by: string;
  is_public: boolean;
  member_count: number;
  created_at: string;
  updated_at: string;
}

export interface CommunityDetailResponse extends CommunityResponse {
  is_member: boolean;
  my_role: string | null;
}

/* ── API calls ───────────────────────────────────────────── */

export async function getJoinedCommunities(): Promise<CommunityResponse[]> {
  const res = await api.get<CommunityResponse[]>("/communities/joined");
  return res.data;
}

export async function getCommunity(
  id: string,
): Promise<CommunityDetailResponse> {
  const res = await api.get<CommunityDetailResponse>(`/communities/${id}`);
  return res.data;
}

export async function joinCommunity(
  id: string,
): Promise<CommunityDetailResponse> {
  const res = await api.post<CommunityDetailResponse>(
    `/communities/${id}/join`,
  );
  return res.data;
}

export async function leaveCommunity(id: string): Promise<void> {
  await api.post(`/communities/${id}/leave`);
}
