import api from "./client";

/* ── Response shapes ─────────────────────────────────────── */

export interface PostAuthorSummary {
  id: string;
  username: string;
  full_name: string;
  profile_image_url: string | null;
}

export interface PollOptionData {
  id: string;
  label: string;
  position: number;
  vote_count: number;
  pct: number;
}

export interface PollData {
  options: PollOptionData[];
  total_votes: number;
  voted_option_id: string | null;
}

export interface FeedPost {
  id: string;
  community_id: string;
  author: PostAuthorSummary;
  content: string;
  image_url: string | null;
  video_url: string | null;
  post_type: string;
  category: string | null;
  like_count: number;
  comment_count: number;
  repost_count: number;
  liked_by_me: boolean;
  saved_by_me: boolean;
  reposted_by_me: boolean;
  feed_label: string | null;
  recommendation_score: number | null;
  poll: PollData | null;
  created_at: string;
  updated_at: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

/* ── API calls ───────────────────────────────────────────── */

export async function getFeed(
  page = 1,
  pageSize = 20,
): Promise<PaginatedResponse<FeedPost>> {
  const res = await api.get<PaginatedResponse<FeedPost>>("/feed", {
    params: { page, page_size: pageSize },
  });
  return res.data;
}
