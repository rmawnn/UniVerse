import api from "./client";

/* ── Demo categorization ──────────────────────────────── */

export interface DemoCategorizationResponse {
  category: string;
  provider: string;
}

export async function demoCategorize(
  text: string,
): Promise<DemoCategorizationResponse> {
  const res = await api.post<DemoCategorizationResponse>(
    "/ai/demo/categorize",
    { text },
  );
  return res.data;
}
