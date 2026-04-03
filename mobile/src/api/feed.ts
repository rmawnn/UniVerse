import api from "./client";
import type { PaginatedResponse, PaginationParams, PostResponse } from "../types/api";

export async function getHomeFeed(
  params?: PaginationParams
): Promise<PaginatedResponse<PostResponse>> {
  const { data } = await api.get<PaginatedResponse<PostResponse>>("/feed", { params });
  return data;
}
