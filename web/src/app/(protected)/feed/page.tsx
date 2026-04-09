"use client";

import { useMemo } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { getHomeFeed } from "@/api/feed";
import PostCard from "@/components/post/PostCard";
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
        <p style={styles.muted}>
          Your feed is empty. Join some communities first.
        </p>
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
  muted: { color: "#999", fontSize: 15 },
  list: { display: "flex", flexDirection: "column", gap: 12 },
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
