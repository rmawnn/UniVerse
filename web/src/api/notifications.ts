import api from "@/lib/api-client";
import type {
  PaginatedResponse,
  PaginationParams,
  NotificationResponse,
  MarkReadResponse,
} from "@/types/api";

export async function listNotifications(
  params?: PaginationParams
): Promise<PaginatedResponse<NotificationResponse>> {
  const { data } = await api.get<PaginatedResponse<NotificationResponse>>(
    "/notifications",
    { params }
  );
  return data;
}

export async function markAsRead(
  notificationId: string
): Promise<MarkReadResponse> {
  const { data } = await api.patch<MarkReadResponse>(
    `/notifications/${notificationId}/read`
  );
  return data;
}

export async function markAllAsRead(): Promise<MarkReadResponse> {
  const { data } = await api.patch<MarkReadResponse>(
    "/notifications/read-all"
  );
  return data;
}
