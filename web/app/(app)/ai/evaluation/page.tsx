"use client";

import Link from "next/link";
import {
  ArrowLeft,
  Brain,
  CheckCircle,
  Clock,
  Loader2,
  RefreshCw,
  WifiOff,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useAIEvaluation } from "@/lib/hooks/useAIEvaluation";
import type {
  CategorizationEval,
  CommunityRecEval,
  JobMatchEval,
  LoRAEval,
  PerCategoryMetrics,
  TierStats,
} from "@/lib/api/ai-evaluation";
import { cn } from "@/lib/utils";

export default function AIEvaluationPage() {
  const { data, isLoading, isError, refetch } = useAIEvaluation();

  return (
    <AppShell
      topBar={{
        breadcrumb: "AI Systems",
        title: "Evaluation Metrics",
        action: (
          <Link
            href="/admin"
            className="inline-flex items-center gap-1.5 rounded-md border border-line-2 bg-bg-3 px-3 py-1.5 text-[12px] font-medium text-fg-2 hover:text-fg-1"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Admin Panel
          </Link>
        ),
      }}
    >
      <div className="px-4 py-6 sm:px-8">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-purple/15">
            <Brain className="h-5 w-5 text-brand-purple" />
          </div>
          <div>
            <h1 className="text-[20px] font-bold tracking-tighter">
              AI Evaluation Report
            </h1>
            <p className="text-[13px] text-fg-3">
              Quantitative metrics from offline evaluation datasets
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-7 w-7 animate-spin text-brand-purple" />
          </div>
        ) : isError || !data ? (
          <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-line-2 bg-bg-2/50 py-16">
            <WifiOff className="h-8 w-8 text-fg-4" />
            <p className="text-[14px] text-fg-2">
              Failed to load evaluation data
            </p>
            <Button
              variant="ghost"
              size="sm"
              icon={<RefreshCw className="h-3.5 w-3.5" />}
              onClick={() => refetch()}
            >
              Retry
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            <CategorizationCard data={data.categorization} />
            <div className="grid gap-6 lg:grid-cols-2">
              <CommunityRecCard data={data.community_recommendation} />
              <JobMatchCard data={data.job_matching} />
            </div>
            <LoRACard data={data.lora} />
          </div>
        )}
      </div>
    </AppShell>
  );
}

/* ── Helpers ────────────────────────────────────────── */

function MetricValue({
  value,
  format = "percent",
}: {
  value: number | null;
  format?: "percent" | "raw";
}) {
  if (value == null) return <span className="text-fg-4">--</span>;
  if (format === "percent")
    return <>{(value * 100).toFixed(1)}%</>;
  return <>{value}</>;
}

function MetricBar({
  label,
  value,
  color,
}: {
  label: string;
  value: number | null;
  color?: string;
}) {
  const pct = value != null ? value * 100 : 0;
  const barColor =
    color ??
    (value != null && value >= 0.8
      ? "bg-success"
      : value != null && value >= 0.5
        ? "bg-warn"
        : "bg-danger");

  return (
    <div className="flex items-center gap-3">
      <span className="w-[140px] shrink-0 text-[12.5px] text-fg-2">
        {label}
      </span>
      <div className="flex-1">
        <div className="h-2.5 overflow-hidden rounded-full bg-bg-3">
          <div
            className={cn("h-full rounded-full transition-all", barColor)}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
      <span className="w-14 text-right text-[12px] font-semibold tabular-nums text-fg-2">
        {value != null ? `${pct.toFixed(1)}%` : "--"}
      </span>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const isGood =
    status === "completed" || status === "ready";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold",
        isGood
          ? "border-success/28 bg-success/12 text-success"
          : "border-warn/28 bg-warn/12 text-warn",
      )}
    >
      {isGood ? (
        <CheckCircle className="h-3 w-3" />
      ) : (
        <Clock className="h-3 w-3" />
      )}
      <span className="capitalize">{status}</span>
    </span>
  );
}

function BigStat({
  value,
  label,
  format = "percent",
}: {
  value: number | null;
  label: string;
  format?: "percent" | "number";
}) {
  return (
    <div className="rounded-lg border border-line-1 bg-bg-2/50 p-3.5">
      <div className="text-[22px] font-bold tabular-nums tracking-tighter">
        {value != null
          ? format === "percent"
            ? `${(value * 100).toFixed(1)}%`
            : String(value)
          : "--"}
      </div>
      <div className="text-[12px] text-fg-3">{label}</div>
    </div>
  );
}

/* ── Cards ──────────────────────────────────────────── */

