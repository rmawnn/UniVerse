import api from "./client";
import { ApiError } from "./client";
import type { PaginatedResponse, FeedPost } from "./feed";

/* ── User profile shapes ────────────────────────────────────── */

export interface PublicUserProfile {
  id: string;
  username: string;
  full_name: string;
  profile_image_url: string | null;
  bio: string | null;
  department: string | null;
  academic_year: number | null;
  university_id: string | null;
  university_name: string | null;
  is_verified_student: boolean;
  communities: CommunitySummary[];
  posts_count: number;
  followers_count: number;
  following_count: number;
  communities_count: number;
  is_following: boolean;
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
 * Lookup a user by username via the search endpoint,
 * then fetch their full public profile by ID.
 */
export async function getProfileByUsername(
  username: string,
): Promise<PublicUserProfile> {
  // Step 1: search for the user by exact username
  const searchRes = await api.get<
    PaginatedResponse<SearchUserItem>
  >("/users/search", {
    params: { q: username, page_size: 20 },
  });

  const match = searchRes.data.items.find(
    (u) => u.username.toLowerCase() === username.toLowerCase(),
  );

  if (!match) {
    throw new ApiError("User not found", 404);
  }

  // Step 2: fetch full public profile
  const profileRes = await api.get<PublicUserProfile>(
    `/users/${match.id}`,
  );
  return profileRes.data;
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
export async function unifiedSearch(
  q: string,
): Promise<UnifiedSearchResponse> {
  const res = await api.get<UnifiedSearchResponse>("/search", {
    params: { q },
  });
  return res.data;
}
