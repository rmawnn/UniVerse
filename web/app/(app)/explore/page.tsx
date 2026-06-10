"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Calendar,
  Compass,
  Flame,
  MapPin,
  RefreshCw,
  Search,
  ShieldCheck,
  TrendingUp,
  Users,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/AppShell";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { UniBadge } from "@/components/ui/UniBadge";
import { FeedPostCard } from "@/components/post/FeedPostCard";
import { WidgetCard } from "@/components/widgets/WidgetCard";
import {
  getExplore,
  getTrendingPosts,
  getTrendingCommunities,
  type ExploreResponse,
  type TrendingPostItem,
  type TrendingCommunityItem,
} from "@/lib/api/explore";
import { compactNumber } from "@/lib/utils";

const TABS = ["Trending", "Communities", "People", "Events"] as const;
type Tab = (typeof TABS)[number];

/* ── Skeleton components ─────────────────────────────────── */

function PostSkeleton() {
  return (
    <div className="animate-pulse rounded-md border border-line-1 bg-bg-2 p-[18px]">
      <div className="flex gap-3.5">
        <div className="h-11 w-11 shrink-0 rounded-full bg-bg-3" />
        <div className="flex-1 space-y-2">
          <div className="h-3.5 w-1/3 rounded bg-bg-3" />
          <div className="h-3 w-2/3 rounded bg-bg-3" />
          <div className="mt-3 h-14 w-full rounded bg-bg-3" />
          <div className="mt-2 flex gap-4">
            <div className="h-3 w-10 rounded bg-bg-3" />
            <div className="h-3 w-10 rounded bg-bg-3" />
            <div className="h-3 w-10 rounded bg-bg-3" />
          </div>
        </div>
      </div>
    </div>
  );
}

function CommunitySkeleton() {
  return (
    <div className="animate-pulse rounded-md border border-line-1 bg-bg-2 p-4">
      <div className="h-4 w-2/3 rounded bg-bg-3" />
      <div className="mt-2 h-3 w-full rounded bg-bg-3" />
      <div className="mt-3 flex items-center justify-between">
        <div className="h-3 w-20 rounded bg-bg-3" />
        <div className="h-7 w-16 rounded bg-bg-3" />
      </div>
    </div>
  );
}

function PersonSkeleton() {
  return (
    <div className="animate-pulse rounded-md border border-line-1 bg-bg-2 p-4">
      <div className="flex items-center gap-3">
        <div className="h-12 w-12 shrink-0 rounded-full bg-bg-3" />
        <div className="flex-1 space-y-2">
          <div className="h-3.5 w-1/2 rounded bg-bg-3" />
          <div className="h-3 w-1/3 rounded bg-bg-3" />
        </div>
      </div>
    </div>
  );
}

/* ── Error component ─────────────────────────────────────── */

function ErrorState({
  message,
  onRetry,
  isRetrying,
}: {
  message: string;
  onRetry: () => void;
  isRetrying: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-md border border-danger/20 bg-danger/[0.06] px-6 py-8 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-danger/10 text-danger">
        <span className="text-lg font-bold">!</span>
      </div>
      <p className="text-[14px] font-medium text-fg-1">
        Something went wrong
      </p>
      <p className="max-w-[360px] text-[13px] text-fg-3">{message}</p>
      <Button
        variant="ghost"
        size="sm"
        icon={<RefreshCw className="h-3.5 w-3.5" />}
        onClick={onRetry}
        disabled={isRetrying}
      >
        {isRetrying ? "Retrying..." : "Try again"}
      </Button>
    </div>
  );
}

/* ── Empty state component ───────────────────────────────── */

function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-md border border-line-2 bg-bg-2 px-6 py-12 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-lg border border-brand-purple/30 bg-brand-purple/10 text-brand-purple">
        <Icon className="h-7 w-7" />
      </div>
      <h3 className="text-[18px] font-bold tracking-tighter">{title}</h3>
      <p className="max-w-[400px] text-[13.5px] leading-[1.5] text-fg-2">
        {description}
      </p>
    </div>
  );
}

/* ── Main page ───────────────────────────────────────────── */

