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
