// ── Pagination ──────────────────────────────────────────────

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface PaginationParams {
  page?: number;
  page_size?: number;
}

// ── Auth ────────────────────────────────────────────────────

export interface RegisterRequest {
  email: string;
  password: string;
  full_name: string;
  username: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
}

// ── User ────────────────────────────────────────────────────

export interface AuthorSummary {
  id: string;
  username: string;
  full_name: string;
  profile_image_url: string | null;
}

export interface UserResponse {
  id: string;
  email: string;
  username: string;
  full_name: string;
  university_id: string | null;
  department: string | null;
  academic_year: number | null;
  bio: string | null;
  profile_image_url: string | null;
  is_active: boolean;
  is_verified_student: boolean;
  role: string;
  created_at: string;
  updated_at: string;
}

export interface UserSearchResult {
  id: string;
  username: string;
  full_name: string;
  profile_image_url: string | null;
  is_verified_student: boolean;
}

// ── Community ───────────────────────────────────────────────

export interface CommunityResponse {
  id: string;
  name: string;
  description: string | null;
  university_id: string;
  created_by: string;
  is_public: boolean;
  member_count: number;
  created_at: string;
  updated_at: string;
}

export interface CommunityDetailResponse extends CommunityResponse {
  is_member: boolean;
  my_role: string | null;
}

export interface CreateCommunityRequest {
  name: string;
  description?: string;
  is_public?: boolean;
}

export interface UpdateCommunityRequest {
  name?: string;
  description?: string;
  is_public?: boolean;
}

export interface CommunitySearchResult extends CommunityResponse {
  is_member: boolean | null;
}

export interface CommunityMemberResponse {
  user_id: string;
  username: string;
  full_name: string;
  profile_image_url: string | null;
  role: string;
  joined_at: string;
}

export interface ExploreCommunityResponse {
  id: string;
  name: string;
  description: string | null;
  member_count: number;
  is_member: boolean | null;
}

// ── Post ────────────────────────────────────────────────────

export interface PostResponse {
  id: string;
  community_id: string;
  author: AuthorSummary;
  content: string;
  image_url: string | null;
  like_count: number;
  comment_count: number;
  liked_by_me: boolean;
  created_at: string;
  updated_at: string;
}

// ── Comment ────────────────────────────────────────────────

export interface CommentResponse {
  id: string;
  post_id: string;
  author: AuthorSummary;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface CreatePostRequest {
  content: string;
  image_url?: string;
}

export interface CreateCommentRequest {
  content: string;
}

export interface LikeToggleResponse {
  liked: boolean;
  like_count: number;
}

// ── Notification ────────────────────────────────────────────

export interface NotificationActorSummary {
  id: string;
  username: string;
  full_name: string;
  profile_image_url: string | null;
}

export interface NotificationResponse {
  id: string;
  type: string;
  reference_id: string | null;
  actor: NotificationActorSummary | null;
  content: string;
  is_read: boolean;
  created_at: string;
}

// ── Messaging ───────────────────────────────────────────────

export interface MessageSummary {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
}

export interface MessageResponse {
  id: string;
  conversation_id: string;
  sender: AuthorSummary;
  content: string;
  created_at: string;
}

export interface ConversationResponse {
  id: string;
  participants: AuthorSummary[];
  last_message: MessageSummary | null;
  created_at: string;
}

export interface CreateConversationRequest {
  participant_id: string;
}

export interface SendMessageRequest {
  content: string;
}

// ── Notifications ───────────────────────────────────────────

export interface MarkReadResponse {
  success: boolean;
  unread_count: number;
}

// ── Public profiles ─────────────────────────────────────────

export interface CommunitySummary {
  id: string;
  name: string;
}

export interface PublicUserProfile {
  id: string;
  username: string;
  full_name: string;
  profile_image_url: string | null;
  bio: string | null;
  department: string | null;
  academic_year: number | null;
  university_id: string | null;
  university_name: string | null;
  is_verified_student: boolean;
  communities: CommunitySummary[];
  created_at: string;
}
