import api from "@/lib/api-client";
import type { PaginatedResponse } from "@/types/api";

export interface AdminUser {
  id: string;
  username: string;
  email: string;
  full_name: string;
  is_active: boolean;
  is_verified_student: boolean;
  role: string;
  created_at: string;
}

export async function listUsers(
  page: number = 1,
  pageSize: number = 50
): Promise<PaginatedResponse<AdminUser>> {
  const { data } = await api.get<PaginatedResponse<AdminUser>>("/admin/users", {
    params: { page, page_size: pageSize },
  });
  return data;
}

export async function deactivateUser(userId: string): Promise<AdminUser> {
  const { data } = await api.patch<AdminUser>(
    `/admin/users/${userId}/deactivate`
  );
  return data;
}

export async function activateUser(userId: string): Promise<AdminUser> {
  const { data } = await api.patch<AdminUser>(
    `/admin/users/${userId}/activate`
  );
  return data;
}
