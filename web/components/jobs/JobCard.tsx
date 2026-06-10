"use client";

import { useState } from "react";
import Link from "next/link";
import { Bookmark, Briefcase, MapPin, Users } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { JobApplyModal } from "@/components/jobs/JobApplyModal";
import type { JobPostResponse } from "@/lib/api/jobs";
import { saveJob, unsaveJob } from "@/lib/api/jobs";
import { compactNumber, formatRelativeTime } from "@/lib/utils";

interface JobCardProps {
  job: JobPostResponse;
}

/** Job type label mapping for display. */
const JOB_TYPE_LABELS: Record<string, string> = {
  internship: "Internship",
  "part-time": "Part-time",
  "full-time": "Full-time",
  freelance: "Freelance",
};

/** Job logo tile — shows first letter of company or title. */
function JobLogo({
  job,
  size = 48,
}: {
  job: JobPostResponse;
  size?: number;
}) {
  const label = job.company_name || job.title;
  const initial = label.charAt(0).toUpperCase();
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center bg-brand-purple/10 text-brand-purple font-bold"
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.28,
        fontSize: size * 0.42,
        lineHeight: 1,
      }}
    >
      {initial}
    </span>
  );
}

export { JobLogo };

/** Full job card for the listing page. */
export function JobCard({ job }: JobCardProps) {
  const [saved, setSaved] = useState(job.saved_by_me);
  const [applyOpen, setApplyOpen] = useState(false);

  const handleSave = async () => {
    const newState = !saved;
    setSaved(newState);
    try {
      if (newState) {
        await saveJob(job.id);
      } else {
        await unsaveJob(job.id);
      }
    } catch {
      setSaved(!newState); // revert on failure
    }
  };

  const typeLabel = JOB_TYPE_LABELS[job.job_type] ?? job.job_type;

  return (
    <>
      <Card className="transition-colors hover:border-line-2">
        <div className="flex gap-3.5">
          <JobLogo job={job} size={48} />
          <div className="min-w-0 flex-1">
            <div className="flex items-start gap-2">
              <div className="min-w-0 flex-1">
                <Link
                  href={`/jobs/${job.id}`}
                  className="text-[15px] font-semibold tracking-tightish hover:underline"
                >
                  {job.title}
                </Link>
                {job.company_name && (
                  <div className="mt-0.5 flex items-center gap-1.5 text-[12.5px] text-fg-2">
                    <Briefcase className="h-3 w-3 text-brand-blue" />
                    {job.company_name}
                  </div>
                )}
              </div>
              <button
                type="button"
                aria-label={saved ? "Saved" : "Save job"}
                onClick={handleSave}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-line-1 text-fg-3 hover:bg-bg-3 hover:text-fg-1"
              >
                <Bookmark
                  className="h-4 w-4"
                  fill={saved ? "currentColor" : "none"}
                />
              </button>
            </div>

            <p className="mt-2 line-clamp-2 text-[13px] leading-[1.5] text-fg-2">
              {job.description}
            </p>

            {/* Type chip */}
            <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
              <span className="rounded-full border border-line-1 bg-bg-3 px-2.5 py-1 text-[11.5px] font-medium text-fg-2">
                {typeLabel}
              </span>
              {job.has_applied && (
                <span className="rounded-full bg-success/15 px-2.5 py-1 text-[11.5px] font-semibold text-success">
                  Applied
                </span>
              )}
            </div>

            {/* Meta footer */}
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12px] text-fg-3">
              {job.location && (
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5" />
                  {job.location}
                </span>
              )}
              <span className="inline-flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5" />
                {compactNumber(job.application_count)} applied
              </span>
              <span className="ml-auto text-fg-4">
                {formatRelativeTime(job.created_at)}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-3.5 flex gap-2.5 border-t border-line-1 pt-3.5">
          <Button
            variant="primary"
            size="sm"
            onClick={() => setApplyOpen(true)}
            disabled={job.has_applied}
          >
            {job.has_applied ? "Applied" : "Apply"}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            icon={
              <Bookmark
                className="h-3.5 w-3.5"
                fill={saved ? "currentColor" : "none"}
              />
            }
            onClick={handleSave}
          >
            {saved ? "Saved" : "Save"}
          </Button>
          <Link
            href={`/jobs/${job.id}`}
            className="ml-auto inline-flex items-center text-[12.5px] font-medium text-brand-blue hover:underline"
          >
            View details →
          </Link>
        </div>
      </Card>

      <JobApplyModal
        open={applyOpen}
        onClose={() => setApplyOpen(false)}
        job={job}
      />
    </>
  );
}
