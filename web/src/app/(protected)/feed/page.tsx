"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useInfiniteQuery } from "@tanstack/react-query";
import { getHomeFeed } from "@/api/feed";
import PostCard from "@/components/post/PostCard";
import StoriesRow from "@/components/stories/StoriesRow";
import { PostSkeleton, SkeletonList } from "@/components/skeletons/Skeletons";
import { useInfiniteScroll } from "@/hooks/use-infinite-scroll";
import type { PaginatedResponse, PostResponse } from "@/types/api";

const FEED_KEY = ["feed"] as const;
const PAGE_SIZE = 15;

export default function FeedPage() {
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

  const posts = useMemo(
    () => data?.pages.flatMap((p) => p.items) ?? [],
    [data]
  );

  const sentinelRef = useInfiniteScroll(
    () => {
      if (hasNextPage && !isFetchingNextPage) fetchNextPage();
    },
    !!hasNextPage && !isFetchingNextPage
  );

  return (
    <div>
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
        <p style={styles.end}>You&apos;re all caught up</p>
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
  end: {
    textAlign: "center",
    color: "#bbb",
    fontSize: 13,
    padding: "16px 0",
  },
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
