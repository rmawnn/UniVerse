"use client";

import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryOptions,
} from "@tanstack/react-query";
import {
  getAdminStats,
  getRecentActivity,
  getModerationQueue,
  getVerifications,
  approveVerification,
  rejectVerification,
  getReports,
  updateReportStatus,
  getAdminUsers,
  deactivateUser,
  activateUser,
  changeUserRole,
  verifyUserManually,
  hidePost,
  restorePost,
  type AdminStatsResponse,
  type RecentActivityResponse,
  type ModerationQueueResponse,
  type AdminVerification,
  type AdminReport,
  type AdminUser,
  type PaginatedResponse,
} from "@/lib/api/admin";

/* ── Query keys ─────────────────────────────────────── */

export const adminKeys = {
  stats: ["admin", "stats"] as const,
  activity: ["admin", "activity"] as const,
  moderation: ["admin", "moderation"] as const,
  verifications: (filters?: Record<string, unknown>) =>
    ["admin", "verifications", filters] as const,
  reports: (filters?: Record<string, unknown>) =>
    ["admin", "reports", filters] as const,
  users: (filters?: Record<string, unknown>) =>
    ["admin", "users", filters] as const,
};

/* ── Stats ──────────────────────────────────────────── */

export function useAdminStats(
  options?: Partial<UseQueryOptions<AdminStatsResponse>>,
) {
  return useQuery({
    queryKey: adminKeys.stats,
    queryFn: getAdminStats,
    staleTime: 30_000,
    ...options,
  });
}

/* ── Recent Activity ────────────────────────────────── */

export function useRecentActivity(
  options?: Partial<UseQueryOptions<RecentActivityResponse>>,
) {
  return useQuery({
    queryKey: adminKeys.activity,
    queryFn: getRecentActivity,
    staleTime: 30_000,
    ...options,
  });
}

/* ── Moderation Queue ───────────────────────────────── */

export function useModerationQueue(
  options?: Partial<UseQueryOptions<ModerationQueueResponse>>,
) {
  return useQuery({
    queryKey: adminKeys.moderation,
    queryFn: getModerationQueue,
    staleTime: 30_000,
    ...options,
  });
}

/* ── Verifications ──────────────────────────────────── */

export function useVerifications(
  page = 1,
  pageSize = 50,
  status?: string,
  method?: string,
  search?: string,
) {
  return useQuery({
    queryKey: adminKeys.verifications({ page, pageSize, status, method, search }),
    queryFn: () => getVerifications(page, pageSize, status, method, search),
    staleTime: 15_000,
  });
}

export function useApproveVerification() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (verificationId: string) => approveVerification(verificationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin"] });
    },
  });
}

export function useRejectVerification() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      verificationId,
      reason,
    }: {
      verificationId: string;
      reason?: string;
    }) => rejectVerification(verificationId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin"] });
    },
  });
}

/* ── Reports ────────────────────────────────────────── */

export function useReports(
  page = 1,
  pageSize = 50,
  status?: string,
  targetType?: string,
) {
  return useQuery({
    queryKey: adminKeys.reports({ page, pageSize, status, targetType }),
    queryFn: () => getReports(page, pageSize, status, targetType),
    staleTime: 15_000,
  });
}

export function useUpdateReportStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      reportId,
      status,
    }: {
      reportId: string;
      status: "reviewed" | "dismissed" | "action_taken";
    }) => updateReportStatus(reportId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin"] });
    },
  });
}

/* ── Users ──────────────────────────────────────────── */

export function useAdminUsers(
  page = 1,
  pageSize = 50,
  search?: string,
  isActive?: boolean,
  isVerified?: boolean,
  role?: string,
) {
  return useQuery({
    queryKey: adminKeys.users({ page, pageSize, search, isActive, isVerified, role }),
    queryFn: () => getAdminUsers(page, pageSize, search, isActive, isVerified, role),
    staleTime: 15_000,
  });
}

export function useDeactivateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => deactivateUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin"] });
    },
  });
}

export function useActivateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => activateUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin"] });
    },
  });
}

export function useChangeUserRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: string }) =>
      changeUserRole(userId, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin"] });
    },
  });
}

export function useVerifyUserManually() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => verifyUserManually(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin"] });
    },
  });
}

/* ── Posts ──────────────────────────────────────────── */

export function useHidePost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (postId: string) => hidePost(postId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin"] });
    },
  });
}

export function useRestorePost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (postId: string) => restorePost(postId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin"] });
    },
  });
}
