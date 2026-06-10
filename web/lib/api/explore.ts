import api from "./client";
import type { PostAuthorSummary, FeedPost } from "./feed";

/* ── Response shapes (matching backend schemas) ──────────── */

/** Trending post from GET /trending/posts */
export interface TrendingPostItem {
  id: string;
  community_id: string;
  author: PostAuthorSummary;
  content: string;
  image_url: string | null;
  post_type: string;
  like_count: number;
  comment_count: number;
  save_count: number;
  trending_score: number;
  created_at: string;
}

/** Trending community from GET /trending/communities */
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

/** Lightweight user for explore suggestions */
export interface ExploreSuggestedUser {
  id: string;
  username: string;
  full_name: string;
  profile_image_url: string | null;
  university_id: string | null;
  is_verified_student: boolean;
}

/** Community in explore response */
export interface ExploreCommunityItem {
  id: string;
  name: string;
  description: string | null;
  member_count: number;
  is_member: boolean | null;
}

/** Combined explore response from GET /explore */
export interface ExploreResponse {
  trending_posts: FeedPost[];
  suggested_communities: ExploreCommunityItem[];
  suggested_users: ExploreSuggestedUser[];
}

/* ── API calls ───────────────────────────────────────────── */

/** Fetch combined explore data (trending posts, suggested communities & users). */
export async function getExplore(): Promise<ExploreResponse> {
  const res = await api.get<ExploreResponse>("/explore");
  return res.data;
}

/** Fetch trending posts with optional limit and time window. */
export async function getTrendingPosts(
  limit = 10,
  days = 7,
): Promise<TrendingPostItem[]> {
  const res = await api.get<TrendingPostItem[]>("/trending/posts", {
    params: { limit, days },
  });
  return res.data;
}

/** Fetch trending communities with optional limit and time window. */
export async function getTrendingCommunities(
  limit = 10,
  days = 7,
): Promise<TrendingCommunityItem[]> {
  const res = await api.get<TrendingCommunityItem[]>("/trending/communities", {
    params: { limit, days },
  });
  return res.data;
}
