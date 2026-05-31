"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Bookmark,
  Check,
  GraduationCap,
  MapPin,
  Share2,
  Users,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { WidgetCard } from "@/components/widgets/WidgetCard";
import { JobLogo } from "@/components/jobs/JobCard";
import { JobApplyModal } from "@/components/jobs/JobApplyModal";
import { JOBS } from "@/lib/mock-data-jobs";
import { compactNumber } from "@/lib/utils";

export default function JobDetailPage() {
  const { id } = useParams<{ id: string }>();
  const job = JOBS.find((j) => j.id === id) ?? JOBS[0]!;
  const similar = JOBS.filter((j) => j.id !== job.id).slice(0, 3);

  const [saved, setSaved] = useState(job.saved ?? false);
  const [copied, setCopied] = useState(false);
  const [applyOpen, setApplyOpen] = useState(false);

  const handleSave = async () => {
    const newState = !saved;
    setSaved(newState);
    try {
      // TODO: Wire to real save/unsave endpoint
      const { default: api } = await import("@/lib/api/client");
      if (newState) {
        await api.post(`/jobs/${job.id}/save`);
      } else {
        await api.delete(`/jobs/${job.id}/save`);
      }
    } catch {
      setSaved(!newState); // revert
    }
  };

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/jobs/${job.id}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  return (
    <AppShell
      topBar={{ breadcrumb: "Jobs", title: job.title }}
      rightRail={
        <>
          <WidgetCard title="Similar roles">
            {similar.map((j, i) => (
              <Link
                key={j.id}
                href={`/jobs/${j.id}`}
                className="flex items-center gap-2.5 px-3 py-2.5"
                style={{ borderTop: i ? "1px solid var(--line-1)" : "none" }}
              >
                <JobLogo job={j} size={34} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] font-semibold">
                    {j.title}
                  </div>
                  <div className="truncate text-[11px] text-fg-3">
                    {j.org} · {j.pay}
                  </div>
                </div>
              </Link>
            ))}
          </WidgetCard>
          <Card className="bg-[linear-gradient(135deg,rgba(155,108,255,0.12),rgba(79,143,247,0.06))]">
            <div className="text-[13px] font-semibold">Verified employer</div>
            <p className="mt-1.5 text-[12px] leading-[1.5] text-fg-2">
              {job.org} is a verified poster. UniVerse never shares your
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
                {job.orgKind === "university" && (
                  <GraduationCap className="h-3.5 w-3.5 text-brand-blue" />
                )}
                {job.org}
              </div>
              <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12.5px] text-fg-3">
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5" /> {job.location}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5" /> {compactNumber(job.applicants)} applied
                </span>
                <span className="font-medium text-fg-1">{job.pay}</span>
                <span className="text-fg-4">Posted {job.posted} ago</span>
              </div>
            </div>
          </div>

          {/* Type chips */}
          <div className="mt-4 flex flex-wrap gap-1.5">
            {job.types.map((t) => (
              <span
                key={t}
                className="rounded-full border border-brand-purple/28 bg-brand-purple/15 px-2.5 py-1 text-[11.5px] font-semibold text-[#C7B0FF]"
              >
                {t}
              </span>
            ))}
          </div>

          {/* Actions */}
          <div className="mt-4 flex gap-2.5 border-t border-line-1 pt-4">
            <Button variant="primary" size="md" onClick={() => setApplyOpen(true)}>
              Apply now
            </Button>
            <Button
              variant="ghost"
              size="md"
              icon={<Bookmark className="h-4 w-4" fill={saved ? "currentColor" : "none"} />}
              onClick={handleSave}
            >
              {saved ? "Saved" : "Save"}
            </Button>
            {copied ? (
              <Button variant="ghost" size="md" icon={<Check className="h-4 w-4 text-success" />}>
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

        {/* Description */}
        <section className="mt-6">
          <h2 className="mb-3 text-[16px] font-bold tracking-tighter">
            About the role
          </h2>
          <div className="flex flex-col gap-3 text-[14px] leading-[1.6] text-fg-2">
            {job.description.map((p, i) => (
              <p key={i} className="text-pretty">
                {p}
              </p>
            ))}
          </div>
        </section>

        {/* Requirements */}
        <section className="mt-6">
          <h2 className="mb-3 text-[16px] font-bold tracking-tighter">
            What we&rsquo;re looking for
          </h2>
          <ul className="flex flex-col gap-2.5">
            {job.requirements.map((r, i) => (
              <li key={i} className="flex items-start gap-2.5 text-[14px] leading-[1.5] text-fg-2">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-success/15 text-success">
                  <Check className="h-3 w-3" strokeWidth={3} />
                </span>
                {r}
              </li>
            ))}
          </ul>
        </section>

        {/* Bottom apply bar */}
        <div className="mt-8 flex items-center gap-3 rounded-lg border border-line-1 bg-bg-2 p-4">
          <JobLogo job={job} size={40} />
          <div className="min-w-0 flex-1">
            <div className="text-[13.5px] font-semibold">{job.title}</div>
            <div className="text-[12px] text-fg-3">
              {job.org} · {job.pay}
            </div>
          </div>
          <Button variant="primary" size="md" onClick={() => setApplyOpen(true)}>
            Apply now
          </Button>
        </div>
      </div>

      <JobApplyModal open={applyOpen} onClose={() => setApplyOpen(false)} job={job} />
    </AppShell>
  );
}
