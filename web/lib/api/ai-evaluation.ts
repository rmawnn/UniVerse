import api from "./client";

/* ── Response types ─────────────────────────────────── */

export interface PerCategoryMetrics {
  precision: number;
  recall: number;
  f1: number;
  support: number;
}

export interface CategorizationEval {
  status: string;
  accuracy: number | null;
  macro_f1: number | null;
  dataset_size: number | null;
  per_category: Record<string, PerCategoryMetrics> | null;
  confusion_matrix: Record<string, Record<string, number>> | null;
}

export interface CommunityRecEval {
  status: string;
  dataset_size: number | null;
  precision_at_3: number | null;
  ndcg_at_3: number | null;
  mrr: number | null;
  num_scenarios: number | null;
}

export interface TierStats {
  count: number;
  mean: number;
  min: number;
  max: number;
}

export interface JobMatchEval {
  status: string;
  dataset_size: number | null;
  skill_extraction_accuracy: number | null;
  tier_accuracy: number | null;
  ranking_accuracy: number | null;
  tier_stats: Record<string, TierStats> | null;
}

export interface LoRAEval {
  model_name: string;
  adapter: string;
  train_examples: number;
  eval_examples: number;
  dataset_ready: boolean;
  training_status: string;
  evaluation_status: string;
  epochs?: number;
  train_loss?: number;
  eval_loss?: number;
  eval_token_accuracy?: number;
  train_runtime_sec?: number;
  train_samples?: number;
  eval_samples?: number;
  base_accuracy?: number;
  finetuned_accuracy?: number;
}

export interface AIEvaluationResponse {
  categorization: CategorizationEval;
  community_recommendation: CommunityRecEval;
  job_matching: JobMatchEval;
  lora: LoRAEval;
}

/* ── API call ───────────────────────────────────────── */

export async function getAIEvaluation(): Promise<AIEvaluationResponse> {
  const res = await api.get<AIEvaluationResponse>("/ai/evaluation", {
    timeout: 60_000,
  });
  return res.data;
}
