"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  BookOpen,
  Brain,
  Briefcase,
  CheckCircle,
  ChevronRight,
  Clock,
  Cpu,
  Loader2,
  MessageSquareText,
  Sparkles,
  Star,
  Tag,
  Users,
  Zap,
} from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { demoCategorize } from "@/lib/api/ai-demo";
import { getRecommendedCommunities } from "@/lib/api/recommendations";
import type { CommunityRecommendation } from "@/lib/api/recommendations";
import { listJobs, type JobPostResponse } from "@/lib/api/jobs";
import { getJobMatch, type JobMatchResponse } from "@/lib/api/recommendations";
import { getAIEvaluation } from "@/lib/api/ai-evaluation";

const CATEGORY_COLORS: Record<string, string> = {
  academic: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  research: "bg-purple-500/15 text-purple-400 border-purple-500/30",
  internship: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",
  job: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  housing: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  event: "bg-pink-500/15 text-pink-400 border-pink-500/30",
  marketplace: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  general: "bg-gray-500/15 text-gray-400 border-gray-500/30",
};

const SAMPLE_POSTS = [
  "Looking for a roommate near campus, 2BR apartment available starting September. Rent is 3000 TL/month, utilities included.",
  "Has anyone taken BLG102 Data Structures with Prof. Yilmaz? How are the exams?",
  "We're hiring a part-time React developer at our startup! Remote-friendly, flexible hours. Send your CV!",
  "Our research group published a new paper on Turkish NLP — check it out on arXiv!",
  "Selling my barely-used MacBook Air M2, 256GB. Asking 25000 TL, negotiable.",
];

export default function AIDemoPage() {
  return (
    <AppShell
      topBar={{
        breadcrumb: "AI Systems",
        title: "Demo Tour",
        action: (
          <Link
            href="/ai/evaluation"
            className="inline-flex items-center gap-1.5 rounded-md border border-line-2 bg-bg-3 px-3 py-1.5 text-[12px] font-medium text-fg-2 hover:text-fg-1"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Evaluation Report
          </Link>
        ),
      }}
    >
      <div className="px-4 py-6 sm:px-8">
        {/* Header */}
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-acc-gradient shadow-acc">
            <Sparkles className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-[22px] font-bold tracking-tighter">
              AI Capabilities Demo
            </h1>
            <p className="text-[13px] text-fg-3">
              Interactive demonstration of all AI-powered features in UniVerse
            </p>
          </div>
        </div>

        <div className="space-y-6">
          <CategorizationDemo />
          <CommunityRecDemo />
          <JobMatchDemo />
          <LoRADemo />
        </div>
      </div>
    </AppShell>
  );
}

/* ── Section 1: Post Categorization ───────────────────── */

function CategorizationDemo() {
  const [text, setText] = useState("");
  const mutation = useMutation({
    mutationFn: (content: string) => demoCategorize(content),
  });

  const handleClassify = () => {
    if (text.trim().length > 0) mutation.mutate(text.trim());
  };

  const handleSample = (sample: string) => {
    setText(sample);
    mutation.reset();
  };

  return (
    <Card>
      <SectionHeader
        icon={<MessageSquareText className="h-4.5 w-4.5" />}
        number={1}
        title="LLM Post Categorization"
        subtitle="Classify posts into 8 categories using LLM or rule-based fallback"
      />

      <div className="mt-5 space-y-4">
        {/* Sample chips */}
        <div>
          <div className="mb-2 text-[12px] font-medium text-fg-3">
            Try a sample post:
          </div>
          <div className="flex flex-wrap gap-2">
            {SAMPLE_POSTS.map((s, i) => (
              <button
                key={i}
                onClick={() => handleSample(s)}
                className="rounded-lg border border-line-2 bg-bg-3 px-3 py-1.5 text-left text-[12px] text-fg-2 transition hover:border-brand-purple/40 hover:bg-brand-purple/[0.06] hover:text-fg-1"
              >
                {s.slice(0, 50)}...
              </button>
            ))}
          </div>
        </div>

        {/* Input */}
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type or paste a post to categorize..."
          rows={3}
          className="w-full resize-none rounded-lg border border-line-2 bg-bg-3 px-4 py-3 text-[14px] text-fg-1 placeholder:text-fg-4 focus:border-brand-purple/50 focus:outline-none focus:ring-1 focus:ring-brand-purple/30"
        />

        <div className="flex items-center gap-3">
          <Button
            size="sm"
            onClick={handleClassify}
            disabled={text.trim().length === 0 || mutation.isPending}
            icon={
              mutation.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Zap className="h-3.5 w-3.5" />
              )
            }
          >
            Categorize
          </Button>

          {mutation.isSuccess && (
            <div className="flex items-center gap-2 animate-in fade-in slide-in-from-left-2">
              <ChevronRight className="h-4 w-4 text-fg-4" />
              <CategoryBadge category={mutation.data.category} />
              <span className="text-[11px] text-fg-4">
                via {mutation.data.provider}
              </span>
            </div>
          )}

          {mutation.isError && (
            <span className="text-[12px] text-danger">
              Classification failed — try again
            </span>
          )}
        </div>
      </div>
    </Card>
  );
}

