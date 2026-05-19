import api from "@/lib/api-client";

// ── Types ───────────────────────────────────────────────────

export interface ReportCreateRequest {
  target_type: "post" | "comment" | "community" | "job" | "user";
  target_id: string;
  reason: string;
}

export interface ReportResponse {
  id: string;
  reporter_id: string;
  target_type: string;
  target_id: string;
  reason: string;
  status: string;
  created_at: string;
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

// ── User endpoint ───────────────────────────────────────────

export async function createReport(
  data: ReportCreateRequest,
): Promise<ReportResponse> {
  const { data: res } = await api.post<ReportResponse>("/reports", data);
  return res;
}

// ── Admin endpoints ─────────────────────────────────────────

export async function listReports(params: {
  page?: number;
  page_size?: number;
  status?: string;
  target_type?: string;
}): Promise<{ items: AdminReport[]; total: number; page: number; page_size: number; total_pages: number }> {
  const { data } = await api.get("/admin/reports", { params });
  return data;
}

export async function updateReportStatus(
  reportId: string,
  status: string,
): Promise<AdminReport> {
  const { data } = await api.patch<AdminReport>(
    `/admin/reports/${reportId}/status`,
    { status },
  );
  return data;
}
