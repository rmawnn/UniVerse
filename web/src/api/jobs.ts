import api from "@/lib/api-client";
import type {
  PaginatedResponse,
  PaginationParams,
  JobPostResponse,
  CreateJobRequest,
  JobApplyRequest,
  JobApplicationResponse,
  MyApplicationResponse,
} from "@/types/api";

// ── Job posts ──────────────────────────────────────────────

export async function listJobs(
  params?: PaginationParams
): Promise<PaginatedResponse<JobPostResponse>> {
  const { data } = await api.get<PaginatedResponse<JobPostResponse>>(
    "/jobs",
    { params }
  );
  return data;
}

export async function getJob(jobId: string): Promise<JobPostResponse> {
  const { data } = await api.get<JobPostResponse>(`/jobs/${jobId}`);
  return data;
}

export async function createJob(
  body: CreateJobRequest
): Promise<JobPostResponse> {
  const { data } = await api.post<JobPostResponse>("/jobs", body);
  return data;
}

export async function deleteJob(jobId: string): Promise<void> {
  await api.delete(`/jobs/${jobId}`);
}

// ── Applications ───────────────────────────────────────────

export async function applyToJob(
  jobId: string,
  body: JobApplyRequest
): Promise<JobApplicationResponse> {
  const { data } = await api.post<JobApplicationResponse>(
    `/jobs/${jobId}/apply`,
    body
  );
  return data;
}

export async function listJobApplications(
  jobId: string,
  params?: PaginationParams
): Promise<PaginatedResponse<JobApplicationResponse>> {
  const { data } = await api.get<PaginatedResponse<JobApplicationResponse>>(
    `/jobs/${jobId}/applications`,
    { params }
  );
  return data;
}

export async function listMyApplications(
  params?: PaginationParams
): Promise<PaginatedResponse<MyApplicationResponse>> {
  const { data } = await api.get<PaginatedResponse<MyApplicationResponse>>(
    "/jobs/my-applications",
    { params }
  );
  return data;
}
