"use client";

import Link from "next/link";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  BrainCircuit,
  CheckCircle,
  Cpu,
  Database,
  Eye,
  FileCheck,
  Globe,
  Layers,
  MessageSquareText,
  Network,
  Search,
  Server,
  Shield,
  Sparkles,
  Users,
  Briefcase,
  Zap,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";

export default function AIArchitecturePage() {
  return (
    <AppShell
      topBar={{
        breadcrumb: "AI Systems",
        title: "Architecture",
        action: (
          <Link
            href="/ai/demo"
            className="inline-flex items-center gap-1.5 rounded-md border border-line-2 bg-bg-3 px-3 py-1.5 text-[12px] font-medium text-fg-2 hover:text-fg-1"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Demo Tour
          </Link>
        ),
      }}
    >
      <div className="px-4 py-6 sm:px-8">
        {/* Header */}
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-acc-gradient shadow-acc">
            <Network className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-[22px] font-bold tracking-tighter">
              AI System Architecture
            </h1>
            <p className="text-[13px] text-fg-3">
              How AI components connect and interact in UniVerse
            </p>
          </div>
        </div>

        <div className="space-y-8">
          {/* System Overview */}
          <SystemOverview />

          {/* Flow Diagrams */}
          <div className="grid gap-6 lg:grid-cols-2">
            <CategorizationFlow />
            <CommunityRecFlow />
            <JobMatchingFlow />
            <VerificationFlow />
          </div>
        </div>
      </div>
    </AppShell>
  );
}

/* ── System Overview ──────────────────────────────────── */

function SystemOverview() {
  return (
    <Card>
      <div className="mb-5 flex items-center gap-2">
        <Layers className="h-4.5 w-4.5 text-brand-purple" />
        <h2 className="text-[16px] font-bold tracking-tighter">
          System Overview
        </h2>
      </div>

      <div className="flex flex-col items-center gap-1">
        {/* Frontend Layer */}
        <ArchLayer
          color="blue"
          icon={<Globe className="h-4 w-4" />}
          title="Frontend"
          subtitle="Next.js 14 App Router"
          items={["React Query", "Zustand Auth", "Tailwind CSS"]}
        />

        <FlowArrow />

        {/* API Layer */}
        <ArchLayer
          color="emerald"
          icon={<Server className="h-4 w-4" />}
          title="API Layer"
          subtitle="FastAPI + SQLAlchemy Async"
          items={[
            "POST /ai/demo/categorize",
            "GET /ai/recommendations/communities",
            "GET /jobs/{id}/match",
            "POST /verification/document",
          ]}
        />

        <FlowArrow />

        {/* AI Engine Layer */}
        <ArchLayer
          color="purple"
          icon={<BrainCircuit className="h-4 w-4" />}
          title="AI Engine"
          subtitle="Recommendation + Classification + Validation"
          items={[
            "Community Recommendation Engine",
            "Job Matching Service",
            "Post Categorization Service",
            "AI Document Validation",
          ]}
        />

        <FlowArrow />

        {/* LLM Provider Layer */}
        <div className="w-full max-w-2xl">
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/[0.06] p-4">
            <div className="mb-3 flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/20">
                <Cpu className="h-3.5 w-3.5 text-amber-400" />
              </div>
              <div>
                <div className="text-[14px] font-semibold text-fg-1">
                  LLM Provider Abstraction
                </div>
                <div className="text-[11px] text-fg-3">
                  Multi-provider with automatic fallback
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <ProviderCard
                name="Gemini"
                detail="gemini-2.0-flash"
                status="primary"
              />
              <ProviderCard
                name="RuleBased"
                detail="Keyword matching"
                status="fallback"
              />
              <ProviderCard
                name="LoRA"
                detail="Qwen2.5-1.5B"
                status="experimental"
              />
            </div>
          </div>
        </div>

        <FlowArrow />

        {/* Data Layer */}
        <ArchLayer
          color="rose"
          icon={<Database className="h-4 w-4" />}
          title="Data Layer"
          subtitle="PostgreSQL + Supabase Storage"
          items={[
            "Users, Posts, Communities",
            "Jobs, Applications, Follows",
            "Verification Documents (OCR)",
            "evaluation/metrics.json",
          ]}
        />
      </div>
    </Card>
  );
}

/* ── Categorization Flow ──────────────────────────────── */

