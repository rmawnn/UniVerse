import api from "./client";
import type { FeedPost, PaginatedResponse, PostAuthorSummary } from "./feed";

/* ── Comment shapes ──────────────────────────────────────── */

export interface CommentResponse {
  id: string;
  post_id: string;
  author: PostAuthorSummary;
  content: string;
  parent_comment_id: string | null;
  reply_count: number;
  replies: CommentResponse[];
  created_at: string;
  updated_at: string;
}

export interface PostLikeToggleResponse {
  liked: boolean;
  like_count: number;
}

export interface RepostToggleResponse {
  reposted: boolean;
  repost_count: number;
}

/* ── Create post ────────────────────────────────────────── */

export interface CreatePostRequest {
  content: string;
  image_url?: string | null;
  video_url?: string | null;
  post_type?: string;
  poll_options?: string[];
}

export interface VoteResponse {
  voted_option_id: string;
  total_votes: number;
}

export async function createPost(
  communityId: string,
  data: CreatePostRequest,
): Promise<FeedPost> {
  const res = await api.post<FeedPost>(
    `/communities/${communityId}/posts`,
    data,
  );
  return res.data;
}

/* ── Upload image ───────────────────────────────────────── */

export async function uploadPostImage(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await api.post<{ url: string }>("/uploads/image", formData, {
    headers: { "Content-Type": "multipart/form-data" },
    timeout: 30_000,
  });
  return res.data.url;
}

/* ── API calls ───────────────────────────────────────────── */

export async function getPost(id: string): Promise<FeedPost> {
  const res = await api.get<FeedPost>(`/posts/${id}`);
  return res.data;
}

export async function getCommunityPosts(
  communityId: string,
  page = 1,
  pageSize = 20,
): Promise<PaginatedResponse<FeedPost>> {
  const res = await api.get<PaginatedResponse<FeedPost>>(
    `/communities/${communityId}/posts`,
    { params: { page, page_size: pageSize } },
  );
  return res.data;
}

export async function toggleLike(
  postId: string,
): Promise<PostLikeToggleResponse> {
  const res = await api.post<PostLikeToggleResponse>(`/posts/${postId}/like`);
  return res.data;
}

export async function toggleRepost(
  postId: string,
): Promise<RepostToggleResponse> {
  const res = await api.post<RepostToggleResponse>(`/posts/${postId}/repost`);
  return res.data;
}

export async function getComments(
  postId: string,
  page = 1,
  pageSize = 50,
): Promise<PaginatedResponse<CommentResponse>> {
  const res = await api.get<PaginatedResponse<CommentResponse>>(
    `/posts/${postId}/comments`,
    { params: { page, page_size: pageSize } },
  );
  return res.data;
}

export async function votePoll(
  postId: string,
  optionId: string,
): Promise<VoteResponse> {
  const res = await api.post<VoteResponse>(`/posts/${postId}/vote`, {
    option_id: optionId,
  });
  return res.data;
}

export async function unvotePoll(postId: string): Promise<void> {
  await api.delete(`/posts/${postId}/vote`);
}

export async function updatePost(
  postId: string,
  content: string,
): Promise<FeedPost> {
  const res = await api.patch<FeedPost>(`/posts/${postId}`, { content });
  return res.data;
}

export async function deletePost(postId: string): Promise<void> {
  await api.delete(`/posts/${postId}`);
}

export async function createComment(
  postId: string,
  content: string,
  parentCommentId?: string,
): Promise<CommentResponse> {
  const res = await api.post<CommentResponse>(`/posts/${postId}/comments`, {
    content,
    parent_comment_id: parentCommentId ?? null,
  });
  return res.data;
}
