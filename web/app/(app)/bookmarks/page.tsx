"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import {
  Bookmark,
  Briefcase,
  FolderOpen,
  Loader2,
  MapPin,
  Search,
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { FeedPostCard } from "@/components/post/FeedPostCard";
import { WidgetCard } from "@/components/widgets/WidgetCard";
import type { FeedPost, PaginatedResponse } from "@/lib/api/feed";
import api from "@/lib/api/client";

const FILTERS = ["All", "Posts", "Jobs"] as const;
type Filter = (typeof FILTERS)[number];

/* ── Backend job shape from GET /jobs/saved ────────────────── */

interface SavedJobAuthor {
  id: string;
  username: string;
  full_name: string;
  profile_image_url: string | null;
}

interface SavedJob {
  id: string;
  author: SavedJobAuthor;
  title: string;
  description: string;
  company_name: string | null;
  location: string | null;
  job_type: string;
  is_active: boolean;
  application_count: number;
  has_applied: boolean;
  saved_by_me: boolean;
  created_at: string;
  updated_at: string;
}

const COLLECTIONS = [
  { name: "Read later", count: 8, hue: ["#9B6CFF", "#5C8FFF"] },
  { name: "PS3 references", count: 5, hue: ["#5AE0B6", "#34A8FF"] },
  { name: "Internships", count: 3, hue: ["#FFB547", "#FF6A6A"] },
];

