import api from "@/lib/api-client";

// ── Types ───────────────────────────────────────────────────

export interface TrendingPostAuthor {
  id: string;
  username: string;
  full_name: string;
  profile_image_url: string | null;
}

export interface TrendingPostItem {
  id: string;
  community_id: string;
  author: TrendingPostAuthor;
  content: string;
  image_url: string | null;
  post_type: string;
  like_count: number;
  comment_count: number;
  save_count: number;
  trending_score: number;
  created_at: string;
}

export interface TrendingCommunityItem {
  id: string;
  name: string;
  description: string | null;
  member_count: number;
  posts_this_week: number;
  new_members_this_week: number;
  trending_score: number;
  is_member: boolean | null;
  created_at: string;
}

export interface TrendingJobItem {
  id: string;
  title: string;
  company_name: string | null;
  location: string | null;
  job_type: string;
  author_username: string;
  application_count: number;
  save_count: number;
  trending_score: number;
  created_at: string;
}

// ── API ─────────────────────────────────────────────────────

export async function getTrendingPosts(
  limit = 10,
  days = 7,
): Promise<TrendingPostItem[]> {
  const { data } = await api.get<TrendingPostItem[]>("/trending/posts", {
    params: { limit, days },
  });
  return data;
}

export async function getTrendingCommunities(
  limit = 10,
  days = 7,
): Promise<TrendingCommunityItem[]> {
  const { data } = await api.get<TrendingCommunityItem[]>(
    "/trending/communities",
    { params: { limit, days } },
  );
  return data;
}

export async function getTrendingJobs(
  limit = 10,
  days = 14,
): Promise<TrendingJobItem[]> {
  const { data } = await api.get<TrendingJobItem[]>("/trending/jobs", {
    params: { limit, days },
  });
  return data;
}
