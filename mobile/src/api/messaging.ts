import api from "./client";
import type {
  PaginatedResponse,
  PaginationParams,
  ConversationResponse,
  MessageResponse,
  CreateConversationRequest,
  SendMessageRequest,
} from "../types/api";

export async function createConversation(
  body: CreateConversationRequest
): Promise<ConversationResponse> {
  const { data } = await api.post<ConversationResponse>("/conversations", body);
  return data;
}

export async function listConversations(
  params?: PaginationParams
): Promise<PaginatedResponse<ConversationResponse>> {
  const { data } = await api.get<PaginatedResponse<ConversationResponse>>(
    "/conversations",
    { params }
  );
  return data;
}

export async function sendMessage(
  conversationId: string,
  body: SendMessageRequest
): Promise<MessageResponse> {
  const { data } = await api.post<MessageResponse>(
    `/conversations/${conversationId}/messages`,
    body
  );
  return data;
}

export async function listMessages(
  conversationId: string,
  params?: PaginationParams
): Promise<PaginatedResponse<MessageResponse>> {
  const { data } = await api.get<PaginatedResponse<MessageResponse>>(
    `/conversations/${conversationId}/messages`,
    { params }
  );
  return data;
}
