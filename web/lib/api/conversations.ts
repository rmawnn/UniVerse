import api from "./client";

/* ── Types ────────────────────────────────────────────── */

export interface ParticipantSummary {
  id: string;
  username: string;
  full_name: string;
  profile_image_url: string | null;
}

export interface MessageSummary {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
}

export interface ConversationResponse {
  id: string;
  participants: ParticipantSummary[];
  last_message: MessageSummary | null;
  unread_count: number;
  created_at: string;
}

export interface MessageResponse {
  id: string;
  conversation_id: string;
  sender: ParticipantSummary;
  content: string;
  created_at: string;
}

export interface PaginatedMessages {
  items: MessageResponse[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface PaginatedConversations {
  items: ConversationResponse[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

/* ── API calls ────────────────────────────────────────── */

export async function getConversations(
  page = 1,
  pageSize = 50,
): Promise<PaginatedConversations> {
  const res = await api.get<PaginatedConversations>("/conversations", {
    params: { page, page_size: pageSize },
  });
  return res.data;
}

export async function getMessages(
  conversationId: string,
  page = 1,
  pageSize = 50,
): Promise<PaginatedMessages> {
  const res = await api.get<PaginatedMessages>(
    `/conversations/${conversationId}/messages`,
    { params: { page, page_size: pageSize } },
  );
  return res.data;
}

export async function sendMessage(
  conversationId: string,
  content: string,
): Promise<MessageResponse> {
  const res = await api.post<MessageResponse>(
    `/conversations/${conversationId}/messages`,
    { content },
  );
  return res.data;
}

export async function createConversation(
  participantId: string,
): Promise<ConversationResponse> {
  const res = await api.post<ConversationResponse>("/conversations", {
    participant_id: participantId,
  });
  return res.data;
}

export async function markConversationRead(
  conversationId: string,
): Promise<void> {
  await api.post(`/conversations/${conversationId}/read`);
}
