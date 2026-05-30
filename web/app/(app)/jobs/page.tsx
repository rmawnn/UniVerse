"use client";

import { useState } from "react";
import { Briefcase, Search, SlidersHorizontal } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Chip } from "@/components/ui/Chip";
import { JobCard, JobLogo } from "@/components/jobs/JobCard";
import { WidgetCard } from "@/components/widgets/WidgetCard";
import { JOBS, RECOMMENDED_JOBS, type JobType } from "@/lib/mock-data-jobs";
import Link from "next/link";

const FILTERS: Array<JobType | "All"> = [
  "All",
  "Internship",
  "Part-time",
  "Remote",
  "Campus",
];

export default function JobsPage() {
  const [filter, setFilter] = useState<JobType | "All">("All");

  const jobs =
    filter === "All" ? JOBS : JOBS.filter((j) => j.types.includes(filter));

  return (
    <AppShell
      topBar={{
        breadcrumb: "Opportunities",
        title: "Jobs & internships",
      }}
      rightRail={
        <>
          <WidgetCard title="Recommended for you">
            {RECOMMENDED_JOBS.map((j, i) => (
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
          <WidgetCard title="Your application stats">
            <div className="flex flex-col gap-2 p-3.5">
              {[
                ["Applied", "4"],
                ["In review", "2"],
                ["Saved", "7"],
              ].map(([l, v]) => (
                <div
                  key={l}
                  className="flex items-center justify-between text-[13px]"
                >
                  <span className="text-fg-3">{l}</span>
                  <b className="tabular-nums">{v}</b>
                </div>
              ))}
            </div>
          </WidgetCard>
        </>
      }
    >
      <div className="mx-auto max-w-[760px] px-4 py-5 sm:px-8 sm:py-6">
        {/* Search + filter bar */}
        <div className="mb-4 flex items-center gap-2.5">
          <div className="flex h-10 flex-1 items-center gap-2.5 rounded-md border border-line-2 bg-bg-2 px-3.5 text-[13.5px] text-fg-3">
            <Search className="h-4 w-4" />
            <span>Search roles, companies, skills…</span>
          </div>
          <button className="flex h-10 items-center gap-2 rounded-md border border-line-1 bg-bg-2 px-3.5 text-[13px] font-medium text-fg-2 hover:text-fg-1">
            <SlidersHorizontal className="h-4 w-4" />
            <span className="hidden sm:inline">Filters</span>
          </button>
        </div>

        <div className="mb-5 flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <Chip key={f} active={filter === f} onClick={() => setFilter(f)}>
              {f}
            </Chip>
          ))}
        </div>

        <div className="mb-3 flex items-center gap-2 px-1 text-[12.5px] text-fg-3">
          <Briefcase className="h-3.5 w-3.5" />
          {jobs.length} {filter === "All" ? "open roles" : `${filter.toLowerCase()} roles`} for verified students
        </div>

        <div className="flex flex-col gap-3.5">
          {jobs.map((j) => (
            <JobCard key={j.id} job={j} />
          ))}
        </div>
      </div>
    </AppShell>
  );
}