export default function BookmarksPage() {
  const [filter, setFilter] = useState<Filter>("All");
  const queryClient = useQueryClient();

  /* ── Saved posts query ──────────────────────────── */
  const {
    data: savedPostsData,
    isLoading: postsLoading,
    isError: postsError,
  } = useQuery({
    queryKey: ["saved-posts"],
    queryFn: async (): Promise<PaginatedResponse<FeedPost>> => {
      const res = await api.get<PaginatedResponse<FeedPost>>(
        "/users/me/saved-posts",
        { params: { page: 1, page_size: 50 } },
      );
      return res.data;
    },
  });

  /* ── Saved jobs query ───────────────────────────── */
  const {
    data: savedJobsData,
    isLoading: jobsLoading,
    isError: jobsError,
  } = useQuery({
    queryKey: ["saved-jobs"],
    queryFn: async (): Promise<PaginatedResponse<SavedJob>> => {
      const res = await api.get<PaginatedResponse<SavedJob>>(
        "/jobs/saved",
        { params: { page: 1, page_size: 50 } },
      );
      return res.data;
    },
  });

  const savedPosts = savedPostsData?.items ?? [];
  const savedJobs = savedJobsData?.items ?? [];

  const showPosts = filter === "All" || filter === "Posts";
  const showJobs = filter === "All" || filter === "Jobs";

  const isLoading = (showPosts && postsLoading) || (showJobs && jobsLoading);
  const allEmpty =
    !isLoading && savedPosts.length === 0 && savedJobs.length === 0;

  /* ── Unsave job handler ─────────────────────────── */
  const handleUnsaveJob = useCallback(
    async (jobId: string) => {
      // Optimistic remove
      queryClient.setQueryData<PaginatedResponse<SavedJob>>(
        ["saved-jobs"],
        (old) => {
          if (!old) return old;
          return {
            ...old,
            items: old.items.filter((j) => j.id !== jobId),
            total: old.total - 1,
          };
        },
      );
      try {
        await api.delete(`/jobs/${jobId}/save`);
      } catch {
        // Refetch on error to revert
        queryClient.invalidateQueries({ queryKey: ["saved-jobs"] });
      }
    },
    [queryClient],
  );

  return (
    <AppShell
      topBar={{ breadcrumb: "Saved", title: "Bookmarks" }}
      rightRail={
        <>
          <WidgetCard
            title="Collections"
            action={
              <button className="text-[12px] font-medium text-brand-blue hover:underline">
                New
              </button>
            }
          >
            {COLLECTIONS.map((c, i) => (
              <div
                key={c.name}
                className="flex items-center gap-2.5 px-3 py-2.5"
                style={{
                  borderTop: i ? "1px solid var(--line-1)" : "none",
                }}
              >
                <span
                  className="flex h-8 w-8 items-center justify-center rounded-[9px] text-white"
                  style={{
                    background: `linear-gradient(135deg, ${c.hue[0]}, ${c.hue[1]})`,
                  }}
                >
                  <FolderOpen className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] font-semibold">
                    {c.name}
                  </div>
                  <div className="text-[11px] text-fg-3">{c.count} saved</div>
                </div>
              </div>
            ))}
          </WidgetCard>
          <WidgetCard title="Quick filters">
            <div className="flex flex-col gap-1 p-2">
              {FILTERS.map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`flex items-center justify-between rounded-md px-3 py-2 text-[13px] ${
                    filter === f
                      ? "bg-bg-3 font-semibold text-fg-1"
                      : "font-medium text-fg-2 hover:bg-bg-3 hover:text-fg-1"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </WidgetCard>
        </>
      }
    >
      <div className="mx-auto max-w-[720px] px-4 py-5 sm:px-8 sm:py-6">
        {/* Search */}
        <div className="mb-4 flex h-10 items-center gap-2.5 rounded-md border border-line-2 bg-bg-2 px-3.5 text-[13.5px] text-fg-3">
          <Search className="h-4 w-4" />
          <span>Search your bookmarks…</span>
        </div>

        {/* Filters */}
        <div className="mb-5 flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <Chip key={f} active={filter === f} onClick={() => setFilter(f)}>
              {f}
            </Chip>
          ))}
        </div>

        {/* Loading state */}
        {isLoading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-brand-purple" />
          </div>
        )}

        {/* Error state */}
        {(postsError || jobsError) && !isLoading && (
          <div className="rounded-md border border-danger/30 bg-danger/10 px-4 py-3 text-[13px] text-danger">
            Failed to load bookmarks. Please try again.
          </div>
        )}

        {/* Global empty state (nothing saved at all) */}
        {!isLoading && !postsError && !jobsError && allEmpty && (
          <BookmarksEmpty type="all" />
        )}

        {!isLoading && !postsError && !jobsError && !allEmpty && (
          <>
            {/* Saved posts */}
            {showPosts && savedPosts.length > 0 && (
              <div className="mb-6">
                <SectionLabel icon={<Bookmark className="h-3.5 w-3.5" />}>
                  Saved posts · {savedPosts.length}
                </SectionLabel>
                {savedPosts.map((p) => (
                  <FeedPostCard key={p.id} post={p} />
                ))}
              </div>
            )}

            {/* Saved posts empty (only when filtered to Posts) */}
            {filter === "Posts" && savedPosts.length === 0 && (
              <BookmarksEmpty type="posts" />
            )}

            {/* Saved jobs */}
            {showJobs && savedJobs.length > 0 && (
              <div>
                <SectionLabel icon={<Briefcase className="h-3.5 w-3.5" />}>
                  Saved jobs · {savedJobs.length}
                </SectionLabel>
                <div className="flex flex-col gap-3">
                  {savedJobs.map((j) => (
                    <SavedJobCard
                      key={j.id}
                      job={j}
                      onUnsave={() => handleUnsaveJob(j.id)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Saved jobs empty (only when filtered to Jobs) */}
            {filter === "Jobs" && savedJobs.length === 0 && (
              <BookmarksEmpty type="jobs" />
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}

/* ── Saved job card ────────────────────────────────────────── */

function SavedJobCard({
  job,
  onUnsave,
}: {
  job: SavedJob;
  onUnsave: () => void;
}) {
  const typeLabel =
    job.job_type === "part-time"
      ? "Part-time"
      : job.job_type === "full-time"
        ? "Full-time"
        : job.job_type === "freelance"
          ? "Freelance"
          : "Internship";

  return (
    <Card className="transition-colors hover:border-line-2">
      <div className="flex gap-3.5">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px] bg-brand-purple/15 text-brand-purple">
          <Briefcase className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-2">
            <div className="min-w-0 flex-1">
              <Link
                href={`/jobs/${job.id}`}
                className="text-[15px] font-semibold tracking-tightish hover:underline"
              >
                {job.title}
              </Link>
              <div className="mt-0.5 text-[12.5px] text-fg-2">
                {job.company_name ?? job.author.full_name}
              </div>
            </div>
            <button
              type="button"
              aria-label="Unsave job"
              onClick={onUnsave}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-line-1 text-brand-purple hover:bg-bg-3"
            >
              <Bookmark className="h-4 w-4" fill="currentColor" />
            </button>
          </div>

          <p className="mt-2 line-clamp-2 text-[13px] leading-[1.5] text-fg-2">
            {job.description}
          </p>

          <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12px] text-fg-3">
            <span className="rounded-full border border-line-1 bg-bg-3 px-2.5 py-1 text-[11.5px] font-medium text-fg-2">
              {typeLabel}
            </span>
            {job.location && (
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5" />
                {job.location}
              </span>
            )}
            <span className="text-fg-4">
              {job.application_count} applied
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
}

/* ── Shared helpers ────────────────────────────────────────── */

function SectionLabel({
  icon,
  children,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-2.5 flex items-center gap-1.5 px-1 font-mono text-[11px] uppercase tracking-[0.08em] text-fg-3">
      {icon}
      {children}
    </div>
  );
}

function BookmarksEmpty({ type }: { type: "posts" | "jobs" | "all" }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-line-2 bg-bg-2/50 px-8 py-16 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-brand-purple/30 bg-brand-purple/10 text-brand-purple">
        <Bookmark className="h-7 w-7" strokeWidth={1.5} />
      </div>
      <h3 className="mt-5 text-[18px] font-bold tracking-tighter">
        {type === "jobs"
          ? "No saved jobs yet"
          : type === "posts"
            ? "No saved posts yet"
            : "Nothing saved yet"}
      </h3>
      <p className="mt-2 max-w-[340px] text-[13.5px] leading-[1.55] text-fg-2">
        {type === "jobs"
          ? "When you bookmark a job from the Jobs board, it'll show up here for easy access."
          : type === "posts"
            ? "When you bookmark a post, it'll show up here so you can find it later."
            : "Save posts and jobs to find them quickly later."}
      </p>
      <a
        href={type === "jobs" ? "/jobs" : "/"}
        className="mt-5 inline-flex h-9 items-center rounded-md bg-acc-gradient px-4 text-[13px] font-semibold text-white shadow-acc"
      >
        {type === "jobs" ? "Browse jobs" : "Browse feed"}
      </a>
    </div>
  );
}
