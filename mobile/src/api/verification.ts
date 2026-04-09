import api from "./client";
import type {
  SendVerificationRequest,
  ConfirmVerificationRequest,
  VerificationSendResponse,
  VerificationConfirmResponse,
} from "../types/api";

export async function sendVerificationCode(
  body: SendVerificationRequest
): Promise<VerificationSendResponse> {
  const { data } = await api.post<VerificationSendResponse>(
    "/verification/send",
    body
  );
  return data;
}

export async function confirmVerificationCode(
  body: ConfirmVerificationRequest
): Promise<VerificationConfirmResponse> {
  const { data } = await api.post<VerificationConfirmResponse>(
    "/verification/confirm",
    body
  );
  return data;
}
