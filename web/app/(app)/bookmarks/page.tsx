"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import {
  Bookmark,
  Briefcase,
  ChevronLeft,
  FolderOpen,
  Loader2,
  MapPin,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Field } from "@/components/ui/Field";
import { FeedPostCard } from "@/components/post/FeedPostCard";
import { WidgetCard } from "@/components/widgets/WidgetCard";
import type { FeedPost, PaginatedResponse } from "@/lib/api/feed";
import api from "@/lib/api/client";

const FILTERS = ["All", "Posts", "Jobs"] as const;
type Filter = (typeof FILTERS)[number];

const GRADIENT_HUES = [
  ["#9B6CFF", "#5C8FFF"],
  ["#5AE0B6", "#34A8FF"],
  ["#FFB547", "#FF6A6A"],
  ["#FF6ECB", "#9B6CFF"],
  ["#34A8FF", "#5AE0B6"],
  ["#FF8A65", "#FFB547"],
];

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

interface Collection {
  id: string;
  name: string;
  post_count: number;
  created_at: string;
}

export default function BookmarksPage() {
  const [filter, setFilter] = useState<Filter>("All");
  const [activeCollectionId, setActiveCollectionId] = useState<string | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [renameModal, setRenameModal] = useState<Collection | null>(null);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const queryClient = useQueryClient();

  /* ── Collections query ──────────────────────────── */
  const { data: collections = [] } = useQuery({
    queryKey: ["saved-collections"],
    queryFn: async (): Promise<Collection[]> => {
      const res = await api.get<Collection[]>("/users/me/saved-collections");
      return res.data;
    },
  });

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
    enabled: !activeCollectionId,
  });

  /* ── Collection posts query ─────────────────────── */
  const {
    data: collectionPostsData,
    isLoading: collectionPostsLoading,
  } = useQuery({
    queryKey: ["collection-posts", activeCollectionId],
    queryFn: async (): Promise<PaginatedResponse<FeedPost>> => {
      const res = await api.get<PaginatedResponse<FeedPost>>(
        `/users/me/saved-collections/${activeCollectionId}`,
        { params: { page: 1, page_size: 50 } },
      );
      return res.data;
    },
    enabled: !!activeCollectionId,
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
    enabled: !activeCollectionId,
  });

  /* ── Delete collection ──────────────────────────── */
  const deleteCollectionMut = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/users/me/saved-collections/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saved-collections"] });
      if (activeCollectionId) setActiveCollectionId(null);
    },
  });

  const savedPosts = savedPostsData?.items ?? [];
  const savedJobs = savedJobsData?.items ?? [];
  const collectionPosts = collectionPostsData?.items ?? [];
  const activeCollection = collections.find((c) => c.id === activeCollectionId);

  const showPosts = filter === "All" || filter === "Posts";
  const showJobs = filter === "All" || filter === "Jobs";

  const isLoading = activeCollectionId
    ? collectionPostsLoading
    : (showPosts && postsLoading) || (showJobs && jobsLoading);

  const allEmpty =
    !isLoading && !activeCollectionId && savedPosts.length === 0 && savedJobs.length === 0;

  /* ── Unsave job handler ─────────────────────────── */
  const handleUnsaveJob = useCallback(
    async (jobId: string) => {
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
        queryClient.invalidateQueries({ queryKey: ["saved-jobs"] });
      }
    },
    [queryClient],
  );

  /* ── Filter posts by search ─────────────────────── */
  const filterBySearch = <T extends { title?: string; description?: string; content?: string }>(
    items: T[],
  ): T[] => {
    if (!searchQuery.trim()) return items;
    const q = searchQuery.toLowerCase();
    return items.filter(
      (item) =>
        item.title?.toLowerCase().includes(q) ||
        item.description?.toLowerCase().includes(q) ||
        item.content?.toLowerCase().includes(q),
    );
  };

  const filteredPosts = filterBySearch(activeCollectionId ? collectionPosts : savedPosts);
  const filteredJobs = filterBySearch(savedJobs);

  return (
    <AppShell
      topBar={{ breadcrumb: "Saved", title: activeCollection ? activeCollection.name : "Bookmarks" }}
      rightRail={
        <>
          <WidgetCard
            title="Collections"
            action={
              <button
                onClick={() => setCreateModalOpen(true)}
                className="flex items-center gap-1 text-[12px] font-medium text-brand-blue hover:underline"
              >
                <Plus className="h-3 w-3" />
                New
              </button>
            }
          >
            {collections.length === 0 ? (
              <div className="px-3 py-4 text-center text-[12.5px] text-fg-3">
                No collections yet
              </div>
            ) : (
              collections.map((c, i) => (
                <div
                  key={c.id}
                  className={`group relative flex cursor-pointer items-center gap-2.5 px-3 py-2.5 transition-colors hover:bg-bg-3 ${
                    activeCollectionId === c.id ? "bg-bg-3" : ""
                  }`}
                  style={{
                    borderTop: i ? "1px solid var(--line-1)" : "none",
                  }}
                  onClick={() =>
                    setActiveCollectionId(
                      activeCollectionId === c.id ? null : c.id,
                    )
                  }
                >
                  <span
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] text-white"
                    style={{
                      background: `linear-gradient(135deg, ${GRADIENT_HUES[i % GRADIENT_HUES.length][0]}, ${GRADIENT_HUES[i % GRADIENT_HUES.length][1]})`,
                    }}
                  >
                    <FolderOpen className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13px] font-semibold">
                      {c.name}
                    </div>
                    <div className="text-[11px] text-fg-3">
                      {c.post_count} saved
                    </div>
                  </div>
                  <div className="relative">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenuOpen(menuOpen === c.id ? null : c.id);
                      }}
                      className="flex h-6 w-6 items-center justify-center rounded-md text-fg-4 opacity-0 transition-opacity hover:bg-bg-2 hover:text-fg-2 group-hover:opacity-100"
                    >
                      <MoreHorizontal className="h-3.5 w-3.5" />
                    </button>
                    {menuOpen === c.id && (
                      <CollectionMenu
                        onRename={() => {
                          setMenuOpen(null);
                          setRenameModal(c);
                        }}
                        onDelete={() => {
                          setMenuOpen(null);
                          deleteCollectionMut.mutate(c.id);
                        }}
                        onClose={() => setMenuOpen(null)}
                      />
                    )}
                  </div>
                </div>
              ))
            )}
          </WidgetCard>
          {!activeCollectionId && (
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
          )}
        </>
      }
    >
      <div className="mx-auto max-w-[720px] px-4 py-5 sm:px-8 sm:py-6">
        {/* Back button when viewing a collection */}
        {activeCollectionId && (
          <button
            onClick={() => setActiveCollectionId(null)}
            className="mb-4 flex items-center gap-1.5 text-[13px] font-medium text-fg-3 hover:text-fg-1"
          >
            <ChevronLeft className="h-4 w-4" />
            Back to all bookmarks
          </button>
        )}

        {/* Search */}
        <div className="mb-4 flex h-10 items-center gap-2.5 rounded-md border border-line-2 bg-bg-2 px-3.5 text-[13.5px]">
          <Search className="h-4 w-4 text-fg-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search your bookmarks…"
            className="h-full flex-1 bg-transparent text-fg-1 placeholder:text-fg-4 focus:outline-none"
          />
        </div>

        {/* Filters (only when not viewing a collection) */}
        {!activeCollectionId && (
          <div className="mb-5 flex flex-wrap gap-2">
            {FILTERS.map((f) => (
              <Chip key={f} active={filter === f} onClick={() => setFilter(f)}>
                {f}
              </Chip>
            ))}
          </div>
        )}

        {/* Loading state */}
        {isLoading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-brand-purple" />
          </div>
        )}

        {/* Error state */}
        {(postsError || jobsError) && !isLoading && !activeCollectionId && (
          <div className="rounded-md border border-danger/30 bg-danger/10 px-4 py-3 text-[13px] text-danger">
            Failed to load bookmarks. Please try again.
          </div>
        )}

        {/* Collection view */}
        {activeCollectionId && !collectionPostsLoading && (
          <>
            {filteredPosts.length === 0 ? (
              <CollectionEmpty name={activeCollection?.name ?? "Collection"} />
            ) : (
              <div>
                <SectionLabel icon={<FolderOpen className="h-3.5 w-3.5" />}>
                  {activeCollection?.name} · {filteredPosts.length}
                </SectionLabel>
                {filteredPosts.map((p) => (
                  <FeedPostCard key={p.id} post={p} />
                ))}
              </div>
            )}
          </>
        )}

        {/* All bookmarks view */}
        {!activeCollectionId && !isLoading && !postsError && !jobsError && (
          <>
            {allEmpty && <BookmarksEmpty type="all" />}

            {!allEmpty && (
              <>
                {/* Saved posts */}
                {showPosts && filteredPosts.length > 0 && (
                  <div className="mb-6">
                    <SectionLabel icon={<Bookmark className="h-3.5 w-3.5" />}>
                      Saved posts · {filteredPosts.length}
                    </SectionLabel>
                    {filteredPosts.map((p) => (
                      <FeedPostCard key={p.id} post={p} />
                    ))}
                  </div>
                )}

                {filter === "Posts" && filteredPosts.length === 0 && (
                  <BookmarksEmpty type="posts" />
                )}

                {/* Saved jobs */}
                {showJobs && filteredJobs.length > 0 && (
                  <div>
                    <SectionLabel icon={<Briefcase className="h-3.5 w-3.5" />}>
                      Saved jobs · {filteredJobs.length}
                    </SectionLabel>
                    <div className="flex flex-col gap-3">
                      {filteredJobs.map((j) => (
                        <SavedJobCard
                          key={j.id}
                          job={j}
                          onUnsave={() => handleUnsaveJob(j.id)}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {filter === "Jobs" && filteredJobs.length === 0 && (
                  <BookmarksEmpty type="jobs" />
                )}
              </>
            )}
          </>
        )}
      </div>

      {/* Create collection modal */}
      <CreateCollectionModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
      />

      {/* Rename collection modal */}
      {renameModal && (
        <RenameCollectionModal
          collection={renameModal}
          onClose={() => setRenameModal(null)}
        />
      )}
    </AppShell>
  );
}

/* ── Create collection modal ──────────────────────────────── */

function CreateCollectionModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (collectionName: string) => {
      await api.post("/users/me/saved-collections", { name: collectionName });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saved-collections"] });
      setName("");
      onClose();
    },
  });

  return (
    <Modal open={open} onClose={onClose} title="New collection">
      <Field
        label="Collection name"
        type="text"
        placeholder="e.g. Study resources, Internships..."
        value={name}
        onChange={(e) => setName(e.target.value)}
        maxLength={100}
        icon={<FolderOpen className="h-4 w-4" />}
      />
      <div className="mt-4 flex justify-end gap-2.5">
        <Button variant="ghost" size="sm" onClick={onClose}>
          Cancel
        </Button>
        <Button
          size="sm"
          onClick={() => mutation.mutate(name.trim())}
          disabled={!name.trim() || mutation.isPending}
        >
          {mutation.isPending ? "Creating..." : "Create"}
        </Button>
      </div>
    </Modal>
  );
}

