import api from "./client";

/* ── Types ────────────────────────────────────────────── */

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

/* ── API calls ────────────────────────────────────────── */

/**
 * Upload a CV file (PDF or DOCX, max 10 MB).
 * Returns the storage path to attach to an application.
 *
 * @param file - The File to upload
 * @param onProgress - Callback with progress percentage (0-100)
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

/**
 * Apply to a job post with optional cover message and CV.
 */
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
  const base = api.defaults.baseURL ?? "http://localhost:8000/api/v1";
  return `${base}/jobs/applications/${applicationId}/cv`;
}
