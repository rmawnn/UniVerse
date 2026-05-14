"use client";

import { useCallback, useMemo } from "react";
import Link from "next/link";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { getHomeFeed } from "@/api/feed";
import PostCard from "@/components/post/PostCard";
import StoriesRow from "@/components/stories/StoriesRow";
import { PostSkeleton, SkeletonList } from "@/components/skeletons/Skeletons";
import { useInfiniteScroll } from "@/hooks/use-infinite-scroll";
import { usePullToRefresh } from "@/hooks/use-pull-to-refresh";
import type { PaginatedResponse, PostResponse } from "@/types/api";

const FEED_KEY = ["feed"] as const;
const PAGE_SIZE = 15;

export default function FeedPage() {
  const queryClient = useQueryClient();

  const {
    data,
    isLoading,
    isError,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery<PaginatedResponse<PostResponse>>({
    queryKey: [...FEED_KEY],
    queryFn: ({ pageParam = 1 }) =>
      getHomeFeed({ page: pageParam as number, page_size: PAGE_SIZE }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.page < lastPage.total_pages ? lastPage.page + 1 : undefined,
  });

  // Deduplicate posts across pages — score-based ordering can drift
  const posts = useMemo(() => {
    const all = data?.pages.flatMap((p) => p.items) ?? [];
    const seen = new Set<string>();
    return all.filter((post) => {
      if (seen.has(post.id)) return false;
      seen.add(post.id);
      return true;
    });
  }, [data]);

  const sentinelRef = useInfiniteScroll(
    () => {
      if (hasNextPage && !isFetchingNextPage) fetchNextPage();
    },
    !!hasNextPage && !isFetchingNextPage,
  );

  // Pull-to-refresh — invalidate cache and refetch from page 1
  const handleRefresh = useCallback(async () => {
    queryClient.removeQueries({ queryKey: [...FEED_KEY] });
    await refetch();
  }, [queryClient, refetch]);

  const { pullDistance, isRefreshing } = usePullToRefresh(handleRefresh);

  return (
    <div>
      {/* Pull-to-refresh indicator (mobile) */}
      {pullDistance > 0 && (
        <div
          style={{
            ...styles.pullIndicator,
            height: pullDistance,
            opacity: Math.min(pullDistance / 80, 1),
          }}
        >
          <div
            style={{
              ...styles.pullSpinner,
              transform: isRefreshing
                ? "none"
                : `rotate(${(pullDistance / 80) * 360}deg)`,
              animation: isRefreshing
                ? "spin 0.8s linear infinite"
                : "none",
            }}
          >
            ↻
          </div>
          <span style={styles.pullText}>
            {isRefreshing
              ? "Refreshing..."
              : pullDistance >= 80
                ? "Release to refresh"
                : "Pull to refresh"}
          </span>
        </div>
      )}

      <h2 style={styles.heading}>Feed</h2>

      <StoriesRow />

      {isLoading && <SkeletonList count={4} Component={PostSkeleton} />}

      {isError && (
        <div style={styles.error}>
          <span>Could not load feed.</span>
          <button onClick={() => refetch()} style={styles.retry}>
            Retry
          </button>
        </div>
      )}

      {!isLoading && !isError && posts.length === 0 && (
        <div style={styles.empty}>
          <span style={styles.emptyIcon}>📭</span>
          <p style={styles.emptyTitle}>Your feed is empty</p>
          <p style={styles.emptyHint}>
            Join communities to see posts here.
          </p>
          <Link href="/communities" style={styles.emptyLink}>
            Browse Communities
          </Link>
        </div>
      )}

      <div style={styles.list}>
        {posts.map((post) => (
          <PostCard
            key={post.id}
            post={post}
            invalidateKeys={[[...FEED_KEY]]}
          />
        ))}
      </div>

      {hasNextPage && (
        <div ref={sentinelRef} style={styles.sentinel}>
          {isFetchingNextPage && <PostSkeleton />}
        </div>
      )}

      {!hasNextPage && posts.length > 0 && (
        <div style={styles.endWrap}>
          <div style={styles.endCheck}>✓</div>
          <p style={styles.endTitle}>You&apos;re all caught up</p>
          <p style={styles.endHint}>You&apos;ve seen all recent posts from your communities.</p>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  heading: { fontSize: 22, fontWeight: 700, marginBottom: 16 },
  list: { display: "flex", flexDirection: "column", gap: 12 },
  empty: {
    textAlign: "center",
    padding: "48px 24px",
    background: "#fafafa",
    borderRadius: 12,
    border: "1px dashed #ddd",
  },
  emptyIcon: { fontSize: 40, display: "block", marginBottom: 8 },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 600,
    color: "#333",
    margin: "0 0 4px",
  },
  emptyHint: { color: "#888", fontSize: 14, margin: "0 0 16px" },
  emptyLink: {
    display: "inline-block",
    background: "#111",
    color: "#fff",
    padding: "8px 20px",
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 500,
    textDecoration: "none",
  },
  sentinel: { marginTop: 12, minHeight: 40 },

  /* ── End-of-feed ─────────────────────────── */
  endWrap: {
    textAlign: "center",
    padding: "32px 24px",
    margin: "16px 0 8px",
  },
  endCheck: {
    width: 40,
    height: 40,
    borderRadius: "50%",
    background: "#f0efff",
    color: "#6C63FF",
    fontSize: 20,
    fontWeight: 700,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  endTitle: {
    fontSize: 15,
    fontWeight: 600,
    color: "#444",
    margin: "0 0 4px",
  },
  endHint: {
    fontSize: 13,
    color: "#999",
    margin: 0,
  },

  /* ── Pull-to-refresh ─────────────────────── */
  pullIndicator: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "flex-end",
    paddingBottom: 8,
    overflow: "hidden",
  },
  pullSpinner: {
    fontSize: 24,
    color: "#6C63FF",
    marginBottom: 4,
  },
  pullText: {
    fontSize: 12,
    color: "#888",
    fontWeight: 500,
  },

  /* ── Error / retry ───────────────────────── */
  error: {
    background: "#fff5f5",
    border: "1px solid #fed7d7",
    color: "#c53030",
    padding: 12,
    borderRadius: 8,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  retry: {
    background: "#fff",
    border: "1px solid #fed7d7",
    color: "#c53030",
    borderRadius: 6,
    padding: "4px 12px",
    fontSize: 13,
    cursor: "pointer",
  },
};
