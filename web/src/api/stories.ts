import api from "@/lib/api-client";
import type { StoryResponse, UserStoriesResponse } from "@/types/api";

export async function createStory(body: {
  image_url: string;
}): Promise<StoryResponse> {
  const { data } = await api.post<StoryResponse>("/stories", body);
  return data;
}

export async function listStories(): Promise<UserStoriesResponse[]> {
  const { data } = await api.get<UserStoriesResponse[]>("/stories");
  return data;
}

export async function getUserStories(
  userId: string
): Promise<UserStoriesResponse> {
  const { data } = await api.get<UserStoriesResponse>(`/stories/${userId}`);
  return data;
}
