import api from "./client";
import type { PaginatedResponse } from "./feed";

/* ── Types (matching backend schemas) ────────────────────── */

export type JobType = "internship" | "part-time" | "full-time" | "freelance";

export interface JobPostAuthorSummary {
  id: string;
  username: string;
  full_name: string;
  profile_image_url: string | null;
}

/** Full job post from GET /jobs and GET /jobs/{id}. */
export interface JobPostResponse {
  id: string;
  author: JobPostAuthorSummary;
  title: string;
  description: string;
  company_name: string | null;
  location: string | null;
  job_type: string;
  is_active: boolean;
  application_count: number;
  has_applied: boolean;
  saved_by_me: boolean;
  created_at: string;
  updated_at: string;
}

export interface SavedJobToggleResponse {
  saved: boolean;
}

export interface CvUploadResponse {
  url: string;
  filename: string;
  size: number;
}

export interface JobApplicationPayload {
  message?: string;
  cv_url?: string;
}

export interface JobApplicationResponse {
  id: string;
  job_id: string;
  applicant: {
    id: string;
    username: string;
    full_name: string;
    profile_image_url: string | null;
  };
  message: string | null;
  cv_url: string | null;
  status: string;
  created_at: string;
}

/* ── API calls ───────────────────────────────────────────── */

/** List active job posts with optional filters and search. */
export async function listJobs(opts: {
  page?: number;
  pageSize?: number;
  jobType?: string | null;
  location?: string | null;
  q?: string | null;
} = {}): Promise<PaginatedResponse<JobPostResponse>> {
  const params: Record<string, unknown> = {
    page: opts.page ?? 1,
    page_size: opts.pageSize ?? 20,
  };
  if (opts.jobType) params.job_type = opts.jobType;
  if (opts.location) params.location = opts.location;
  if (opts.q) params.q = opts.q;

  const res = await api.get<PaginatedResponse<JobPostResponse>>("/jobs", { params });
  return res.data;
}

/** Get a single job post by ID. */
export async function getJob(jobId: string): Promise<JobPostResponse> {
  const res = await api.get<JobPostResponse>(`/jobs/${jobId}`);
  return res.data;
}

/** Get personalized job recommendations. */
export async function listRecommendedJobs(
  limit = 5,
): Promise<JobPostResponse[]> {
  const res = await api.get<JobPostResponse[]>("/jobs/recommendations", {
    params: { limit },
  });
  return res.data;
}

/** List the current user's saved jobs. */
export async function listSavedJobs(
  page = 1,
  pageSize = 20,
): Promise<PaginatedResponse<JobPostResponse>> {
  const res = await api.get<PaginatedResponse<JobPostResponse>>(
    "/jobs/saved",
    { params: { page, page_size: pageSize } },
  );
  return res.data;
}

/** Save a job post. */
export async function saveJob(
  jobId: string,
): Promise<SavedJobToggleResponse> {
  const res = await api.post<SavedJobToggleResponse>(`/jobs/${jobId}/save`);
  return res.data;
}

/** Unsave a job post. */
export async function unsaveJob(
  jobId: string,
): Promise<SavedJobToggleResponse> {
  const res = await api.delete<SavedJobToggleResponse>(`/jobs/${jobId}/save`);
  return res.data;
}

/**
 * Upload a CV file (PDF or DOCX, max 10 MB).
 * Returns the storage path to attach to an application.
 */
export async function uploadCV(
  file: File,
  onProgress?: (pct: number) => void,
): Promise<CvUploadResponse> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await api.post<CvUploadResponse>("/uploads/cv", formData, {
    headers: { "Content-Type": "multipart/form-data" },
    onUploadProgress: (e) => {
      if (e.total && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    },
    timeout: 120_000, // 2 min for large files
  });

  return res.data;
}

/** Apply to a job post with optional cover message and CV. */
export async function applyToJob(
  jobId: string,
  data: JobApplicationPayload,
): Promise<JobApplicationResponse> {
  const res = await api.post<JobApplicationResponse>(
    `/jobs/${jobId}/apply`,
    data,
  );
  return res.data;
}

/**
 * Get a signed download URL for an applicant's CV.
 * Only available to the job owner (employer).
 */
export function getApplicationCvUrl(applicationId: string): string {
  const base = api.defaults.baseURL!;
  return `${base}/jobs/applications/${applicationId}/cv`;
}
