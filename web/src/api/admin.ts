import api from "@/lib/api-client";
import type { PaginatedResponse } from "@/types/api";

// ── Types ───────────────────────────────────────────────────

export interface AdminUser {
  id: string;
  username: string;
  email: string;
  full_name: string;
  is_active: boolean;
  is_verified_student: boolean;
  role: string;
  university_id: string | null;
  created_at: string;
}

export interface AdminUserDetail extends AdminUser {
  bio: string | null;
  department: string | null;
  academic_year: number | null;
  profile_image_url: string | null;
  university_name: string | null;
  communities: { id: string; name: string }[];
  recent_posts: {
    id: string;
    content_preview: string;
    is_deleted: boolean;
    created_at: string;
  }[];
}

export interface AdminVerification {
  id: string;
  user_id: string;
  username: string;
  full_name: string;
  verification_method: string;
  university_email: string | null;
  document_url: string | null;
  university_id: string;
  university_name: string | null;
  status: string;
  rejection_reason: string | null;
  created_at: string;
  expires_at: string | null;
  verified_at: string | null;
}

export interface AdminCommunity {
  id: string;
  name: string;
  description: string | null;
  university_id: string;
  member_count: number;
  is_deleted: boolean;
  created_at: string;
}

export interface AdminCommunityDetail extends AdminCommunity {
  created_by_username: string | null;
  members: {
    user_id: string;
    username: string;
    full_name: string;
    role: string;
  }[];
  recent_posts: {
    id: string;
    author_username: string;
    content_preview: string;
    is_deleted: boolean;
    created_at: string;
  }[];
}

export interface AdminPost {
  id: string;
  author_username: string;
  author_full_name: string;
  community_id: string;
  community_name: string;
  content_preview: string;
  image_url: string | null;
  is_deleted: boolean;
  created_at: string;
}

export interface AdminPostDetail extends AdminPost {
  content: string;
  like_count: number;
  comment_count: number;
  comments: {
    id: string;
    author_username: string;
    content: string;
    is_deleted: boolean;
    created_at: string;
  }[];
}

export interface AdminStats {
  total_users: number;
  active_users: number;
  verified_students: number;
  pending_verifications: number;
  total_communities: number;
  active_communities: number;
  total_posts: number;
  hidden_posts: number;
  total_messages: number;
}

export interface RecentActivity {
  latest_users: {
    id: string;
    username: string;
    email: string;
    created_at: string;
  }[];
  latest_verifications: {
    id: string;
    username: string;
    university_email: string;
    status: string;
    created_at: string;
  }[];
  latest_posts: {
    id: string;
    author_username: string;
    community_name: string;
    content_preview: string;
    is_deleted: boolean;
    created_at: string;
  }[];
  latest_communities: {
    id: string;
    name: string;
    is_deleted: boolean;
    created_at: string;
  }[];
}

// ── Stats & Activity ───────────────────────────────────────

export async function getStats(): Promise<AdminStats> {
  const { data } = await api.get<AdminStats>("/admin/stats");
  return data;
}

export async function getRecentActivity(): Promise<RecentActivity> {
  const { data } = await api.get<RecentActivity>("/admin/recent-activity");
  return data;
}

// ── Users ───────────────────────────────────────────────────

export async function listUsers(params: {
  page?: number;
  page_size?: number;
  search?: string;
  is_active?: boolean;
  is_verified?: boolean;
  role?: string;
}): Promise<PaginatedResponse<AdminUser>> {
  const { data } = await api.get<PaginatedResponse<AdminUser>>("/admin/users", {
    params,
  });
  return data;
}

export async function getUserDetail(userId: string): Promise<AdminUserDetail> {
  const { data } = await api.get<AdminUserDetail>(`/admin/users/${userId}`);
  return data;
}

export async function deactivateUser(userId: string): Promise<AdminUser> {
  const { data } = await api.patch<AdminUser>(`/admin/users/${userId}/deactivate`);
  return data;
}

export async function activateUser(userId: string): Promise<AdminUser> {
  const { data } = await api.patch<AdminUser>(`/admin/users/${userId}/activate`);
  return data;
}

export async function changeRole(userId: string, role: string): Promise<AdminUser> {
  const { data } = await api.patch<AdminUser>(`/admin/users/${userId}/role`, { role });
  return data;
}

export async function verifyUserManually(userId: string): Promise<AdminUser> {
  const { data } = await api.patch<AdminUser>(`/admin/users/${userId}/verify`);
  return data;
}

// ── Verifications ───────────────────────────────────────────

export async function listVerifications(params: {
  page?: number;
  page_size?: number;
  status?: string;
  method?: string;
  university_id?: string;
  search?: string;
}): Promise<PaginatedResponse<AdminVerification>> {
  const { data } = await api.get<PaginatedResponse<AdminVerification>>(
    "/admin/verifications",
    { params }
  );
  return data;
}

export async function getVerificationDetail(id: string): Promise<AdminVerification> {
  const { data } = await api.get<AdminVerification>(`/admin/verifications/${id}`);
  return data;
}

export async function approveVerification(id: string): Promise<AdminVerification> {
  const { data } = await api.patch<AdminVerification>(
    `/admin/verifications/${id}/approve`
  );
  return data;
}

export async function rejectVerification(
  id: string,
  reason?: string
): Promise<AdminVerification> {
  const { data } = await api.patch<AdminVerification>(
    `/admin/verifications/${id}/reject`,
    reason ? { reason } : undefined
  );
  return data;
}

// ── Communities ─────────────────────────────────────────────

export async function listCommunities(params: {
  page?: number;
  page_size?: number;
}): Promise<PaginatedResponse<AdminCommunity>> {
  const { data } = await api.get<PaginatedResponse<AdminCommunity>>(
    "/admin/communities",
    { params }
  );
  return data;
}

export async function getCommunityDetail(id: string): Promise<AdminCommunityDetail> {
  const { data } = await api.get<AdminCommunityDetail>(`/admin/communities/${id}`);
  return data;
}

export async function deleteCommunity(id: string): Promise<AdminCommunity> {
  const { data } = await api.patch<AdminCommunity>(`/admin/communities/${id}/delete`);
  return data;
}

export async function restoreCommunity(id: string): Promise<AdminCommunity> {
  const { data } = await api.patch<AdminCommunity>(`/admin/communities/${id}/restore`);
  return data;
}

// ── Posts ────────────────────────────────────────────────────

export async function listPosts(params: {
  page?: number;
  page_size?: number;
}): Promise<PaginatedResponse<AdminPost>> {
  const { data } = await api.get<PaginatedResponse<AdminPost>>("/admin/posts", {
    params,
  });
  return data;
}

export async function getPostDetail(postId: string): Promise<AdminPostDetail> {
  const { data } = await api.get<AdminPostDetail>(`/admin/posts/${postId}`);
  return data;
}

export async function hidePost(postId: string): Promise<AdminPost> {
  const { data } = await api.patch<AdminPost>(`/admin/posts/${postId}/hide`);
  return data;
}

export async function restorePost(postId: string): Promise<AdminPost> {
  const { data } = await api.patch<AdminPost>(`/admin/posts/${postId}/restore`);
  return data;
}
