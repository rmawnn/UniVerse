"use client";

import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import {
  getAIEvaluation,
  type AIEvaluationResponse,
} from "@/lib/api/ai-evaluation";

export const aiEvalKeys = {
  evaluation: ["ai", "evaluation"] as const,
};

export function useAIEvaluation(
  options?: Partial<UseQueryOptions<AIEvaluationResponse>>,
) {
  return useQuery({
    queryKey: aiEvalKeys.evaluation,
    queryFn: getAIEvaluation,
    staleTime: 60_000,
    ...options,
  });
}