/* ── Rename collection modal ──────────────────────────────── */

function RenameCollectionModal({
  collection,
  onClose,
}: {
  collection: Collection;
  onClose: () => void;
}) {
  const [name, setName] = useState(collection.name);
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (newName: string) => {
      await api.patch(`/users/me/saved-collections/${collection.id}`, {
        name: newName,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saved-collections"] });
      onClose();
    },
  });

  return (
    <Modal open={true} onClose={onClose} title="Rename collection">
      <Field
        label="Collection name"
        type="text"
        placeholder="Collection name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        maxLength={100}
        icon={<Pencil className="h-4 w-4" />}
      />
      <div className="mt-4 flex justify-end gap-2.5">
        <Button variant="ghost" size="sm" onClick={onClose}>
          Cancel
        </Button>
        <Button
          size="sm"
          onClick={() => mutation.mutate(name.trim())}
          disabled={!name.trim() || name.trim() === collection.name || mutation.isPending}
        >
          {mutation.isPending ? "Saving..." : "Save"}
        </Button>
      </div>
    </Modal>
  );
}

/* ── Collection context menu ──────────────────────────────── */

function CollectionMenu({
  onRename,
  onDelete,
  onClose,
}: {
  onRename: () => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div className="absolute right-0 top-7 z-50 w-36 overflow-hidden rounded-md border border-line-1 bg-bg-2 shadow-lg">
        <button
          onClick={onRename}
          className="flex w-full items-center gap-2 px-3 py-2 text-[12.5px] text-fg-2 hover:bg-bg-3"
        >
          <Pencil className="h-3.5 w-3.5" />
          Rename
        </button>
        <button
          onClick={onDelete}
          className="flex w-full items-center gap-2 px-3 py-2 text-[12.5px] text-danger hover:bg-bg-3"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Delete
        </button>
      </div>
    </>
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
      <Link
        href={type === "jobs" ? "/jobs" : "/"}
        className="mt-5 inline-flex h-9 items-center rounded-md bg-acc-gradient px-4 text-[13px] font-semibold text-white shadow-acc"
      >
        {type === "jobs" ? "Browse jobs" : "Browse feed"}
      </Link>
    </div>
  );
}

function CollectionEmpty({ name }: { name: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-line-2 bg-bg-2/50 px-8 py-16 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-brand-purple/30 bg-brand-purple/10 text-brand-purple">
        <FolderOpen className="h-7 w-7" strokeWidth={1.5} />
      </div>
      <h3 className="mt-5 text-[18px] font-bold tracking-tighter">
        {name} is empty
      </h3>
      <p className="mt-2 max-w-[340px] text-[13.5px] leading-[1.55] text-fg-2">
        Save posts to this collection by clicking the bookmark icon on any post,
        then choosing this collection.
      </p>
    </div>
  );
}