function CategorizationFlow() {
  return (
    <Card>
      <FlowHeader
        icon={<MessageSquareText className="h-4 w-4" />}
        title="Post Categorization"
        color="blue"
      />

      <div className="mt-4 space-y-1.5">
        <FlowStep step={1} label="User creates a post" color="blue" />
        <FlowConnector />
        <FlowStep step={2} label="Content sent to LLM Provider" color="blue" />
        <FlowConnector />
        <FlowStep
          step={3}
          label="Provider classifies into 1 of 8 categories"
          color="blue"
        />
        <FlowConnector />

        <div className="ml-4 rounded-lg border border-line-1 bg-bg-2/50 p-3">
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-fg-4">
            Categories
          </div>
          <div className="flex flex-wrap gap-1.5">
            {[
              "academic",
              "research",
              "internship",
              "job",
              "housing",
              "event",
              "marketplace",
              "general",
            ].map((cat) => (
              <CategoryChip key={cat} name={cat} />
            ))}
          </div>
        </div>

        <FlowConnector />
        <FlowStep step={4} label="Category saved to Post record" color="blue" />
        <FlowConnector />
        <FlowStep
          step={5}
          label="Used for feed filtering & analytics"
          color="blue"
          isLast
        />
      </div>

      <FlowDetail
        provider="Gemini 2.0 Flash → RuleBased fallback"
        latency="~200ms (LLM) / <5ms (rule-based)"
        accuracy="95% (evaluated on 150 samples)"
      />
    </Card>
  );
}

/* ── Community Recommendation Flow ────────────────────── */

function CommunityRecFlow() {
  return (
    <Card>
      <FlowHeader
        icon={<Users className="h-4 w-4" />}
        title="Community Recommendation"
        color="purple"
      />

      <div className="mt-4 space-y-1.5">
        <FlowStep step={1} label="User opens recommendations" color="purple" />
        <FlowConnector />
        <FlowStep
          step={2}
          label="Engine loads user profile & activity"
          color="purple"
        />
        <FlowConnector />

        <div className="ml-4 rounded-lg border border-line-1 bg-bg-2/50 p-3">
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-fg-4">
            Scoring Signals
          </div>
          <div className="space-y-1.5">
            <SignalBar label="Interest Similarity" weight={35} color="purple" />
            <SignalBar label="University Match" weight={25} color="purple" />
            <SignalBar label="Friend Presence" weight={25} color="purple" />
            <SignalBar label="Activity Similarity" weight={15} color="purple" />
          </div>
        </div>

        <FlowConnector />
        <FlowStep
          step={3}
          label="Weighted score (0–1) per community"
          color="purple"
        />
        <FlowConnector />
        <FlowStep
          step={4}
          label="Generate reason strings from dominant signals"
          color="purple"
        />
        <FlowConnector />
        <FlowStep
          step={5}
          label="Return ranked list with scores & reasons"
          color="purple"
          isLast
        />
      </div>

      <FlowDetail
        provider="weighted_multi_signal_v1"
        latency="~50ms (SQL aggregation)"
        accuracy="P@3: 80% · NDCG@3: 95%"
      />
    </Card>
  );
}

/* ── Job Matching Flow ────────────────────────────────── */

function JobMatchingFlow() {
  return (
    <Card>
      <FlowHeader
        icon={<Briefcase className="h-4 w-4" />}
        title="Job Matching"
        color="emerald"
      />

      <div className="mt-4 space-y-1.5">
        <FlowStep step={1} label="User views a job posting" color="emerald" />
        <FlowConnector />
        <FlowStep
          step={2}
          label="Extract skills from user bio & activity"
          color="emerald"
        />
        <FlowConnector />

        <div className="ml-4 rounded-lg border border-line-1 bg-bg-2/50 p-3">
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-fg-4">
            Match Factors
          </div>
          <div className="space-y-1.5">
            <SignalBar label="Skill Overlap" weight={40} color="emerald" />
            <SignalBar label="Keyword Overlap" weight={25} color="emerald" />
            <SignalBar
              label="Community Relevance"
              weight={20}
              color="emerald"
            />
            <SignalBar label="University Match" weight={15} color="emerald" />
          </div>
        </div>

        <FlowConnector />
        <FlowStep
          step={3}
          label="Compute weighted score (0–100%)"
          color="emerald"
        />
        <FlowConnector />
        <FlowStep
          step={4}
          label="Identify strengths & missing skills"
          color="emerald"
        />
        <FlowConnector />
        <FlowStep
          step={5}
          label="Return score, factors, and skill analysis"
          color="emerald"
          isLast
        />
      </div>

      <FlowDetail
        provider="Skill extraction + multi-factor scoring"
        latency="~80ms (SQL + keyword extraction)"
        accuracy="Tier accuracy: 100% · Ranking: 92%"
      />
    </Card>
  );
}

