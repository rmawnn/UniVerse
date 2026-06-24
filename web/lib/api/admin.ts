import api from "./client";

/* ── Types ────────────────────────────────────────────── */

export interface AdminStatsResponse {
  total_users: number;
  active_users: number;
  verified_students: number;
  pending_verifications: number;
  total_communities: number;
  active_communities: number;
  total_posts: number;
  hidden_posts: number;
  total_messages: number;
  total_jobs: number;
  active_jobs: number;
  total_applications: number;
  total_reports: number;
  pending_reports: number;
  users_this_week: number;
  posts_this_week: number;
  jobs_this_week: number;
  applications_this_week: number;
  verifications_this_week: number;
  communities_this_week: number;
  reports_this_week: number;
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

export interface AdminReport {
  id: string;
  reporter_id: string;
  reporter_username: string;
  target_type: string;
  target_id: string;
  target_label: string;
  reason: string;
  status: string;
  created_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
}

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

export interface AdminCommunity {
  id: string;
  name: string;
  description: string | null;
  university_id: string;
  member_count: number;
  is_deleted: boolean;
  created_at: string;
}

export interface ModerationJobItem {
  id: string;
  title: string;
  company_name: string | null;
  job_type: string;
  author_username: string;
  is_active: boolean;
  created_at: string;
}

export interface ModerationQueueResponse {
  pending_verifications: AdminVerification[];
  hidden_posts: AdminPost[];
  recent_communities: AdminCommunity[];
  recent_jobs: ModerationJobItem[];
}

export interface RecentActivityResponse {
  latest_users: Record<string, unknown>[];
  latest_verifications: Record<string, unknown>[];
  latest_posts: Record<string, unknown>[];
  latest_communities: Record<string, unknown>[];
  latest_reports: Record<string, unknown>[];
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

/* ── AI Analytics types ──────────────────────────────── */

export interface CategoryDistributionItem {
  category: string;
  count: number;
  percentage: number;
}

export interface LatestCategorizedPost {
  id: string;
  content_preview: string;
  category: string;
  created_at: string;
}

export interface CategorizationAnalytics {
  total_categorized: number;
  total_uncategorized: number;
  distribution: CategoryDistributionItem[];
  latest_posts: LatestCategorizedPost[];
  provider: string;
  eval_accuracy: number | null;
}

export interface CommunityRecAnalytics {
  total_communities: number;
  algorithm_signals: { name: string; weight: number }[];
  eval_precision_at_3: number | null;
  eval_ndcg_at_3: number | null;
  eval_scenarios: number | null;
}

export interface JobMatchAnalytics {
  total_jobs: number;
  total_applications: number;
  eval_skill_accuracy: number | null;
  eval_tier_accuracy: number | null;
  eval_ranking_accuracy: number | null;
}

export interface LoRAAnalytics {
  train_examples: number;
  eval_examples: number;
  model_name: string;
  dataset_ready: boolean;
  training_status: string;
  evaluation_status: string;
  base_accuracy: number | null;
  finetuned_accuracy: number | null;
  base_macro_f1: number | null;
  finetuned_macro_f1: number | null;
  base_weighted_f1: number | null;
  finetuned_weighted_f1: number | null;
  epochs: number | null;
  total_steps: number | null;
  train_loss: number | null;
  adapter_size_mb: number | null;
  method: string | null;
}

export interface AIAnalyticsResponse {
  categorization: CategorizationAnalytics;
  community_recommendation: CommunityRecAnalytics;
  job_matching: JobMatchAnalytics;
  lora: LoRAAnalytics;
}

/* ── AI Usage Logs types ────────────────────────────── */

export interface AIUsageLogItem {
  id: string;
  user_id: string;
  feature: string;
  provider: string;
  latency_ms: number;
  success: boolean;
  created_at: string;
}

export interface AIUsageByFeature {
  feature: string;
  count: number;
  avg_latency_ms: number;
  success_rate: number;
}

export interface AIUsageSummary {
  total_requests: number;
  success_rate: number;
  avg_latency_ms: number;
  by_feature: AIUsageByFeature[];
}

/* ── API calls ────────────────────────────────────────── */

// Stats & Activity
export async function getAdminStats(): Promise<AdminStatsResponse> {
  const res = await api.get<AdminStatsResponse>("/admin/stats");
  return res.data;
}

export async function getRecentActivity(): Promise<RecentActivityResponse> {
  const res = await api.get<RecentActivityResponse>("/admin/recent-activity");
  return res.data;
}

export async function getModerationQueue(): Promise<ModerationQueueResponse> {
  const res = await api.get<ModerationQueueResponse>("/admin/moderation");
  return res.data;
}

// Verifications
export async function getVerifications(
  page = 1,
  pageSize = 50,
  status?: string,
  method?: string,
  search?: string,
): Promise<PaginatedResponse<AdminVerification>> {
  const res = await api.get<PaginatedResponse<AdminVerification>>(
    "/admin/verifications",
    { params: { page, page_size: pageSize, status, method, search } },
  );
  return res.data;
}

export async function approveVerification(
  verificationId: string,
): Promise<AdminVerification> {
  const res = await api.patch<AdminVerification>(
    `/admin/verifications/${verificationId}/approve`,
  );
  return res.data;
}

export async function rejectVerification(
  verificationId: string,
  reason?: string,
): Promise<AdminVerification> {
  const res = await api.patch<AdminVerification>(
    `/admin/verifications/${verificationId}/reject`,
    reason ? { reason } : undefined,
  );
  return res.data;
}

// Reports
export async function getReports(
  page = 1,
  pageSize = 50,
  status?: string,
  targetType?: string,
): Promise<PaginatedResponse<AdminReport>> {
  const res = await api.get<PaginatedResponse<AdminReport>>("/admin/reports", {
    params: { page, page_size: pageSize, status, target_type: targetType },
  });
  return res.data;
}

export async function updateReportStatus(
  reportId: string,
  status: "reviewed" | "dismissed" | "action_taken",
): Promise<AdminReport> {
  const res = await api.patch<AdminReport>(`/admin/reports/${reportId}/status`, {
    status,
  });
  return res.data;
}

// Users
export interface AdminCreateUserRequest {
  email: string;
  username: string;
  full_name: string;
  password: string;
  role: string;
}

export async function createUser(
  data: AdminCreateUserRequest,
): Promise<AdminUser> {
  const res = await api.post<AdminUser>("/admin/users", data);
  return res.data;
}

export async function getAdminUsers(
  page = 1,
  pageSize = 50,
  search?: string,
  isActive?: boolean,
  isVerified?: boolean,
  role?: string,
): Promise<PaginatedResponse<AdminUser>> {
  const res = await api.get<PaginatedResponse<AdminUser>>("/admin/users", {
    params: {
      page,
      page_size: pageSize,
      search,
      is_active: isActive,
      is_verified: isVerified,
      role,
    },
  });
  return res.data;
}

export async function deactivateUser(userId: string): Promise<AdminUser> {
  const res = await api.patch<AdminUser>(`/admin/users/${userId}/deactivate`);
  return res.data;
}

export async function activateUser(userId: string): Promise<AdminUser> {
  const res = await api.patch<AdminUser>(`/admin/users/${userId}/activate`);
  return res.data;
}

export async function changeUserRole(
  userId: string,
  role: string,
): Promise<AdminUser> {
  const res = await api.patch<AdminUser>(`/admin/users/${userId}/role`, {
    role,
  });
  return res.data;
}

export async function verifyUserManually(userId: string): Promise<AdminUser> {
  const res = await api.patch<AdminUser>(`/admin/users/${userId}/verify`);
  return res.data;
}

// Posts
export async function hidePost(postId: string): Promise<AdminPost> {
  const res = await api.patch<AdminPost>(`/admin/posts/${postId}/hide`);
  return res.data;
}

export async function restorePost(postId: string): Promise<AdminPost> {
  const res = await api.patch<AdminPost>(`/admin/posts/${postId}/restore`);
  return res.data;
}

// AI Analytics
export async function getAIAnalytics(): Promise<AIAnalyticsResponse> {
  const res = await api.get<AIAnalyticsResponse>("/admin/ai/analytics");
  return res.data;
}

// AI Usage Logs
export async function getAIUsageLogs(
  page = 1,
  pageSize = 50,
  feature?: string,
): Promise<PaginatedResponse<AIUsageLogItem>> {
  const res = await api.get<PaginatedResponse<AIUsageLogItem>>("/admin/ai/logs", {
    params: { page, page_size: pageSize, feature },
  });
  return res.data;
}

export async function getAIUsageSummary(): Promise<AIUsageSummary> {
  const res = await api.get<AIUsageSummary>("/admin/ai/logs/summary");
  return res.data;
}