function CategorizationCard({ data }: { data: CategorizationEval }) {
  const categories = data.per_category
    ? Object.entries(data.per_category)
    : [];

  return (
    <Card>
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-[16px] font-bold tracking-tighter">
            Post Categorization
          </h2>
          <p className="mt-0.5 text-[12.5px] text-fg-3">
            8-class classification via Gemini LLM with rule-based fallback
          </p>
        </div>
        <StatusPill status={data.status} />
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <BigStat value={data.accuracy} label="Accuracy" />
        <BigStat value={data.macro_f1} label="Macro F1" />
        <BigStat
          value={data.dataset_size}
          label="Dataset size"
          format="number"
        />
      </div>

      {/* Per-category table */}
      {categories.length > 0 && (
        <div className="mt-5">
          <div className="mb-2 text-[12.5px] font-semibold text-fg-2">
            Per-category performance
          </div>
          <div className="overflow-x-auto rounded-lg border border-line-1">
            <table className="w-full text-[12.5px]">
              <thead>
                <tr className="border-b border-line-1 bg-bg-2/50 text-left text-[11px] font-semibold uppercase tracking-wider text-fg-4">
                  <th className="px-3 py-2">Category</th>
                  <th className="px-3 py-2 text-right">Precision</th>
                  <th className="px-3 py-2 text-right">Recall</th>
                  <th className="px-3 py-2 text-right">F1</th>
                  <th className="px-3 py-2 text-right">Support</th>
                </tr>
              </thead>
              <tbody>
                {categories.map(([cat, m]: [string, PerCategoryMetrics]) => (
                  <tr
                    key={cat}
                    className="border-b border-line-1 last:border-0"
                  >
                    <td className="px-3 py-2 font-medium capitalize text-fg-1">
                      {cat}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-fg-2">
                      <MetricValue value={m.precision} />
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-fg-2">
                      <MetricValue value={m.recall} />
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-fg-2">
                      <MetricValue value={m.f1} />
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-fg-3">
                      {m.support}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Confusion matrix */}
      {data.confusion_matrix && (
        <ConfusionMatrix matrix={data.confusion_matrix} />
      )}
    </Card>
  );
}

function ConfusionMatrix({
  matrix,
}: {
  matrix: Record<string, Record<string, number>>;
}) {
  const labels = Object.keys(matrix);

  return (
    <div className="mt-5">
      <div className="mb-2 text-[12.5px] font-semibold text-fg-2">
        Confusion matrix
      </div>
      <div className="overflow-x-auto rounded-lg border border-line-1">
        <table className="w-full text-[11px]">
          <thead>
            <tr className="border-b border-line-1 bg-bg-2/50">
              <th className="px-2 py-1.5 text-left text-[10px] font-semibold uppercase tracking-wider text-fg-4">
                Actual \ Predicted
              </th>
              {labels.map((l) => (
                <th
                  key={l}
                  className="px-2 py-1.5 text-center text-[10px] font-semibold capitalize text-fg-3"
                >
                  {l.slice(0, 5)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {labels.map((actual) => (
              <tr
                key={actual}
                className="border-b border-line-1 last:border-0"
              >
                <td className="px-2 py-1.5 font-medium capitalize text-fg-2">
                  {actual}
                </td>
                {labels.map((predicted) => {
                  const val = matrix[actual]?.[predicted] ?? 0;
                  const isDiagonal = actual === predicted;
                  return (
                    <td
                      key={predicted}
                      className={cn(
                        "px-2 py-1.5 text-center tabular-nums",
                        isDiagonal && val > 0
                          ? "font-semibold text-success"
                          : val > 0
                            ? "text-danger/80"
                            : "text-fg-4/40",
                      )}
                    >
                      {val}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CommunityRecCard({ data }: { data: CommunityRecEval }) {
  return (
    <Card>
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-[16px] font-bold tracking-tighter">
            Community Recommendation
          </h2>
          <p className="mt-0.5 text-[12.5px] text-fg-3">
            Multi-signal scoring algorithm
          </p>
        </div>
        <StatusPill status={data.status} />
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <BigStat
          value={data.dataset_size}
          label="Dataset size"
          format="number"
        />
        <BigStat
          value={data.num_scenarios}
          label="Eval scenarios"
          format="number"
        />
      </div>

      <div className="mt-5 space-y-2.5">
        <MetricBar
          label="Precision@3"
          value={data.precision_at_3}
          color="bg-brand-purple"
        />
        <MetricBar
          label="NDCG@3"
          value={data.ndcg_at_3}
          color="bg-brand-blue"
        />
        <MetricBar
          label="MRR"
          value={data.mrr}
          color="bg-[#10b981]"
        />
      </div>
    </Card>
  );
}

function JobMatchCard({ data }: { data: JobMatchEval }) {
  const tierEntries = data.tier_stats
    ? Object.entries(data.tier_stats)
    : [];

  return (
    <Card>
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-[16px] font-bold tracking-tighter">
            Job Matching
          </h2>
          <p className="mt-0.5 text-[12.5px] text-fg-3">
            Skill extraction + tier-based ranking
          </p>
        </div>
        <StatusPill status={data.status} />
      </div>

      <div className="mt-5">
        <BigStat
          value={data.dataset_size}
          label="Dataset size"
          format="number"
        />
      </div>

      <div className="mt-5 space-y-2.5">
        <MetricBar label="Skill Extraction" value={data.skill_extraction_accuracy} />
        <MetricBar label="Tier Accuracy" value={data.tier_accuracy} />
        <MetricBar label="Ranking Accuracy" value={data.ranking_accuracy} />
      </div>

      {tierEntries.length > 0 && (
        <div className="mt-5">
          <div className="mb-2 text-[12.5px] font-semibold text-fg-2">
            Tier statistics
          </div>
          <div className="overflow-x-auto rounded-lg border border-line-1">
            <table className="w-full text-[12.5px]">
              <thead>
                <tr className="border-b border-line-1 bg-bg-2/50 text-left text-[11px] font-semibold uppercase tracking-wider text-fg-4">
                  <th className="px-3 py-2">Tier</th>
                  <th className="px-3 py-2 text-right">Count</th>
                  <th className="px-3 py-2 text-right">Mean Score</th>
                  <th className="px-3 py-2 text-right">Range</th>
                </tr>
              </thead>
              <tbody>
                {tierEntries.map(([tier, s]: [string, TierStats]) => (
                  <tr
                    key={tier}
                    className="border-b border-line-1 last:border-0"
                  >
                    <td className="px-3 py-2 font-medium capitalize text-fg-1">
                      {tier}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-fg-2">
                      {s.count}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-fg-2">
                      {s.mean.toFixed(1)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-fg-2">
                      {s.min}–{s.max}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Card>
  );
}

function LoRACard({ data }: { data: LoRAEval }) {
  const hasComparison =
    data.base_accuracy != null && data.finetuned_accuracy != null;
  const improvement =
    hasComparison
      ? ((data.finetuned_accuracy! - data.base_accuracy!) * 100).toFixed(1)
      : null;

  return (
    <Card>
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-[16px] font-bold tracking-tighter">
            QLoRA Fine-Tuning
          </h2>
          <p className="mt-0.5 text-[12.5px] text-fg-3">
            {data.model_name} &middot; {data.adapter}
          </p>
        </div>
        <StatusPill
          status={data.dataset_ready ? "completed" : "pending"}
        />
      </div>

      {/* Before / After comparison */}
      {hasComparison && (
        <div className="mt-5 rounded-xl border border-brand-purple/20 bg-brand-purple/[0.04] p-4">
          <div className="mb-3 text-[12.5px] font-semibold text-fg-2">
            Accuracy: Base vs Fine-Tuned
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-fg-4">
                Before
              </div>
              <div className="mt-1 text-[26px] font-bold tabular-nums tracking-tighter text-fg-3">
                {(data.base_accuracy! * 100).toFixed(1)}%
              </div>
            </div>
            <div className="flex items-center justify-center">
              <div className="rounded-full border border-success/30 bg-success/12 px-3 py-1 text-[13px] font-bold text-success">
                +{improvement}%
              </div>
            </div>
            <div className="text-center">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-fg-4">
                After
              </div>
              <div className="mt-1 text-[26px] font-bold tabular-nums tracking-tighter text-success">
                {(data.finetuned_accuracy! * 100).toFixed(1)}%
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Training stats */}
      <div className="mt-5 grid gap-3 sm:grid-cols-4">
        <BigStat
          value={data.train_samples ?? data.train_examples}
          label="Train samples"
          format="number"
        />
        <BigStat
          value={data.eval_samples ?? data.eval_examples}
          label="Eval samples"
          format="number"
        />
        <BigStat
          value={data.epochs ?? null}
          label="Epochs"
          format="number"
        />
        <BigStat
          value={
            data.train_loss != null
              ? Number(data.train_loss.toFixed(4))
              : null
          }
          label="Final train loss"
          format="number"
        />
      </div>

      {/* Training details row */}
      {(data.eval_token_accuracy != null || data.eval_loss != null) && (
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {data.eval_token_accuracy != null && (
            <BigStat
              value={data.eval_token_accuracy}
              label="Eval token accuracy"
            />
          )}
          {data.eval_loss != null && (
            <BigStat
              value={Number(data.eval_loss.toFixed(4))}
              label="Eval loss"
              format="number"
            />
          )}
          {data.train_runtime_sec != null && (
            <div className="rounded-lg border border-line-1 bg-bg-2/50 p-3.5">
              <div className="text-[22px] font-bold tabular-nums tracking-tighter">
                {Math.round(data.train_runtime_sec / 60)}m
              </div>
              <div className="text-[12px] text-fg-3">Training time</div>
            </div>
          )}
        </div>
      )}

      {/* Pipeline steps */}
      <div className="mt-5">
        <div className="mb-2 text-[12.5px] font-semibold text-fg-2">
          Pipeline status
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {[
            { label: "Dataset", done: data.dataset_ready },
            {
              label: "Training",
              done: data.training_status === "completed",
            },
            {
              label: "Evaluation",
              done:
                data.evaluation_status === "ready" ||
                data.evaluation_status === "completed",
            },
          ].map((step, i) => (
            <div key={step.label} className="flex items-center gap-2">
              {i > 0 && <div className="h-px w-6 bg-line-2" />}
              <div
                className={cn(
                  "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-medium",
                  step.done
                    ? "border-success/28 bg-success/12 text-success"
                    : "border-line-2 bg-bg-3 text-fg-3",
                )}
              >
                {step.done ? (
                  <CheckCircle className="h-3 w-3" />
                ) : (
                  <Clock className="h-3 w-3" />
                )}
                {step.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
