import api from "./client";

/* ── Response shapes ─────────────────────────────────────── */

export interface CommunityRecommendation {
  community_id: string;
  name: string;
  description: string | null;
  member_count: number;
  score: number;
  reason: string;
  reasons: string[];
}

export interface CommunityRecommendationsResponse {
  recommendations: CommunityRecommendation[];
  algorithm: string;
}

/* ── Job Match types ─────────────────────────────────────── */

export interface JobMatchFactors {
  skill_overlap: number;
  keyword_overlap: number;
  community_relevance: number;
  university_match: number;
}

export interface JobMatchResponse {
  score: number;
  strengths: string[];
  missing_skills: string[];
  factors: JobMatchFactors;
}

/* ── API calls ───────────────────────────────────────────── */

export async function getRecommendedCommunities(
  limit = 10,
): Promise<CommunityRecommendationsResponse> {
  const res = await api.get<CommunityRecommendationsResponse>(
    "/ai/recommendations/communities",
    { params: { limit }, timeout: 60_000 },
  );
  return res.data;
}

export async function getJobMatch(
  jobId: string,
): Promise<JobMatchResponse> {
  const res = await api.get<JobMatchResponse>(`/jobs/${jobId}/match`, {
    timeout: 60_000,
  });
  return res.data;
}
