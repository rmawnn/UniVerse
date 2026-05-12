import api from "@/lib/api-client";
import type { ExploreResponse } from "@/types/api";

export async function getExplore(): Promise<ExploreResponse> {
  const { data } = await api.get<ExploreResponse>("/explore");
  return data;
}