/* ── Section 2: Community Recommendation ──────────────── */

function CommunityRecDemo() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["ai", "demo", "communities"],
    queryFn: () => getRecommendedCommunities(6),
    staleTime: 60_000,
  });

  return (
    <Card>
      <SectionHeader
        icon={<Users className="h-4.5 w-4.5" />}
        number={2}
        title="Community Recommendation"
        subtitle="Multi-signal scoring based on department, interests, and activity"
      />

      <div className="mt-5">
        {isLoading ? (
          <LoadingState />
        ) : isError || !data ? (
          <ErrorState onRetry={() => refetch()} />
        ) : data.recommendations.length === 0 ? (
          <EmptyState text="No recommendations available" />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {data.recommendations.map((rec) => (
              <RecommendationCard key={rec.community_id} rec={rec} />
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}

function RecommendationCard({ rec }: { rec: CommunityRecommendation }) {
  const scorePercent = Math.round(rec.score * 100);
  return (
    <div className="rounded-lg border border-line-1 bg-bg-2/60 p-4 transition hover:border-brand-purple/30">
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-[14px] font-semibold text-fg-1 leading-snug">
          {rec.name}
        </h3>
        <ScoreBadge score={scorePercent} />
      </div>
      {rec.description && (
        <p className="mt-1.5 text-[12px] text-fg-3 line-clamp-2">
          {rec.description}
        </p>
      )}
      <div className="mt-3 flex items-center gap-1.5 text-[11px] text-fg-4">
        <Users className="h-3 w-3" />
        {rec.member_count} members
      </div>
      {rec.reasons.length > 0 && (
        <div className="mt-3 space-y-1">
          {rec.reasons.slice(0, 3).map((r, i) => (
            <div
              key={i}
              className="flex items-start gap-1.5 text-[11.5px] text-fg-3"
            >
              <CheckCircle className="mt-0.5 h-3 w-3 shrink-0 text-success" />
              {r}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Section 3: Job Matching ──────────────────────────── */

function JobMatchDemo() {
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);

  const jobsQuery = useQuery({
    queryKey: ["ai", "demo", "jobs"],
    queryFn: () => listJobs({ pageSize: 10 }),
    staleTime: 60_000,
  });

  const matchMutation = useMutation({
    mutationFn: (jobId: string) => getJobMatch(jobId),
  });

  const handleSelectJob = (job: JobPostResponse) => {
    setSelectedJobId(job.id);
    matchMutation.mutate(job.id);
  };

  const jobs = jobsQuery.data?.items ?? [];
  const selectedJob = jobs.find((j) => j.id === selectedJobId);

  return (
    <Card>
      <SectionHeader
        icon={<Briefcase className="h-4.5 w-4.5" />}
        number={3}
        title="Job Matching"
        subtitle="Skill extraction and multi-factor matching against your profile"
      />

      <div className="mt-5">
        {jobsQuery.isLoading ? (
          <LoadingState />
        ) : jobsQuery.isError ? (
          <ErrorState onRetry={() => jobsQuery.refetch()} />
        ) : jobs.length === 0 ? (
          <EmptyState text="No jobs available for matching" />
        ) : (
          <div className="space-y-4">
            {/* Job selector */}
            <div>
              <div className="mb-2 text-[12px] font-medium text-fg-3">
                Choose a job to analyze:
              </div>
              <div className="flex flex-wrap gap-2">
                {jobs.slice(0, 6).map((job) => (
                  <button
                    key={job.id}
                    onClick={() => handleSelectJob(job)}
                    className={cn(
                      "rounded-lg border px-3 py-2 text-left text-[12.5px] transition",
                      selectedJobId === job.id
                        ? "border-brand-purple/50 bg-brand-purple/10 text-fg-1"
                        : "border-line-2 bg-bg-3 text-fg-2 hover:border-brand-purple/30 hover:text-fg-1",
                    )}
                  >
                    <div className="font-medium">{job.title}</div>
                    {job.company_name && (
                      <div className="mt-0.5 text-[11px] text-fg-4">
                        {job.company_name}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Match result */}
            {matchMutation.isPending && (
              <div className="flex items-center gap-2 text-[13px] text-fg-3">
                <Loader2 className="h-4 w-4 animate-spin text-brand-purple" />
                Analyzing match...
              </div>
            )}

            {matchMutation.isSuccess && selectedJob && (
              <JobMatchResult job={selectedJob} match={matchMutation.data} />
            )}

            {matchMutation.isError && (
              <span className="text-[12px] text-danger">
                Match analysis failed — try another job
              </span>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}

function JobMatchResult({
  job,
  match,
}: {
  job: JobPostResponse;
  match: JobMatchResponse;
}) {
  return (
    <div className="rounded-lg border border-line-1 bg-bg-2/60 p-5 animate-in fade-in slide-in-from-bottom-2">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[14px] font-semibold text-fg-1">{job.title}</div>
          <div className="text-[12px] text-fg-3">{job.company_name}</div>
        </div>
        <div className="text-center">
          <div
            className={cn(
              "text-[28px] font-bold tabular-nums tracking-tighter",
              match.score >= 80
                ? "text-success"
                : match.score >= 50
                  ? "text-warn"
                  : "text-danger",
            )}
          >
            {match.score}%
          </div>
          <div className="text-[11px] text-fg-4">Match Score</div>
        </div>
      </div>

      {/* Factor bars */}
      <div className="mt-4 space-y-2">
        <FactorBar label="Skill Overlap" value={match.factors.skill_overlap} />
        <FactorBar
          label="Keyword Overlap"
          value={match.factors.keyword_overlap}
        />
        <FactorBar
          label="Community Relevance"
          value={match.factors.community_relevance}
        />
        <FactorBar
          label="University Match"
          value={match.factors.university_match}
        />
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {/* Strengths */}
        {match.strengths.length > 0 && (
          <div>
            <div className="mb-1.5 text-[12px] font-semibold text-success">
              Strengths
            </div>
            <div className="space-y-1">
              {match.strengths.map((s, i) => (
                <div
                  key={i}
                  className="flex items-start gap-1.5 text-[12px] text-fg-2"
                >
                  <CheckCircle className="mt-0.5 h-3 w-3 shrink-0 text-success" />
                  {s}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Missing skills */}
        {match.missing_skills.length > 0 && (
          <div>
            <div className="mb-1.5 text-[12px] font-semibold text-warn">
              Missing Skills
            </div>
            <div className="flex flex-wrap gap-1.5">
              {match.missing_skills.map((s, i) => (
                <span
                  key={i}
                  className="rounded-md border border-warn/25 bg-warn/10 px-2 py-0.5 text-[11px] text-warn"
                >
                  {s}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Section 4: LoRA Fine-Tuning ──────────────────────── */

function LoRADemo() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["ai", "demo", "lora"],
    queryFn: getAIEvaluation,
    staleTime: 60_000,
  });

  const lora = data?.lora;

  return (
    <Card>
      <SectionHeader
        icon={<Cpu className="h-4.5 w-4.5" />}
        number={4}
        title="LoRA Fine-Tuning"
        subtitle="Custom model adapter trained on UniVerse post data"
      />

      <div className="mt-5">
        {isLoading ? (
          <LoadingState />
        ) : isError || !lora ? (
          <ErrorState onRetry={() => refetch()} />
        ) : (
          <div className="space-y-5">
            {/* Model info */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-md border border-brand-purple/30 bg-brand-purple/10 px-2.5 py-1 text-[12px] font-semibold text-brand-purple">
                {lora.model_name}
              </span>
              <span className="rounded-md border border-line-2 bg-bg-3 px-2.5 py-1 text-[12px] text-fg-3">
                {lora.adapter}
              </span>
            </div>

            {/* Stats grid */}
            <div className="grid gap-3 sm:grid-cols-4">
              <StatCard
                label="Train Examples"
                value={lora.train_examples}
                icon={<BookOpen className="h-4 w-4" />}
              />
              <StatCard
                label="Eval Examples"
                value={lora.eval_examples}
                icon={<BookOpen className="h-4 w-4" />}
              />
              <StatCard
                label="Training"
                value={lora.training_status}
                icon={
                  lora.training_status === "completed" ? (
                    <CheckCircle className="h-4 w-4 text-success" />
                  ) : (
                    <Clock className="h-4 w-4 text-warn" />
                  )
                }
                isStatus
              />
              <StatCard
                label="Evaluation"
                value={lora.evaluation_status}
                icon={
                  lora.evaluation_status === "ready" ||
                  lora.evaluation_status === "completed" ? (
                    <CheckCircle className="h-4 w-4 text-success" />
                  ) : (
                    <Clock className="h-4 w-4 text-warn" />
                  )
                }
                isStatus
              />
            </div>

            {/* Pipeline */}
            <div>
              <div className="mb-2 text-[12px] font-medium text-fg-3">
                Pipeline Steps
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {[
                  { label: "Dataset", done: lora.dataset_ready },
                  {
                    label: "Training",
                    done: lora.training_status === "completed",
                  },
                  {
                    label: "Evaluation",
                    done:
                      lora.evaluation_status === "ready" ||
                      lora.evaluation_status === "completed",
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
          </div>
        )}
      </div>
    </Card>
  );
}

/* ── Shared components ────────────────────────────────── */

function SectionHeader({
  icon,
  number,
  title,
  subtitle,
}: {
  icon: React.ReactNode;
  number: number;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-purple/15">
        <span className="text-brand-purple">{icon}</span>
      </div>
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="rounded-md bg-brand-purple/20 px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-brand-purple">
            {number}
          </span>
          <h2 className="text-[16px] font-bold tracking-tighter">{title}</h2>
        </div>
        <p className="mt-0.5 text-[12.5px] text-fg-3">{subtitle}</p>
      </div>
    </div>
  );
}

function CategoryBadge({ category }: { category: string }) {
  const colors = CATEGORY_COLORS[category] ?? CATEGORY_COLORS.general;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[12px] font-semibold capitalize",
        colors,
      )}
    >
      <Tag className="h-3 w-3" />
      {category}
    </span>
  );
}

function ScoreBadge({ score }: { score: number }) {
  return (
    <div
      className={cn(
        "flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold tabular-nums",
        score >= 80
          ? "bg-success/15 text-success"
          : score >= 50
            ? "bg-warn/15 text-warn"
            : "bg-fg-4/15 text-fg-4",
      )}
    >
      <Star className="h-2.5 w-2.5" />
      {score}%
    </div>
  );
}

function FactorBar({ label, value }: { label: string; value: number }) {
  const pct = Math.round(value * 100);
  return (
    <div className="flex items-center gap-3">
      <span className="w-[140px] shrink-0 text-[12px] text-fg-3">{label}</span>
      <div className="flex-1">
        <div className="h-2 overflow-hidden rounded-full bg-bg-3">
          <div
            className={cn(
              "h-full rounded-full transition-all",
              pct >= 80 ? "bg-success" : pct >= 50 ? "bg-warn" : "bg-fg-4",
            )}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
      <span className="w-10 text-right text-[11px] font-semibold tabular-nums text-fg-3">
        {pct}%
      </span>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  isStatus,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  isStatus?: boolean;
}) {
  return (
    <div className="rounded-lg border border-line-1 bg-bg-2/50 p-3.5">
      <div className="flex items-center gap-2">
        {icon}
        <span
          className={cn(
            "text-[15px] font-bold tabular-nums tracking-tighter",
            isStatus ? "capitalize" : "",
          )}
        >
          {value}
        </span>
      </div>
      <div className="mt-1 text-[12px] text-fg-3">{label}</div>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex items-center justify-center py-10">
      <Loader2 className="h-6 w-6 animate-spin text-brand-purple" />
    </div>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-line-2 bg-bg-2/50 py-8">
      <p className="text-[13px] text-fg-3">Failed to load data</p>
      <Button variant="ghost" size="sm" onClick={onRetry}>
        Retry
      </Button>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex items-center justify-center rounded-lg border border-dashed border-line-2 bg-bg-2/50 py-8">
      <p className="text-[13px] text-fg-3">{text}</p>
    </div>
  );
}
