import api from "./client";
import type {
  PaginatedResponse,
  PaginationParams,
  PostResponse,
  CreatePostRequest,
  LikeToggleResponse,
  CommentResponse,
  CreateCommentRequest,
} from "../types/api";

// ── Posts ────────────────────────────────────────────────────

export async function listPosts(
  communityId: string,
  params?: PaginationParams
): Promise<PaginatedResponse<PostResponse>> {
  const { data } = await api.get<PaginatedResponse<PostResponse>>(
    `/communities/${communityId}/posts`,
    { params }
  );
  return data;
}

export async function getPost(postId: string): Promise<PostResponse> {
  const { data } = await api.get<PostResponse>(`/posts/${postId}`);
  return data;
}

export async function createPost(
  communityId: string,
  body: CreatePostRequest
): Promise<PostResponse> {
  const { data } = await api.post<PostResponse>(
    `/communities/${communityId}/posts`,
    body
  );
  return data;
}

export async function toggleLike(postId: string): Promise<LikeToggleResponse> {
  const { data } = await api.post<LikeToggleResponse>(`/posts/${postId}/like`);
  return data;
}

// ── Comments ────────────────────────────────────────────────

export async function listComments(
  postId: string,
  params?: PaginationParams
): Promise<PaginatedResponse<CommentResponse>> {
  const { data } = await api.get<PaginatedResponse<CommentResponse>>(
    `/posts/${postId}/comments`,
    { params }
  );
  return data;
}

export async function createComment(
  postId: string,
  body: CreateCommentRequest
): Promise<CommentResponse> {
  const { data } = await api.post<CommentResponse>(
    `/posts/${postId}/comments`,
    body
  );
  return data;
}