export default function ExplorePage() {
  const [tab, setTab] = useState<Tab>("Trending");

  // ── Combined explore data (used for the right rail + People tab)
  const exploreQuery = useQuery({
    queryKey: ["explore"],
    queryFn: getExplore,
  });

  // ── Trending posts (dedicated endpoint for the Trending tab)
  const trendingPostsQuery = useQuery({
    queryKey: ["trending", "posts"],
    queryFn: () => getTrendingPosts(20, 7),
  });

  // ── Trending communities (dedicated endpoint for the Communities tab)
  const trendingCommunitiesQuery = useQuery({
    queryKey: ["trending", "communities"],
    queryFn: () => getTrendingCommunities(20, 7),
  });

  // Derive data
  const trendingPosts = trendingPostsQuery.data ?? [];
  const trendingCommunities = trendingCommunitiesQuery.data ?? [];
  const suggestedUsers = exploreQuery.data?.suggested_users ?? [];

  return (
    <AppShell
      topBar={{ breadcrumb: "Discover", title: "Explore" }}
      rightRail={
        <>
          {/* Trending communities sidebar widget */}
          <WidgetCard title="Trending communities">
            {exploreQuery.isLoading && (
              <div className="space-y-2 p-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="h-3.5 w-3/4 rounded bg-bg-3" />
                    <div className="mt-1 h-3 w-1/2 rounded bg-bg-3" />
                  </div>
                ))}
              </div>
            )}
            {!exploreQuery.isLoading &&
              (exploreQuery.data?.suggested_communities ?? []).map((c, i) => (
                <div
                  key={c.id}
                  className="flex items-center gap-2.5 px-3 py-2.5"
                  style={{
                    borderTop: i ? "1px solid var(--line-1)" : "none",
                  }}
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-md bg-brand-purple/10 text-[13px] font-bold text-brand-purple">
                    {c.name.charAt(0).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13.5px] font-semibold">
                      {c.name}
                    </div>
                    <div className="text-[11px] text-fg-3">
                      {compactNumber(c.member_count)} members
                    </div>
                  </div>
                </div>
              ))}
            {!exploreQuery.isLoading &&
              (exploreQuery.data?.suggested_communities ?? []).length === 0 && (
                <div className="px-3 py-4 text-center text-[12px] text-fg-3">
                  No communities yet
                </div>
              )}
          </WidgetCard>
        </>
      }
    >
      <div className="mx-auto max-w-[760px] px-4 py-5 sm:px-8 sm:py-6">
        {/* Explore header / search */}
        <div className="mb-5 overflow-hidden rounded-lg border border-brand-purple/22 bg-[linear-gradient(135deg,rgba(155,108,255,0.16),rgba(79,143,247,0.08))] p-5">
          <div className="flex items-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-[0.06em] text-[#C7B0FF]">
            <TrendingUp className="h-3.5 w-3.5" /> What&rsquo;s moving on
            campus
          </div>
          <h2 className="mt-2 text-[22px] font-bold tracking-tighter">
            Explore UniVerse
          </h2>
          <div className="mt-3 flex h-11 items-center gap-2.5 rounded-md border border-line-2 bg-bg-1/60 px-3.5 text-[14px] text-fg-3 backdrop-blur">
            <Search className="h-4 w-4" />
            <span>Search posts, people, communities, events&hellip;</span>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-5 flex gap-6 border-b border-line-1">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`relative -mb-px py-2.5 pb-3.5 text-[14px] transition-colors ${
                tab === t
                  ? "font-semibold text-fg-1"
                  : "font-medium text-fg-3 hover:text-fg-2"
              }`}
            >
              {t}
              {tab === t && (
                <span className="absolute inset-x-0 -bottom-px h-[2.5px] rounded bg-acc-gradient" />
              )}
            </button>
          ))}
        </div>

        {/* ════════════════════════════════════════════════════
            Trending tab
           ════════════════════════════════════════════════════ */}
        {tab === "Trending" && (
          <>
            {/* Loading */}
            {trendingPostsQuery.isLoading && (
              <div className="flex flex-col gap-3.5">
                {Array.from({ length: 4 }).map((_, i) => (
                  <PostSkeleton key={i} />
                ))}
              </div>
            )}

            {/* Error */}
            {trendingPostsQuery.isError && !trendingPostsQuery.isLoading && (
              <ErrorState
                message={
                  (trendingPostsQuery.error as Error)?.message ??
                  "Could not load trending posts. Please try again."
                }
                onRetry={() => trendingPostsQuery.refetch()}
                isRetrying={trendingPostsQuery.isFetching}
              />
            )}

            {/* Empty */}
            {!trendingPostsQuery.isLoading &&
              !trendingPostsQuery.isError &&
              trendingPosts.length === 0 && (
                <EmptyState
                  icon={Flame}
                  title="Nothing trending yet"
                  description="Be the first to post! Join communities and start sharing to see trending content here."
                />
              )}

            {/* Posts — TrendingPostItem is a superset of FeedPost fields */}
            {!trendingPostsQuery.isLoading &&
              trendingPosts.length > 0 &&
              trendingPosts.map((post) => (
                <FeedPostCard
                  key={post.id}
                  post={{
                    id: post.id,
                    community_id: post.community_id,
                    author: post.author,
                    content: post.content,
                    image_url: post.image_url,
                    video_url: null,
                    post_type: post.post_type,
                    like_count: post.like_count,
                    comment_count: post.comment_count,
                    liked_by_me: false,
                    saved_by_me: false,
                    feed_label: null,
                    recommendation_score: null,
                    created_at: post.created_at,
                    updated_at: post.created_at,
                  }}
                />
              ))}
          </>
        )}

        {/* ════════════════════════════════════════════════════
            Communities tab
           ════════════════════════════════════════════════════ */}
        {tab === "Communities" && (
          <>
            {/* Loading */}
            {trendingCommunitiesQuery.isLoading && (
              <div className="grid gap-3.5 sm:grid-cols-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <CommunitySkeleton key={i} />
                ))}
              </div>
            )}

            {/* Error */}
            {trendingCommunitiesQuery.isError &&
              !trendingCommunitiesQuery.isLoading && (
                <ErrorState
                  message={
                    (trendingCommunitiesQuery.error as Error)?.message ??
                    "Could not load communities. Please try again."
                  }
                  onRetry={() => trendingCommunitiesQuery.refetch()}
                  isRetrying={trendingCommunitiesQuery.isFetching}
                />
              )}

            {/* Empty */}
            {!trendingCommunitiesQuery.isLoading &&
              !trendingCommunitiesQuery.isError &&
              trendingCommunities.length === 0 && (
                <EmptyState
                  icon={Users}
                  title="No communities yet"
                  description="Communities haven't been created yet. Be the first to start one and build your campus network!"
                />
              )}

            {/* Community cards */}
            {!trendingCommunitiesQuery.isLoading &&
              trendingCommunities.length > 0 && (
                <div className="grid gap-3.5 sm:grid-cols-2">
                  {trendingCommunities.map((c) => (
                    <Link
                      key={c.id}
                      href={`/communities/${c.id}`}
                      className="block"
                    >
                      <Card className="transition-colors hover:bg-bg-3/50">
                        <div className="flex items-start gap-3">
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-purple/10 text-[16px] font-bold text-brand-purple">
                            {c.name.charAt(0).toUpperCase()}
                          </span>
                          <div className="min-w-0 flex-1">
                            <h3 className="truncate text-[15px] font-semibold tracking-tightish">
                              {c.name}
                            </h3>
                            {c.description && (
                              <p className="mt-0.5 line-clamp-2 text-[12.5px] leading-[1.5] text-fg-3">
                                {c.description}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="mt-3 flex items-center justify-between border-t border-line-1 pt-3">
                          <div className="flex items-center gap-4 text-[12px] text-fg-3">
                            <span className="inline-flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {compactNumber(c.member_count)} members
                            </span>
                            {c.posts_this_week > 0 && (
                              <span className="inline-flex items-center gap-1">
                                <Flame className="h-3 w-3 text-warn" />
                                {c.posts_this_week} posts this week
                              </span>
                            )}
                          </div>
                          {c.is_member && (
                            <span className="rounded-full bg-brand-purple/10 px-2 py-0.5 text-[11px] font-semibold text-brand-purple">
                              Joined
                            </span>
                          )}
                        </div>
                      </Card>
                    </Link>
                  ))}
                </div>
              )}
          </>
        )}

        {/* ════════════════════════════════════════════════════
            People tab
           ════════════════════════════════════════════════════ */}
        {tab === "People" && (
          <>
            {/* Loading */}
            {exploreQuery.isLoading && (
              <div className="grid gap-3 sm:grid-cols-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <PersonSkeleton key={i} />
                ))}
              </div>
            )}

            {/* Error */}
            {exploreQuery.isError && !exploreQuery.isLoading && (
              <ErrorState
                message={
                  (exploreQuery.error as Error)?.message ??
                  "Could not load suggested people. Please try again."
                }
                onRetry={() => exploreQuery.refetch()}
                isRetrying={exploreQuery.isFetching}
              />
            )}

            {/* Empty */}
            {!exploreQuery.isLoading &&
              !exploreQuery.isError &&
              suggestedUsers.length === 0 && (
                <EmptyState
                  icon={Users}
                  title="No suggestions yet"
                  description="We don't have enough data to suggest people yet. Keep using UniVerse and suggestions will appear here."
                />
              )}

            {/* People cards */}
            {!exploreQuery.isLoading && suggestedUsers.length > 0 && (
              <div className="grid gap-3 sm:grid-cols-2">
                {suggestedUsers.map((user) => (
                  <Link
                    key={user.id}
                    href={`/profile/${user.username}`}
                    className="block"
                  >
                    <Card className="transition-colors hover:bg-bg-3/50">
                      <div className="flex items-center gap-3">
                        <Avatar name={user.full_name} size={48} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1">
                            <span className="truncate text-[14px] font-semibold">
                              {user.full_name}
                            </span>
                            {user.is_verified_student && (
                              <ShieldCheck className="h-3 w-3 text-verified" />
                            )}
                          </div>
                          <div className="mt-0.5 truncate text-[12px] text-fg-3">
                            @{user.username}
                          </div>
                        </div>
                      </div>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </>
        )}

        {/* ════════════════════════════════════════════════════
            Events tab — Coming Soon (no backend endpoint)
           ════════════════════════════════════════════════════ */}
        {tab === "Events" && (
          <EmptyState
            icon={Calendar}
            title="Events coming soon"
            description="Campus events are on their way! You'll be able to discover workshops, meetups, and events from communities you follow."
          />
        )}
      </div>
    </AppShell>
  );
}
