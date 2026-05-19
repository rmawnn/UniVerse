import api from "@/lib/api-client";

// ── Types ───────────────────────────────────────────────────

export interface SearchUserItem {
  id: string;
  username: string;
  full_name: string;
  profile_image_url: string | null;
  is_verified_student: boolean;
}

export interface SearchCommunityItem {
  id: string;
  name: string;
  description: string | null;
  member_count: number;
  is_member: boolean | null;
}

export interface SearchPostItem {
  id: string;
  author_username: string;
  author_full_name: string;
  community_name: string;
  content_preview: string;
  like_count: number;
  comment_count: number;
  created_at: string;
}

export interface SearchJobItem {
  id: string;
  title: string;
  company_name: string | null;
  location: string | null;
  job_type: string;
  is_active: boolean;
  created_at: string;
}

export interface UnifiedSearchResponse {
  users: SearchUserItem[];
  communities: SearchCommunityItem[];
  posts: SearchPostItem[];
  jobs: SearchJobItem[];
  users_total: number;
  communities_total: number;
  posts_total: number;
  jobs_total: number;
}

// ── API ─────────────────────────────────────────────────────

export async function unifiedSearch(q: string): Promise<UnifiedSearchResponse> {
  const { data } = await api.get<UnifiedSearchResponse>("/search", {
    params: { q },
  });
  return data;
}
