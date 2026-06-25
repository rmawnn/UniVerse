"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Bookmark,
  Briefcase,
  Check,
  MapPin,
  RefreshCw,
  Share2,
  Users,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { WidgetCard } from "@/components/widgets/WidgetCard";
import { JobLogo } from "@/components/jobs/JobCard";
import dynamic from "next/dynamic";

const JobApplyModal = dynamic(() => import("@/components/jobs/JobApplyModal").then(m => m.JobApplyModal), { ssr: false });
import { JobMatchBadge } from "@/components/jobs/JobMatchBadge";
import {
  getJob,
  listJobs,
  saveJob,
  unsaveJob,
} from "@/lib/api/jobs";
import { compactNumber, formatRelativeTime } from "@/lib/utils";

const JOB_TYPE_LABELS: Record<string, string> = {
  internship: "Internship",
  "part-time": "Part-time",
  "full-time": "Full-time",
  freelance: "Freelance",
};

/* ── Skeleton ─────────────────────────────────────────────── */

function DetailSkeleton() {
  return (
    <div className="mx-auto max-w-[760px] px-4 py-5 sm:px-8 sm:py-6">
      <div className="mb-3 h-4 w-24 rounded bg-bg-3" />
      <div className="animate-pulse rounded-md border border-line-1 bg-bg-2 p-6">
        <div className="flex gap-4">
          <div className="h-16 w-16 rounded-xl bg-bg-3" />
          <div className="flex-1 space-y-3">
            <div className="h-6 w-3/5 rounded bg-bg-3" />
            <div className="h-4 w-1/3 rounded bg-bg-3" />
            <div className="flex gap-4">
              <div className="h-3 w-28 rounded bg-bg-3" />
              <div className="h-3 w-20 rounded bg-bg-3" />
              <div className="h-3 w-16 rounded bg-bg-3" />
            </div>
          </div>
        </div>
        <div className="mt-6 space-y-3">
          <div className="h-4 w-1/4 rounded bg-bg-3" />
          <div className="h-3 w-full rounded bg-bg-3" />
          <div className="h-3 w-5/6 rounded bg-bg-3" />
          <div className="h-3 w-4/6 rounded bg-bg-3" />
        </div>
      </div>
    </div>
  );
}

/* ── Main page ───────────────────────────────────────────── */

