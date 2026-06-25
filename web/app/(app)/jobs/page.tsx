"use client";

import { useState } from "react";
import {
  Briefcase,
  ChevronLeft,
  ChevronRight,
  Plus,
  RefreshCw,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import dynamic from "next/dynamic";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { JobCard, JobLogo } from "@/components/jobs/JobCard";
import { WidgetCard } from "@/components/widgets/WidgetCard";

const CreateJobModal = dynamic(() => import("@/components/jobs/CreateJobModal").then(m => m.CreateJobModal), { ssr: false });
import {
  listJobs,
  listRecommendedJobs,
  type JobPostResponse,
} from "@/lib/api/jobs";

const FILTERS = ["All", "internship", "part-time", "full-time", "freelance"] as const;
type Filter = (typeof FILTERS)[number];

const FILTER_LABELS: Record<string, string> = {
  All: "All",
  internship: "Internship",
  "part-time": "Part-time",
  "full-time": "Full-time",
  freelance: "Freelance",
};

/* ── Skeleton ─────────────────────────────────────────────── */

function JobSkeleton() {
  return (
    <div className="animate-pulse rounded-md border border-line-1 bg-bg-2 p-[18px]">
      <div className="flex gap-3.5">
        <div className="h-12 w-12 shrink-0 rounded-xl bg-bg-3" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-2/5 rounded bg-bg-3" />
          <div className="h-3 w-1/4 rounded bg-bg-3" />
          <div className="mt-3 h-10 w-full rounded bg-bg-3" />
          <div className="mt-2 flex gap-2">
            <div className="h-6 w-20 rounded-full bg-bg-3" />
            <div className="h-6 w-16 rounded-full bg-bg-3" />
          </div>
          <div className="mt-2 flex gap-4">
            <div className="h-3 w-24 rounded bg-bg-3" />
            <div className="h-3 w-16 rounded bg-bg-3" />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Main page ───────────────────────────────────────────── */

export default function JobsPage() {
  const [filter, setFilter] = useState<Filter>("All");
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeSearch, setActiveSearch] = useState("");
  const [jobModalOpen, setJobModalOpen] = useState(false);

  // Reset page when filter changes
  const handleFilterChange = (f: Filter) => {
    setFilter(f);
    setPage(1);
  };

  // Handle search submit
  const handleSearch = () => {
    setActiveSearch(searchQuery.trim());
    setPage(1);
  };

  // ── Jobs list query
  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: [
      "jobs",
      {
        page,
        filter: filter === "All" ? null : filter,
        q: activeSearch || null,
      },
    ],
    queryFn: () =>
      listJobs({
        page,
        pageSize: 20,
        jobType: filter === "All" ? null : filter,
        q: activeSearch || null,
      }),
  });

  // ── Recommended jobs for sidebar
  const recommendedQuery = useQuery({
    queryKey: ["jobs", "recommended"],
    queryFn: () => listRecommendedJobs(3),
  });

  const jobs: JobPostResponse[] = data?.items ?? [];
  const totalPages = data?.total_pages ?? 1;
  const totalJobs = data?.total ?? 0;
  const recommended = recommendedQuery.data ?? [];

  return (
    <AppShell
      topBar={{
        breadcrumb: "Opportunities",
        title: "Jobs & internships",
      }}
      rightRail={
        <>
          {/* Recommended jobs widget */}
          <WidgetCard title="Recommended for you">
            {recommendedQuery.isLoading && (
              <div className="space-y-2 p-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="h-3.5 w-3/4 rounded bg-bg-3" />
                    <div className="mt-1 h-3 w-1/2 rounded bg-bg-3" />
                  </div>
                ))}
              </div>
            )}
            {!recommendedQuery.isLoading &&
              recommended.map((j, i) => (
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
            {!recommendedQuery.isLoading && recommended.length === 0 && (
              <div className="px-3 py-4 text-center text-[12px] text-fg-3">
                No recommendations yet
              </div>
            )}
          </WidgetCard>
        </>
      }
    >
      <div className="mx-auto max-w-[760px] px-4 py-5 sm:px-8 sm:py-6">
        {/* Header with Post a Job button */}
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-[20px] font-bold tracking-tighter">Browse opportunities</h2>
          <Button
            size="sm"
            icon={<Plus className="h-3.5 w-3.5" />}
            onClick={() => setJobModalOpen(true)}
          >
            Post a job
          </Button>
        </div>

        {/* Search + filter bar */}
        <div className="mb-4 flex items-center gap-2.5">
          <div className="flex h-10 flex-1 items-center gap-2.5 rounded-md border border-line-2 bg-bg-2 px-3.5">
            <Search className="h-4 w-4 text-fg-3" />
            <input
              type="text"
              placeholder="Search roles, companies, skills…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="h-full flex-1 bg-transparent text-[13.5px] text-fg-1 placeholder:text-fg-3 focus:outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setActiveSearch("");
                  setPage(1);
                }}
                className="text-[11px] font-medium text-fg-3 hover:text-fg-1"
              >
                Clear
              </button>
            )}
          </div>
          <button
            onClick={handleSearch}
            className="flex h-10 items-center gap-2 rounded-md border border-line-1 bg-bg-2 px-3.5 text-[13px] font-medium text-fg-2 hover:text-fg-1"
          >
            <SlidersHorizontal className="h-4 w-4" />
            <span className="hidden sm:inline">Search</span>
          </button>
        </div>

        {/* Filter chips */}
        <div className="mb-5 flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <Chip
              key={f}
              active={filter === f}
              onClick={() => handleFilterChange(f)}
            >
              {FILTER_LABELS[f]}
            </Chip>
          ))}
        </div>

        {/* ── Loading state ──────────────────────────────── */}
        {isLoading && (
          <div className="flex flex-col gap-3.5">
            {Array.from({ length: 4 }).map((_, i) => (
              <JobSkeleton key={i} />
            ))}
          </div>
        )}

        {/* ── Error state ────────────────────────────────── */}
        {isError && !isLoading && (
          <div className="flex flex-col items-center gap-3 rounded-md border border-danger/20 bg-danger/[0.06] px-6 py-8 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-danger/10 text-danger">
              <span className="text-lg font-bold">!</span>
            </div>
            <p className="text-[14px] font-medium text-fg-1">
              Could not load jobs
            </p>
            <p className="max-w-[360px] text-[13px] text-fg-3">
              {(error as Error)?.message ??
                "Something went wrong. Please try again."}
            </p>
            <Button
              variant="ghost"
              size="sm"
              icon={<RefreshCw className="h-3.5 w-3.5" />}
              onClick={() => refetch()}
              disabled={isFetching}
            >
              {isFetching ? "Retrying..." : "Try again"}
            </Button>
          </div>
        )}

        {/* ── Empty state ────────────────────────────────── */}
        {!isLoading && !isError && jobs.length === 0 && (
          <div className="flex flex-col items-center gap-3 rounded-md border border-line-2 bg-bg-2 px-6 py-12 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-lg border border-brand-purple/30 bg-brand-purple/10 text-brand-purple">
              <Briefcase className="h-7 w-7" />
            </div>
            <h3 className="text-[18px] font-bold tracking-tighter">
              {activeSearch || filter !== "All"
                ? "No matching jobs"
                : "No jobs posted yet"}
            </h3>
            <p className="max-w-[400px] text-[13.5px] leading-[1.5] text-fg-2">
              {activeSearch || filter !== "All"
                ? "Try adjusting your search or filters to find more opportunities."
                : "Job postings will appear here as they're created. Check back soon!"}
            </p>
            {(activeSearch || filter !== "All") && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setFilter("All");
                  setSearchQuery("");
                  setActiveSearch("");
                  setPage(1);
                }}
              >
                Clear filters
              </Button>
            )}
          </div>
        )}

        {/* ── Job list ───────────────────────────────────── */}
        {!isLoading && jobs.length > 0 && (
          <>
            <div className="mb-3 flex items-center gap-2 px-1 text-[12.5px] text-fg-3">
              <Briefcase className="h-3.5 w-3.5" />
              {totalJobs}{" "}
              {filter === "All"
                ? "open roles"
                : `${FILTER_LABELS[filter]?.toLowerCase()} roles`}{" "}
              for verified students
            </div>

            <div className="flex flex-col gap-3.5">
              {jobs.map((j) => (
                <JobCard key={j.id} job={j} />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-6 flex items-center justify-center gap-3">
                <Button
                  variant="ghost"
                  size="sm"
                  icon={<ChevronLeft className="h-4 w-4" />}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1 || isFetching}
                >
                  Prev
                </Button>
                <span className="text-[13px] text-fg-3">
                  Page {page} of {totalPages}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    setPage((p) => Math.min(totalPages, p + 1))
                  }
                  disabled={page >= totalPages || isFetching}
                >
                  Next
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      <CreateJobModal open={jobModalOpen} onClose={() => setJobModalOpen(false)} />
    </AppShell>
  );
}
