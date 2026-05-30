import Link from "next/link";
import { Bookmark, MapPin, Users } from "lucide-react";
import { GraduationCap } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import type { Job } from "@/lib/mock-data-jobs";
import { compactNumber } from "@/lib/utils";

interface JobCardProps {
  job: Job;
}

/** Job logo tile — gradient + glyph, matches CommunityIcon language. */
function JobLogo({ job, size = 48 }: { job: Job; size?: number }) {
  const [from, to] = job.hue;
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center"
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.28,
        background: `linear-gradient(135deg, ${from}, ${to})`,
        fontSize: size * 0.42,
        lineHeight: 1,
        boxShadow:
          "inset 0 1px 1px rgba(255,255,255,0.25), inset 0 -2px 6px rgba(0,0,0,0.18)",
      }}
    >
      {job.glyph}
    </span>
  );
}

export { JobLogo };

/** Full job card for the listing page. */
export function JobCard({ job }: JobCardProps) {
  return (
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
              <div className="mt-0.5 flex items-center gap-1.5 text-[12.5px] text-fg-2">
                {job.orgKind === "university" && (
                  <GraduationCap className="h-3 w-3 text-brand-blue" />
                )}
                {job.org}
              </div>
            </div>
            <button
              type="button"
              aria-label={job.saved ? "Saved" : "Save job"}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-line-1 text-fg-3 hover:bg-bg-3 hover:text-fg-1"
            >
              <Bookmark
                className="h-4 w-4"
                fill={job.saved ? "currentColor" : "none"}
              />
            </button>
          </div>

          <p className="mt-2 line-clamp-2 text-[13px] leading-[1.5] text-fg-2">
            {job.blurb}
          </p>

          {/* Type chips */}
          <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
            {job.types.map((t) => (
              <span
                key={t}
                className="rounded-full border border-line-1 bg-bg-3 px-2.5 py-1 text-[11.5px] font-medium text-fg-2"
              >
                {t}
              </span>
            ))}
          </div>

          {/* Meta footer */}
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12px] text-fg-3">
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5" />
              {job.location}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5" />
              {compactNumber(job.applicants)} applied
            </span>
            <span className="font-medium text-fg-1">{job.pay}</span>
            <span className="ml-auto text-fg-4">{job.posted}</span>
          </div>
        </div>
      </div>

      <div className="mt-3.5 flex gap-2.5 border-t border-line-1 pt-3.5">
        <Button variant="primary" size="sm">
          Apply
        </Button>
        <Button
          variant="ghost"
          size="sm"
          icon={
            <Bookmark
              className="h-3.5 w-3.5"
              fill={job.saved ? "currentColor" : "none"}
            />
          }
        >
          {job.saved ? "Saved" : "Save"}
        </Button>
        <Link
          href={`/jobs/${job.id}`}
          className="ml-auto inline-flex items-center text-[12.5px] font-medium text-brand-blue hover:underline"
        >
          View details →
        </Link>
      </div>
    </Card>
  );
}