export default function JobDetailPage() {
  const { id } = useParams<{ id: string }>();

  const [saved, setSaved] = useState<boolean | null>(null);
  const [copied, setCopied] = useState(false);
  const [applyOpen, setApplyOpen] = useState(false);

  // ── Fetch job detail
  const {
    data: job,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ["job", id],
    queryFn: () => getJob(id),
    enabled: !!id,
  });

  // ── Fetch similar jobs (same type, excluding this one)
  const similarQuery = useQuery({
    queryKey: ["jobs", "similar", id, job?.job_type],
    queryFn: () =>
      listJobs({ pageSize: 4, jobType: job?.job_type ?? null }),
    enabled: !!job,
  });

  const similarJobs = (similarQuery.data?.items ?? []).filter(
    (j) => j.id !== id,
  ).slice(0, 3);

  // Sync saved state from server data
  const isSaved = saved ?? job?.saved_by_me ?? false;

  const handleSave = async () => {
    if (!job) return;
    const newState = !isSaved;
    setSaved(newState);
    try {
      if (newState) {
        await saveJob(job.id);
      } else {
        await unsaveJob(job.id);
      }
    } catch {
      setSaved(!newState); // revert
    }
  };

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(
        `${window.location.origin}/jobs/${id}`,
      );
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  // ── Loading state
  if (isLoading) {
    return (
      <AppShell
        topBar={{ breadcrumb: "Jobs", title: "Loading..." }}
        rightRail={null}
      >
        <DetailSkeleton />
      </AppShell>
    );
  }

  // ── Error state
  if (isError || !job) {
    return (
      <AppShell
        topBar={{ breadcrumb: "Jobs", title: "Error" }}
        rightRail={null}
      >
        <div className="mx-auto max-w-[760px] px-4 py-5 sm:px-8 sm:py-6">
          <Link
            href="/jobs"
            className="mb-3 inline-flex items-center gap-2 text-[13px] text-fg-2 hover:text-fg-1"
          >
            <ArrowLeft className="h-4 w-4" /> Back to jobs
          </Link>
          <div className="flex flex-col items-center gap-3 rounded-md border border-danger/20 bg-danger/[0.06] px-6 py-8 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-danger/10 text-danger">
              <span className="text-lg font-bold">!</span>
            </div>
            <p className="text-[14px] font-medium text-fg-1">
              Could not load job
            </p>
            <p className="max-w-[360px] text-[13px] text-fg-3">
              {(error as Error)?.message ??
                "This job may have been removed or doesn't exist."}
            </p>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                icon={<RefreshCw className="h-3.5 w-3.5" />}
                onClick={() => refetch()}
                disabled={isFetching}
              >
                {isFetching ? "Retrying..." : "Try again"}
              </Button>
              <Link href="/jobs">
                <Button variant="ghost" size="sm">
                  Browse all jobs
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </AppShell>
    );
  }

  const orgName = job.company_name ?? job.author.full_name;
  const typeLabel = JOB_TYPE_LABELS[job.job_type] ?? job.job_type;

  // ── Description paragraphs (split on double newlines)
  const descriptionParagraphs = job.description
    .split(/\n\n+/)
    .filter((p) => p.trim());

  return (
    <AppShell
      topBar={{ breadcrumb: "Jobs", title: job.title }}
      rightRail={
        <>
          <WidgetCard title="Similar roles">
            {similarQuery.isLoading && (
              <div className="space-y-2 p-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="h-3.5 w-3/4 rounded bg-bg-3" />
                    <div className="mt-1 h-3 w-1/2 rounded bg-bg-3" />
                  </div>
                ))}
              </div>
            )}
            {!similarQuery.isLoading &&
              similarJobs.map((j, i) => (
                <Link
                  key={j.id}
                  href={`/jobs/${j.id}`}
                  className="flex items-center gap-2.5 px-3 py-2.5"
                  style={{
                    borderTop: i ? "1px solid var(--line-1)" : "none",
                  }}
                >
                  <JobLogo job={j} size={34} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13px] font-semibold">
                      {j.title}
                    </div>
                    <div className="truncate text-[11px] text-fg-3">
                      {j.company_name ?? j.author.full_name}
                      {j.location ? ` · ${j.location}` : ""}
                    </div>
                  </div>
                </Link>
              ))}
            {!similarQuery.isLoading && similarJobs.length === 0 && (
              <div className="px-3 py-4 text-center text-[12px] text-fg-3">
                No similar roles found
              </div>
            )}
          </WidgetCard>
          <Card className="bg-[linear-gradient(135deg,rgba(155,108,255,0.12),rgba(79,143,247,0.06))]">
            <div className="text-[13px] font-semibold">
              Posted by @{job.author.username}
            </div>
            <p className="mt-1.5 text-[12px] leading-[1.5] text-fg-2">
              {orgName} is a verified poster. UniVerse never shares your
              contact details until you apply.
            </p>
          </Card>
        </>
      }
    >
      <div className="mx-auto max-w-[760px] px-4 py-5 sm:px-8 sm:py-6">
        <Link
          href="/jobs"
          className="mb-3 inline-flex items-center gap-2 text-[13px] text-fg-2 hover:text-fg-1"
        >
          <ArrowLeft className="h-4 w-4" /> Back to jobs
        </Link>

        {/* Header card */}
        <Card>
          <div className="flex gap-4">
            <JobLogo job={job} size={64} />
            <div className="min-w-0 flex-1">
              <h1 className="text-[22px] font-bold tracking-tighter">
                {job.title}
              </h1>
              <div className="mt-1 flex items-center gap-1.5 text-[13.5px] text-fg-2">
                <Briefcase className="h-3.5 w-3.5 text-brand-blue" />
                {orgName}
              </div>
              <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12.5px] text-fg-3">
                {job.location && (
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5" /> {job.location}
                  </span>
                )}
                <span className="inline-flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5" />{" "}
                  {compactNumber(job.application_count)} applied
                </span>
                <span className="text-fg-4">
                  Posted {formatRelativeTime(job.created_at)} ago
                </span>
              </div>
            </div>
          </div>

          {/* Type chip */}
          <div className="mt-4 flex flex-wrap gap-1.5">
            <span className="rounded-full border border-brand-purple/28 bg-brand-purple/15 px-2.5 py-1 text-[11.5px] font-semibold text-[#C7B0FF]">
              {typeLabel}
            </span>
            {job.has_applied && (
              <span className="rounded-full bg-success/15 px-2.5 py-1 text-[11.5px] font-semibold text-success">
                Applied
              </span>
            )}
          </div>

          {/* Actions */}
          <div className="mt-4 flex gap-2.5 border-t border-line-1 pt-4">
            <Button
              variant="primary"
              size="md"
              onClick={() => setApplyOpen(true)}
              disabled={job.has_applied}
            >
              {job.has_applied ? "Already applied" : "Apply now"}
            </Button>
            <Button
              variant="ghost"
              size="md"
              icon={
                <Bookmark
                  className="h-4 w-4"
                  fill={isSaved ? "currentColor" : "none"}
                />
              }
              onClick={handleSave}
            >
              {isSaved ? "Saved" : "Save"}
            </Button>
            {copied ? (
              <Button
                variant="ghost"
                size="md"
                icon={<Check className="h-4 w-4 text-success" />}
              >
                <span className="text-success">Copied!</span>
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="md"
                icon={<Share2 className="h-4 w-4" />}
                onClick={handleShare}
              >
                <span className="hidden sm:inline">Share</span>
              </Button>
            )}
          </div>
        </Card>

        {/* AI Match Score */}
        <div className="mt-4">
          <JobMatchBadge jobId={id} />
        </div>

        {/* Description */}
        <section className="mt-6">
          <h2 className="mb-3 text-[16px] font-bold tracking-tighter">
            About the role
          </h2>
          <div className="flex flex-col gap-3 text-[14px] leading-[1.6] text-fg-2">
            {descriptionParagraphs.map((p, i) => (
              <p key={i} className="text-pretty whitespace-pre-line">
                {p}
              </p>
            ))}
          </div>
        </section>

        {/* Bottom apply bar */}
        <div className="mt-8 flex items-center gap-3 rounded-lg border border-line-1 bg-bg-2 p-4">
          <JobLogo job={job} size={40} />
          <div className="min-w-0 flex-1">
            <div className="text-[13.5px] font-semibold">{job.title}</div>
            <div className="text-[12px] text-fg-3">
              {orgName}
              {job.location ? ` · ${job.location}` : ""}
            </div>
          </div>
          <Button
            variant="primary"
            size="md"
            onClick={() => setApplyOpen(true)}
            disabled={job.has_applied}
          >
            {job.has_applied ? "Applied" : "Apply now"}
          </Button>
        </div>
      </div>

      <JobApplyModal
        open={applyOpen}
        onClose={() => setApplyOpen(false)}
        job={job}
      />
    </AppShell>
  );
}
