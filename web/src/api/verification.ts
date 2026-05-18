import api from "@/lib/api-client";

// ── Types ───────────────────────────────────────────────────

export interface VerificationSendResponse {
  verification_id: string;
  message: string;
  status: string;
  expires_at: string;
  debug_code: string | null;
}

export interface VerificationConfirmResponse {
  message: string;
  status: string;
  university_name: string;
}

export interface DocumentVerificationResponse {
  verification_id: string;
  message: string;
  status: string;
}

export interface VerificationStatusResponse {
  is_verified_student: boolean;
  university_id: string | null;
  university_name: string | null;
  verification_method: string | null;
  verification_status: string | null;
  university_email: string | null;
  document_url: string | null;
  rejection_reason: string | null;
  verified_at: string | null;
}

export interface University {
  id: string;
  name: string;
  domain: string;
  country: string | null;
  logo_url: string | null;
}

// ── Email verification ──────────────────────────────────────

export async function sendVerificationCode(
  universityEmail: string
): Promise<VerificationSendResponse> {
  const { data } = await api.post<VerificationSendResponse>(
    "/verification/email/send",
    { university_email: universityEmail }
  );
  return data;
}

export async function confirmVerificationCode(
  verificationId: string,
  code: string
): Promise<VerificationConfirmResponse> {
  const { data } = await api.post<VerificationConfirmResponse>(
    "/verification/email/confirm",
    { verification_id: verificationId, code }
  );
  return data;
}

// ── Document verification ───────────────────────────────────

export async function submitDocumentVerification(
  universityId: string,
  document: File
): Promise<DocumentVerificationResponse> {
  const formData = new FormData();
  formData.append("university_id", universityId);
  formData.append("document", document);

  const { data } = await api.post<DocumentVerificationResponse>(
    "/verification/document",
    formData,
    { headers: { "Content-Type": "multipart/form-data" } }
  );
  return data;
}

// ── Status ──────────────────────────────────────────────────

export async function getVerificationStatus(): Promise<VerificationStatusResponse> {
  const { data } = await api.get<VerificationStatusResponse>(
    "/verification/status"
  );
  return data;
}

// ── Universities ────────────────────────────────────────────

export async function listUniversities(): Promise<University[]> {
  const { data } = await api.get<{ items: University[] }>(
    "/universities",
    { params: { page: 1, page_size: 100 } }
  );
  return data.items;
}
