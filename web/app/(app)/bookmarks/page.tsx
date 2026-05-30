"use client";

import { useState } from "react";
import { Bookmark, FolderOpen, Hash, Search } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Chip } from "@/components/ui/Chip";
import { PostCard } from "@/components/post/PostCard";
import { CommunityRow } from "@/components/community/CommunityRow";
import { WidgetCard } from "@/components/widgets/WidgetCard";
import { COMMUNITIES, SAMPLE_POSTS } from "@/lib/mock-data";

const FILTERS = ["All", "Posts", "Communities", "Jobs"] as const;
type Filter = (typeof FILTERS)[number];

const SAVED_POSTS = SAMPLE_POSTS.slice(0, 3);
const SAVED_COMMUNITIES = COMMUNITIES.filter((c) => c.joined).slice(0, 2);

const COLLECTIONS = [
  { name: "Read later", count: 8, hue: ["#9B6CFF", "#5C8FFF"] },
  { name: "PS3 references", count: 5, hue: ["#5AE0B6", "#34A8FF"] },
  { name: "Internships", count: 3, hue: ["#FFB547", "#FF6A6A"] },
];

export default function BookmarksPage() {
  const [filter, setFilter] = useState<Filter>("All");

  const showPosts = filter === "All" || filter === "Posts";
  const showCommunities = filter === "All" || filter === "Communities";
  const showEmpty = filter === "Jobs"; // nothing saved here yet

  return (
    <AppShell
      topBar={{ breadcrumb: "Saved", title: "Bookmarks" }}
      rightRail={
        <>
          <WidgetCard title="Collections" action={<button className="text-[12px] font-medium text-brand-blue hover:underline">New</button>}>
            {COLLECTIONS.map((c, i) => (
              <div
                key={c.name}
                className="flex items-center gap-2.5 px-3 py-2.5"
                style={{ borderTop: i ? "1px solid var(--line-1)" : "none" }}
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

        {showEmpty ? (
          <BookmarksEmpty />
        ) : (
          <>
            {showCommunities && SAVED_COMMUNITIES.length > 0 && (
              <div className="mb-6">
                <SectionLabel icon={<Hash className="h-3.5 w-3.5" />}>
                  Saved communities
                </SectionLabel>
                <div className="overflow-hidden rounded-md border border-line-1 bg-bg-2">
                  {SAVED_COMMUNITIES.map((c) => (
                    <CommunityRow key={c.id} community={c} />
                  ))}
                </div>
              </div>
            )}

            {showPosts && (
              <div>
                <SectionLabel icon={<Bookmark className="h-3.5 w-3.5" />}>
                  Saved posts
                </SectionLabel>
                {SAVED_POSTS.map((p) => (
                  <PostCard key={p.id} post={p} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}

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

function BookmarksEmpty() {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-line-2 bg-bg-2/50 px-8 py-16 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-brand-purple/30 bg-brand-purple/10 text-brand-purple">
        <Bookmark className="h-7 w-7" strokeWidth={1.5} />
      </div>
      <h3 className="mt-5 text-[18px] font-bold tracking-tighter">
        No saved jobs yet
      </h3>
      <p className="mt-2 max-w-[340px] text-[13.5px] leading-[1.55] text-fg-2">
        When you bookmark an internship or campus role from the Jobs board,
        it&rsquo;ll show up here for easy access.
      </p>
      <a
        href="/jobs"
        className="mt-5 inline-flex h-9 items-center rounded-md bg-acc-gradient px-4 text-[13px] font-semibold text-white shadow-acc"
      >
        Browse jobs
      </a>
    </div>
  );
}