/* ── Verification AI Flow ─────────────────────────────── */

function VerificationFlow() {
  return (
    <Card>
      <FlowHeader
        icon={<Shield className="h-4 w-4" />}
        title="Document Verification AI"
        color="rose"
      />

      <div className="mt-4 space-y-1.5">
        <FlowStep
          step={1}
          label="Student uploads ID document"
          color="rose"
        />
        <FlowConnector />
        <FlowStep
          step={2}
          label="OCR extracts text fields"
          color="rose"
        />
        <FlowConnector />

        <div className="ml-4 rounded-lg border border-line-1 bg-bg-2/50 p-3">
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-fg-4">
            Validation Checks (weighted)
          </div>
          <div className="space-y-1.5">
            <SignalBar
              label="University Name Match"
              weight={30}
              color="rose"
            />
            <SignalBar label="Student Name Match" weight={25} color="rose" />
            <SignalBar label="Student Number Found" weight={15} color="rose" />
            <SignalBar label="Image Quality" weight={15} color="rose" />
            <SignalBar label="Format Validity" weight={10} color="rose" />
            <SignalBar label="Expiration Check" weight={5} color="rose" />
          </div>
        </div>

        <FlowConnector />
        <FlowStep
          step={3}
          label="Compute confidence score (0–1)"
          color="rose"
        />
        <FlowConnector />

        <div className="ml-4 rounded-lg border border-line-1 bg-bg-2/50 p-3">
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-fg-4">
            Decision Thresholds
          </div>
          <div className="space-y-1">
            <ThresholdRow
              label="Auto-Approve"
              threshold="≥ 0.85"
              color="text-success"
            />
            <ThresholdRow
              label="Admin Review"
              threshold="≥ 0.50"
              color="text-warn"
            />
            <ThresholdRow
              label="Suspicious"
              threshold="< 0.50"
              color="text-danger"
            />
          </div>
        </div>

        <FlowConnector />
        <FlowStep
          step={4}
          label="Flag issues (mismatch, blurry, expired, edited)"
          color="rose"
        />
        <FlowConnector />
        <FlowStep
          step={5}
          label="Route to auto-approve, review, or reject"
          color="rose"
          isLast
        />
      </div>

      <FlowDetail
        provider="Heuristic AI + OCR pipeline"
        latency="~500ms (OCR + validation)"
        accuracy="Duplicate & tampering detection"
      />
    </Card>
  );
}

/* ── Shared Components ────────────────────────────────── */

const COLOR_MAP: Record<string, { border: string; bg: string; text: string; dot: string }> = {
  blue: {
    border: "border-blue-500/30",
    bg: "bg-blue-500/[0.06]",
    text: "text-blue-400",
    dot: "bg-blue-400",
  },
  purple: {
    border: "border-brand-purple/30",
    bg: "bg-brand-purple/[0.06]",
    text: "text-brand-purple",
    dot: "bg-brand-purple",
  },
  emerald: {
    border: "border-emerald-500/30",
    bg: "bg-emerald-500/[0.06]",
    text: "text-emerald-400",
    dot: "bg-emerald-400",
  },
  rose: {
    border: "border-rose-500/30",
    bg: "bg-rose-500/[0.06]",
    text: "text-rose-400",
    dot: "bg-rose-400",
  },
  amber: {
    border: "border-amber-500/30",
    bg: "bg-amber-500/[0.06]",
    text: "text-amber-400",
    dot: "bg-amber-400",
  },
};

