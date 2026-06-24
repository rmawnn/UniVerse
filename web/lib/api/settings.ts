import api from "./client";
import type { MyProfileResponse } from "./auth";

/* ── Request shapes ─────────────────────────────────────────── */

export interface UpdateProfileRequest {
  full_name?: string;
  bio?: string;
  profile_image_url?: string;
  department?: string;
  academic_year?: number;
  skills?: string[];
}

export interface ChangePasswordRequest {
  current_password: string;
  new_password: string;
}

export interface NotificationSettingsUpdateRequest {
  notify_job_applications?: boolean;
  notify_new_jobs?: boolean;
}

/* ── Response shapes ────────────────────────────────────────── */

export interface SuccessResponse {
  message: string;
}

export interface NotificationSettingsResponse {
  notify_job_applications: boolean;
  notify_new_jobs: boolean;
}

/* ── API calls ──────────────────────────────────────────────── */

export async function uploadAvatar(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await api.post<{ url: string }>("/uploads/avatar", formData, {
    headers: { "Content-Type": "multipart/form-data" },
    timeout: 30_000,
  });
  return res.data.url;
}

export async function updateProfile(
  data: UpdateProfileRequest,
): Promise<MyProfileResponse> {
  const res = await api.patch<MyProfileResponse>("/users/me", data);
  return res.data;
}

export async function changePassword(
  data: ChangePasswordRequest,
): Promise<SuccessResponse> {
  const res = await api.patch<SuccessResponse>("/users/me/password", data);
  return res.data;
}

export async function getNotificationSettings(): Promise<NotificationSettingsResponse> {
  const res = await api.get<NotificationSettingsResponse>(
    "/users/me/notification-settings",
  );
  return res.data;
}

export async function updateNotificationSettings(
  data: NotificationSettingsUpdateRequest,
): Promise<NotificationSettingsResponse> {
  const res = await api.patch<NotificationSettingsResponse>(
    "/users/me/notification-settings",
    data,
  );
  return res.data;
}
