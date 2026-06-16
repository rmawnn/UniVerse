"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Heart,
  MessageCircle,
  RefreshCw,
  Search,
  ShieldCheck,
  Users,
  X,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/AppShell";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { SectionHead } from "@/components/ui/SectionHead";
import { WidgetCard } from "@/components/widgets/WidgetCard";
import { unifiedSearch, type UnifiedSearchResponse } from "@/lib/api/users";
import { cn, compactNumber } from "@/lib/utils";

type TabKey = "all" | "people" | "communities" | "posts";

const TABS: { key: TabKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "people", label: "People" },
  { key: "communities", label: "Communities" },
  { key: "posts", label: "Posts" },
];

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d`;
  const weeks = Math.floor(days / 7);
  return `${weeks}w`;
}

export default function SearchPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const initialQ = searchParams.get("q") ?? "";
  const [inputValue, setInputValue] = useState(initialQ);
  const [debouncedQ, setDebouncedQ] = useState(initialQ);
  const [activeTab, setActiveTab] = useState<TabKey>("all");

  /* ── Debounce input ───────────────────────────────────── */
  useEffect(() => {
    if (!inputValue.trim() || inputValue.trim().length < 2) {
      setDebouncedQ("");
      return;
    }
    const timer = setTimeout(() => {
      setDebouncedQ(inputValue.trim());
    }, 400);
    return () => clearTimeout(timer);
  }, [inputValue]);

  /* ── Update URL when debounced value changes ──────────── */
  useEffect(() => {
    if (debouncedQ) {
      router.replace(`/search?q=${encodeURIComponent(debouncedQ)}`, {
        scroll: false,
      });
    }
  }, [debouncedQ, router]);

  /* ── Search query ─────────────────────────────────────── */
  const {
    data: results,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["search", debouncedQ],
    queryFn: () => unifiedSearch(debouncedQ),
    enabled: debouncedQ.length >= 2,
    staleTime: 2 * 60_000,
  });

  const clearInput = useCallback(() => {
    setInputValue("");
    setDebouncedQ("");
    router.replace("/search", { scroll: false });
  }, [router]);

  const hasResults = results && (
    results.users.length > 0 ||
    results.communities.length > 0 ||
    results.posts.length > 0
  );

  const tabCounts: Record<TabKey, number> = {
    all: (results?.users_total ?? 0) +
      (results?.communities_total ?? 0) +
      (results?.posts_total ?? 0),
    people: results?.users_total ?? 0,
    communities: results?.communities_total ?? 0,
    posts: results?.posts_total ?? 0,
  };

  const showUsers =
    (activeTab === "all" || activeTab === "people") &&
    results &&
    results.users.length > 0;

  const showCommunities =
    (activeTab === "all" || activeTab === "communities") &&
    results &&
    results.communities.length > 0;

  const showPosts =
    (activeTab === "all" || activeTab === "posts") &&
    results &&
    results.posts.length > 0;

  return (
    <AppShell
      topBar={{
        breadcrumb: "Search",
        title: debouncedQ ? `"${debouncedQ}"` : "Search",
      }}
      rightRail={
        <WidgetCard title="Search tips">
          <div className="p-3.5 text-[12.5px] leading-[1.5] text-fg-2">
            Search for people, communities, or posts. Results update as you
            type.
          </div>
        </WidgetCard>
      }
    >
      <div className="mx-auto max-w-[1080px] px-4 py-6 sm:px-8">
        {/* Search box */}
        <div className="flex h-[54px] items-center gap-3 rounded-md border border-line-2 bg-bg-2 px-4">
          <Search className="h-4.5 w-4.5 text-fg-3 shrink-0" />
          <input
            type="text"
            placeholder="Search people, communities, posts..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            className="flex-1 bg-transparent text-[15px] text-fg-1 placeholder:text-fg-3 focus:outline-none"
            autoFocus
          />
          {inputValue && (
            <button
              onClick={clearInput}
              className="rounded-md bg-bg-3 p-1.5 text-fg-3 hover:text-fg-1"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* No query state */}
        {!debouncedQ && (
          <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
            <Search className="h-10 w-10 text-fg-4" />
            <p className="text-[15px] font-medium text-fg-2">
              Start typing to search
            </p>
            <p className="text-[13px] text-fg-3">
              Find people, communities, and posts across UniVerse.
            </p>
          </div>
        )}

        {/* Loading */}
        {debouncedQ && isLoading && (
          <div className="mt-6 space-y-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="animate-pulse flex gap-3 rounded-md border border-line-1 bg-bg-2 p-4"
              >
                <div className="h-10 w-10 shrink-0 rounded-full bg-bg-3" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 w-1/3 rounded bg-bg-3" />
                  <div className="h-3 w-2/3 rounded bg-bg-3" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Error */}
        {debouncedQ && isError && !isLoading && (
          <div className="mt-6 flex flex-col items-center gap-3 rounded-md border border-danger/20 bg-danger/[0.06] px-6 py-8 text-center">
            <p className="text-[14px] font-medium text-fg-1">
              Search failed
            </p>
            <p className="text-[13px] text-fg-3">
              Something went wrong. Please try again.
            </p>
            <Button
              variant="ghost"
              size="sm"
              icon={<RefreshCw className="h-3.5 w-3.5" />}
              onClick={() => refetch()}
            >
              Retry
            </Button>
          </div>
        )}

        {/* No results */}
        {debouncedQ && !isLoading && !isError && results && !hasResults && (
          <div className="mt-6 flex flex-col items-center gap-2 rounded-md border border-line-2 bg-bg-2 px-6 py-12 text-center">
            <Search className="h-8 w-8 text-fg-4" />
            <p className="text-[15px] font-medium">No results found</p>
            <p className="text-[13px] text-fg-3">
              Try different keywords or check the spelling.
            </p>
          </div>
        )}

        {/* Results */}
        {debouncedQ && !isLoading && !isError && hasResults && (
          <>
            {/* Tab pills */}
            <div className="mt-5 flex items-center gap-1.5 border-b border-line-1 pb-5">
              {TABS.map((tab) => {
                const isActive = tab.key === activeTab;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={cn(
                      "flex items-center gap-1.5 rounded-md border px-3.5 py-2 text-[13.5px]",
                      isActive
                        ? "border-line-2 bg-bg-3 font-semibold text-fg-1"
                        : "border-transparent font-medium text-fg-2 hover:bg-bg-2 hover:text-fg-1",
                    )}
                  >
                    {tab.label}
                    <span className="font-mono text-[11px] text-fg-3">
                      {tabCounts[tab.key]}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* People */}
            {showUsers && (
              <div className="mt-5">
                <SectionHead
                  title="People"
                  sub={`${results.users.length} of ${results.users_total} results`}
                />
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {results.users.map((user) => (
                    <Card key={user.id}>
                      <div className="flex items-center gap-3">
                        <Link href={`/profile/${user.username}`}>
                          <Avatar name={user.full_name} size={48} />
                        </Link>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1">
                            <Link
                              href={`/profile/${user.username}`}
                              className="truncate text-[14px] font-semibold hover:underline"
                            >
                              {user.full_name}
                            </Link>
                            {user.is_verified_student && (
                              <ShieldCheck className="h-3 w-3 shrink-0 text-verified" />
                            )}
                          </div>
                          <div className="mt-0.5 truncate text-[12px] text-fg-3">
                            @{user.username}
                          </div>
                        </div>
                      </div>
                      <div className="mt-3 flex items-center justify-end">
                        <Link href={`/profile/${user.username}`}>
                          <Button variant="ghost" size="sm">
                            View profile
                          </Button>
                        </Link>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Communities */}
            {showCommunities && (
              <div className="mt-8">
                <SectionHead
                  title="Communities"
                  sub={`${results.communities.length} of ${results.communities_total} results`}
                />
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {results.communities.map((c) => (
                    <Card key={c.id}>
                      <Link
                        href={`/communities/${c.id}`}
                        className="flex items-center gap-3"
                      >
                        <span
                          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px] text-[18px] font-bold text-white"
                          style={{
                            background:
                              "linear-gradient(135deg, var(--acc-purple), var(--acc-blue))",
                          }}
                        >
                          {c.name.charAt(0).toUpperCase()}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-[14.5px] font-semibold hover:underline">
                            {c.name}
                          </div>
                          {c.description && (
                            <p className="mt-0.5 truncate text-[12px] text-fg-3">
                              {c.description}
                            </p>
                          )}
                          <div className="mt-1 flex items-center gap-1.5 text-[12px] text-fg-2">
                            <Users className="h-3 w-3 text-fg-3" />
                            {compactNumber(c.member_count)} members
                          </div>
                        </div>
                      </Link>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Posts */}
            {showPosts && (
              <div className="mt-8">
                <SectionHead
                  title="Posts"
                  sub={`${results.posts.length} of ${results.posts_total} results`}
                />
                <div className="space-y-3">
                  {results.posts.map((p) => (
                    <Card key={p.id} padded={false}>
                      <Link
                        href={`/posts/${p.id}`}
                        className="block p-[18px]"
                      >
                        <div className="flex items-center gap-1.5 text-[13px]">
                          <Avatar name={p.author_full_name} size={32} />
                          <span className="font-semibold">
                            {p.author_full_name}
                          </span>
                          <span className="text-fg-3">
                            @{p.author_username}
                          </span>
                          <span className="text-fg-4">·</span>
                          <span className="text-fg-3">
                            in {p.community_name}
                          </span>
                          <span className="text-fg-4">·</span>
                          <span className="text-fg-3">
                            {relativeTime(p.created_at)}
                          </span>
                        </div>
                        <p className="mt-2 text-[14px] leading-[1.5] text-fg-2">
                          {p.content_preview}
                        </p>
                        <div className="mt-2.5 flex items-center gap-4 text-[12px] text-fg-3">
                          <span className="inline-flex items-center gap-1">
                            <Heart className="h-3.5 w-3.5" />
                            {compactNumber(p.like_count)}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <MessageCircle className="h-3.5 w-3.5" />
                            {compactNumber(p.comment_count)}
                          </span>
                        </div>
                      </Link>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}
