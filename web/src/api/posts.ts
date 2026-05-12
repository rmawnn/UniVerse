import api from "@/lib/api-client";
import type {
  PaginatedResponse,
  PaginationParams,
  PostResponse,
  CommentResponse,
  CreatePostRequest,
  CreateCommentRequest,
  LikeToggleResponse,
  SaveToggleResponse,
} from "@/types/api";

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
  const { data } = await api.post<LikeToggleResponse>(
    `/posts/${postId}/like`
  );
  return data;
}

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

export async function listUserPosts(
  userId: string,
  params?: PaginationParams
): Promise<PaginatedResponse<PostResponse>> {
  const { data } = await api.get<PaginatedResponse<PostResponse>>(
    `/users/${userId}/posts`,
    { params }
  );
  return data;
}

export async function listCommunityPosts(
  communityId: string,
  params?: PaginationParams
): Promise<PaginatedResponse<PostResponse>> {
  const { data } = await api.get<PaginatedResponse<PostResponse>>(
    `/communities/${communityId}/posts`,
    { params }
  );
  return data;
}

export async function savePost(
  postId: string
): Promise<SaveToggleResponse> {
  const { data } = await api.post<SaveToggleResponse>(
    `/posts/${postId}/save`
  );
  return data;
}

export async function unsavePost(
  postId: string
): Promise<SaveToggleResponse> {
  const { data } = await api.delete<SaveToggleResponse>(
    `/posts/${postId}/save`
  );
  return data;
}

export async function listSavedPosts(
  params?: PaginationParams
): Promise<PaginatedResponse<PostResponse>> {
  const { data } = await api.get<PaginatedResponse<PostResponse>>(
    "/users/me/saved-posts",
    { params }
  );
  return data;
}

export async function listShorts(
  params?: PaginationParams
): Promise<PaginatedResponse<PostResponse>> {
  const { data } = await api.get<PaginatedResponse<PostResponse>>(
    "/shorts",
    { params }
  );
  return data;
}
