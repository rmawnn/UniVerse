"use client";

import { useState } from "react";
import { Sparkles, ChevronDown, ChevronUp, Check, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getJobMatch } from "@/lib/api/recommendations";
import { Card } from "@/components/ui/Card";

function scoreColor(score: number): string {
  if (score >= 75) return "text-success";
  if (score >= 50) return "text-warn";
  return "text-fg-3";
}

function scoreBg(score: number): string {
  if (score >= 75) return "bg-success/12 border-success/25";
  if (score >= 50) return "bg-warn/12 border-warn/25";
  return "bg-bg-3 border-line-2";
}

export function JobMatchBadge({ jobId }: { jobId: string }) {
  const [expanded, setExpanded] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["ai", "job-match", jobId],
    queryFn: () => getJobMatch(jobId),
    staleTime: 10 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-line-1 bg-bg-2 px-3 py-2.5">
        <div className="h-4 w-4 animate-pulse rounded bg-bg-3" />
        <div className="h-3.5 w-28 animate-pulse rounded bg-bg-3" />
      </div>
    );
  }

  if (isError || !data) return null;

  const { score, strengths, missing_skills, factors } = data;

  return (
    <Card padded={false} className={`border ${scoreBg(score)} overflow-hidden`}>
      {/* Header row */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center gap-2.5 px-4 py-3 text-left"
      >
        <Sparkles className={`h-4 w-4 shrink-0 ${scoreColor(score)}`} />
        <div className="min-w-0 flex-1">
          <span className="text-[13.5px] font-semibold">
            Match Score:{" "}
            <span className={scoreColor(score)}>{score}%</span>
          </span>
          <span className="ml-2 text-[11.5px] text-fg-3">
            AI-powered match
          </span>
        </div>
        {expanded ? (
          <ChevronUp className="h-4 w-4 shrink-0 text-fg-3" />
        ) : (
          <ChevronDown className="h-4 w-4 shrink-0 text-fg-3" />
        )}
      </button>

      {/* Expandable detail */}
      {expanded && (
        <div className="border-t border-line-1 px-4 py-3 text-[12.5px]">
          {/* Strengths */}
          {strengths.length > 0 && (
            <div className="mb-3">
              <div className="mb-1.5 font-semibold text-fg-2">
                Your strengths
              </div>
              <div className="flex flex-wrap gap-1.5">
                {strengths.map((s) => (
                  <span
                    key={s}
                    className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-[11px] font-medium text-success"
                  >
                    <Check className="h-3 w-3" />
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Missing skills */}
          {missing_skills.length > 0 && (
            <div className="mb-3">
              <div className="mb-1.5 font-semibold text-fg-2">
                Skills to develop
              </div>
              <div className="flex flex-wrap gap-1.5">
                {missing_skills.map((s) => (
                  <span
                    key={s}
                    className="inline-flex items-center gap-1 rounded-full bg-warn/10 px-2 py-0.5 text-[11px] font-medium text-warn"
                  >
                    <X className="h-3 w-3" />
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Factor breakdown */}
          <div>
            <div className="mb-1.5 font-semibold text-fg-2">
              Score breakdown
            </div>
            <div className="space-y-1.5">
              <FactorBar label="Skill overlap" value={factors.skill_overlap} />
              <FactorBar label="Keyword match" value={factors.keyword_overlap} />
              <FactorBar label="Community fit" value={factors.community_relevance} />
              <FactorBar label="University" value={factors.university_match} />
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}

function FactorBar({ label, value }: { label: string; value: number }) {
  const pct = Math.round(value * 100);
  return (
    <div className="flex items-center gap-2">
      <span className="w-24 shrink-0 text-[11.5px] text-fg-3">{label}</span>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-bg-3">
        <div
          className="h-full rounded-full bg-brand-purple transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-8 text-right text-[11px] font-medium text-fg-3">
        {pct}%
      </span>
    </div>
  );
}
