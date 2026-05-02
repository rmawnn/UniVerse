import api from "@/lib/api-client";

export interface VerificationSendResponse {
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

export interface VerificationStatusResponse {
  is_verified_student: boolean;
  university_id: string | null;
  university_name: string | null;
  university_email: string | null;
  verification_status: string | null;
  verified_at: string | null;
}

export async function sendVerificationCode(
  universityEmail: string
): Promise<VerificationSendResponse> {
  const { data } = await api.post<VerificationSendResponse>(
    "/verification/send",
    { university_email: universityEmail }
  );
  return data;
}

export async function confirmVerificationCode(
  universityEmail: string,
  verificationCode: string
): Promise<VerificationConfirmResponse> {
  const { data } = await api.post<VerificationConfirmResponse>(
    "/verification/confirm",
    { university_email: universityEmail, verification_code: verificationCode }
  );
  return data;
}

export async function getVerificationStatus(): Promise<VerificationStatusResponse> {
  const { data } = await api.get<VerificationStatusResponse>(
    "/verification/status"
  );
  return data;
}
