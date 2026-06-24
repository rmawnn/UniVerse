import api from "./client";
import { ApiError } from "./client";
import type { PaginatedResponse, FeedPost } from "./feed";

/* ── User profile shapes ────────────────────────────────────── */

export interface PublicUserProfile {
  id: string;
  username: string;
  full_name: string;
  profile_image_url: string | null;
  cover_image_url: string | null;
  bio: string | null;
  department: string | null;
  academic_year: number | null;
  university_id: string | null;
  university_name: string | null;
  is_verified_student: boolean;
  skills: string[];
  communities: CommunitySummary[];
  posts_count: number;
  followers_count: number;
  following_count: number;
  communities_count: number;
  is_following: boolean;
  is_blocked: boolean;
  created_at: string;
}

export interface CommunitySummary {
  id: string;
  name: string;
}

export interface FollowResponse {
  followers_count: number;
  following_count: number;
  is_following: boolean;
}

/* ── Unified search shapes ──────────────────────────────────── */

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

/* ── API calls ──────────────────────────────────────────────── */

/**
 * Look up a user's public profile by username.
 */
export async function getProfileByUsername(
  username: string,
): Promise<PublicUserProfile> {
  const res = await api.get<PublicUserProfile>(
    `/users/by-username/${encodeURIComponent(username)}`,
  );
  return res.data;
}

/**
 * Fetch a user's posts by their ID.
 */
export async function getUserPosts(
  userId: string,
  page = 1,
  pageSize = 20,
): Promise<PaginatedResponse<FeedPost>> {
  const res = await api.get<PaginatedResponse<FeedPost>>(
    `/users/${userId}/posts`,
    { params: { page, page_size: pageSize } },
  );
  return res.data;
}

/**
 * Follow a user.
 */
export async function followUser(userId: string): Promise<FollowResponse> {
  const res = await api.post<FollowResponse>(`/users/${userId}/follow`);
  return res.data;
}

/**
 * Unfollow a user.
 */
export async function unfollowUser(userId: string): Promise<FollowResponse> {
  const res = await api.delete<FollowResponse>(`/users/${userId}/follow`);
  return res.data;
}

/**
 * Unified search across users, communities, posts, and jobs.
 */
export async function blockUser(userId: string): Promise<{ blocked: boolean }> {
  const res = await api.post<{ blocked: boolean }>(`/users/${userId}/block`);
  return res.data;
}

export async function unblockUser(userId: string): Promise<{ blocked: boolean }> {
  const res = await api.delete<{ blocked: boolean }>(`/users/${userId}/block`);
  return res.data;
}

export async function unifiedSearch(
  q: string,
): Promise<UnifiedSearchResponse> {
  const res = await api.get<UnifiedSearchResponse>("/search", {
    params: { q },
  });
  return res.data;
}