function ArchLayer({
  color,
  icon,
  title,
  subtitle,
  items,
}: {
  color: string;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  items: string[];
}) {
  const c = COLOR_MAP[color] ?? COLOR_MAP.blue;
  return (
    <div className={cn("w-full max-w-2xl rounded-xl border p-4", c.border, c.bg)}>
      <div className="flex items-center gap-2">
        <div
          className={cn(
            "flex h-7 w-7 items-center justify-center rounded-lg",
            c.bg,
            c.text,
          )}
          style={{ backgroundColor: `color-mix(in srgb, currentColor 20%, transparent)` }}
        >
          {icon}
        </div>
        <div>
          <div className="text-[14px] font-semibold text-fg-1">{title}</div>
          <div className="text-[11px] text-fg-3">{subtitle}</div>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {items.map((item) => (
          <span
            key={item}
            className="rounded-md border border-line-2 bg-bg-2 px-2 py-0.5 text-[11px] text-fg-3"
          >
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

function ProviderCard({
  name,
  detail,
  status,
}: {
  name: string;
  detail: string;
  status: "primary" | "fallback" | "experimental";
}) {
  const statusColors = {
    primary: "border-success/30 bg-success/12 text-success",
    fallback: "border-warn/30 bg-warn/12 text-warn",
    experimental: "border-brand-purple/30 bg-brand-purple/12 text-brand-purple",
  };

  return (
    <div className="rounded-lg border border-line-1 bg-bg-2 p-3 text-center">
      <div className="text-[13px] font-semibold text-fg-1">{name}</div>
      <div className="mt-0.5 text-[10.5px] text-fg-4">{detail}</div>
      <span
        className={cn(
          "mt-2 inline-block rounded-full border px-2 py-0.5 text-[10px] font-semibold capitalize",
          statusColors[status],
        )}
      >
        {status}
      </span>
    </div>
  );
}

function FlowArrow() {
  return (
    <div className="flex justify-center py-1">
      <ArrowDown className="h-4 w-4 text-fg-4" />
    </div>
  );
}

function FlowHeader({
  icon,
  title,
  color,
}: {
  icon: React.ReactNode;
  title: string;
  color: string;
}) {
  const c = COLOR_MAP[color] ?? COLOR_MAP.blue;
  return (
    <div className="flex items-center gap-2.5">
      <div
        className={cn(
          "flex h-8 w-8 items-center justify-center rounded-xl",
          c.bg,
          c.text,
        )}
      >
        {icon}
      </div>
      <h2 className="text-[16px] font-bold tracking-tighter">{title}</h2>
    </div>
  );
}

function FlowStep({
  step,
  label,
  color,
  isLast,
}: {
  step: number;
  label: string;
  color: string;
  isLast?: boolean;
}) {
  const c = COLOR_MAP[color] ?? COLOR_MAP.blue;
  return (
    <div className="flex items-center gap-3">
      <div
        className={cn(
          "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold",
          c.bg,
          c.text,
          c.border,
          "border",
        )}
      >
        {isLast ? (
          <CheckCircle className="h-3.5 w-3.5" />
        ) : (
          step
        )}
      </div>
      <span className="text-[13px] text-fg-2">{label}</span>
    </div>
  );
}

function FlowConnector() {
  return (
    <div className="ml-[11px] h-3 w-px bg-line-2" />
  );
}

function SignalBar({
  label,
  weight,
  color,
}: {
  label: string;
  weight: number;
  color: string;
}) {
  const c = COLOR_MAP[color] ?? COLOR_MAP.blue;
  return (
    <div className="flex items-center gap-2">
      <span className="w-[140px] shrink-0 text-[11.5px] text-fg-3">
        {label}
      </span>
      <div className="flex-1">
        <div className="h-1.5 overflow-hidden rounded-full bg-bg-3">
          <div
            className={cn("h-full rounded-full", c.dot)}
            style={{ width: `${weight}%` }}
          />
        </div>
      </div>
      <span className="w-8 text-right text-[10.5px] font-semibold tabular-nums text-fg-4">
        {weight}%
      </span>
    </div>
  );
}

function ThresholdRow({
  label,
  threshold,
  color,
}: {
  label: string;
  threshold: string;
  color: string;
}) {
  return (
    <div className="flex items-center justify-between text-[12px]">
      <span className={cn("font-medium", color)}>{label}</span>
      <code className="rounded bg-bg-3 px-1.5 py-0.5 text-[11px] text-fg-3">
        {threshold}
      </code>
    </div>
  );
}

function CategoryChip({ name }: { name: string }) {
  return (
    <span className="rounded-md border border-line-2 bg-bg-3 px-2 py-0.5 text-[11px] capitalize text-fg-3">
      {name}
    </span>
  );
}

function FlowDetail({
  provider,
  latency,
  accuracy,
}: {
  provider: string;
  latency: string;
  accuracy: string;
}) {
  return (
    <div className="mt-4 grid grid-cols-3 gap-2 rounded-lg border border-line-1 bg-bg-2/40 p-3">
      <div>
        <div className="text-[10px] font-semibold uppercase tracking-wider text-fg-4">
          Provider
        </div>
        <div className="mt-0.5 text-[11.5px] text-fg-2">{provider}</div>
      </div>
      <div>
        <div className="text-[10px] font-semibold uppercase tracking-wider text-fg-4">
          Latency
        </div>
        <div className="mt-0.5 text-[11.5px] text-fg-2">{latency}</div>
      </div>
      <div>
        <div className="text-[10px] font-semibold uppercase tracking-wider text-fg-4">
          Accuracy
        </div>
        <div className="mt-0.5 text-[11.5px] text-fg-2">{accuracy}</div>
      </div>
    </div>
  );
}
