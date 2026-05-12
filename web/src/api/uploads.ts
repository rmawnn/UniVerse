import api from "@/lib/api-client";

export interface UploadResponse {
  url: string;
}

/**
 * Upload a single image file.
 * Returns the URL path to the uploaded file.
 */
export async function uploadImage(file: File): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append("file", file);

  const { data } = await api.post<UploadResponse>("/uploads/image", formData, {
    headers: { "Content-Type": "multipart/form-data" },
    timeout: 30_000,
  });
  return data;
}

/**
 * Upload a single video file (mp4/webm, max 20 MB).
 * Returns the URL path to the uploaded file.
 */
export async function uploadVideo(file: File): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append("file", file);

  const { data } = await api.post<UploadResponse>("/uploads/video", formData, {
    headers: { "Content-Type": "multipart/form-data" },
    timeout: 60_000,
  });
  return data;
}
