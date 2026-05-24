import api from "./client";
import type { PaginatedResponse } from "./feed";

/* ── Response shapes ────────────────────────────────────────── */

export interface NotificationActorSummary {
  id: string;
  username: string;
  full_name: string;
  profile_image_url: string | null;
}

export interface NotificationResponse {
  id: string;
  type: string;
  reference_id: string | null;
  actor: NotificationActorSummary | null;
  content: string;
  is_read: boolean;
  created_at: string;
}

export interface NotificationMarkReadResponse {
  success: boolean;
  unread_count: number;
}

/* ── API calls ──────────────────────────────────────────────── */

export async function getNotifications(
  page = 1,
  pageSize = 30,
): Promise<PaginatedResponse<NotificationResponse>> {
  const res = await api.get<PaginatedResponse<NotificationResponse>>(
    "/notifications",
    { params: { page, page_size: pageSize } },
  );
  return res.data;
}

export async function markNotificationRead(
  id: string,
): Promise<NotificationMarkReadResponse> {
  const res = await api.patch<NotificationMarkReadResponse>(
    `/notifications/${id}/read`,
  );
  return res.data;
}

export async function markAllNotificationsRead(): Promise<NotificationMarkReadResponse> {
  const res = await api.patch<NotificationMarkReadResponse>(
    "/notifications/read-all",
  );
  return res.data;
}
