"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useInfiniteQuery } from "@tanstack/react-query";
import { listUserPosts, listSavedPosts } from "@/api/posts";
import { SkeletonList } from "@/components/skeletons/Skeletons";
import { useInfiniteScroll } from "@/hooks/use-infinite-scroll";
import type { PaginatedResponse, PostResponse } from "@/types/api";

const PAGE_SIZE = 18;

const BACKEND_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/api\/v1$/, "") ??
  "http://localhost:8000";

type Tab = "posts" | "shorts" | "saved";

interface Props {
  userId: string;
  isOwnProfile: boolean;
}

export default function ProfilePostsGrid({ userId, isOwnProfile }: Props) {
  const [tab, setTab] = useState<Tab>("posts");

  const tabs: { key: Tab; label: string }[] = [
    { key: "posts", label: "Posts" },
    { key: "shorts", label: "Shorts" },
    ...(isOwnProfile ? [{ key: "saved" as Tab, label: "Saved" }] : []),
  ];

  return (
    <div>
      {/* Tab bar */}
      <div style={styles.tabBar}>
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              ...styles.tabBtn,
              ...(tab === t.key ? styles.tabBtnActive : {}),
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === "posts" && <UserPostsTab userId={userId} />}
      {tab === "shorts" && <UserShortsTab userId={userId} />}
      {tab === "saved" && isOwnProfile && <SavedTab />}
    </div>
  );
}

/* ── Posts tab (all post types in grid) ───────────────────── */

function UserPostsTab({ userId }: { userId: string }) {
  const queryKey = ["user-grid-posts", userId] as const;

  const query = useInfiniteQuery<PaginatedResponse<PostResponse>>({
    queryKey: [...queryKey],
    queryFn: ({ pageParam = 1 }) =>
      listUserPosts(userId, {
        page: pageParam as number,
        page_size: PAGE_SIZE,
      }),
    initialPageParam: 1,
    getNextPageParam: (lp) =>
      lp.page < lp.total_pages ? lp.page + 1 : undefined,
  });

  const posts = useMemo(
    () => query.data?.pages.flatMap((p) => p.items) ?? [],
    [query.data],
  );

  const sentinelRef = useInfiniteScroll(
    () => {
      if (query.hasNextPage && !query.isFetchingNextPage) query.fetchNextPage();
    },
    !!query.hasNextPage && !query.isFetchingNextPage,
  );

  return (
    <GridView
      posts={posts}
      loading={query.isLoading}
      isError={query.isError}
      onRetry={() => query.refetch()}
      hasMore={!!query.hasNextPage}
      sentinelRef={sentinelRef}
      isFetching={query.isFetchingNextPage}
      emptyIcon="📝"
      emptyTitle="No posts yet"
      emptyHint="Posts will appear here."
    />
  );
}

/* ── Shorts tab ───────────────────────────────────────────── */

function UserShortsTab({ userId }: { userId: string }) {
  const queryKey = ["user-grid-shorts", userId] as const;

  const query = useInfiniteQuery<PaginatedResponse<PostResponse>>({
    queryKey: [...queryKey],
    queryFn: ({ pageParam = 1 }) =>
      listUserPosts(userId, {
        page: pageParam as number,
        page_size: PAGE_SIZE,
        post_type: "short",
      }),
    initialPageParam: 1,
    getNextPageParam: (lp) =>
      lp.page < lp.total_pages ? lp.page + 1 : undefined,
  });

  const posts = useMemo(
    () => query.data?.pages.flatMap((p) => p.items) ?? [],
    [query.data],
  );

  const sentinelRef = useInfiniteScroll(
    () => {
      if (query.hasNextPage && !query.isFetchingNextPage) query.fetchNextPage();
    },
    !!query.hasNextPage && !query.isFetchingNextPage,
  );

  return (
    <GridView
      posts={posts}
      loading={query.isLoading}
      isError={query.isError}
      onRetry={() => query.refetch()}
      hasMore={!!query.hasNextPage}
      sentinelRef={sentinelRef}
      isFetching={query.isFetchingNextPage}
      emptyIcon="🎬"
      emptyTitle="No shorts yet"
      emptyHint="Short videos will appear here."
    />
  );
}

/* ── Saved tab (own profile only) ─────────────────────────── */

function SavedTab() {
  const query = useInfiniteQuery<PaginatedResponse<PostResponse>>({
    queryKey: ["saved-posts-grid"],
    queryFn: ({ pageParam = 1 }) =>
      listSavedPosts({ page: pageParam as number, page_size: PAGE_SIZE }),
    initialPageParam: 1,
    getNextPageParam: (lp) =>
      lp.page < lp.total_pages ? lp.page + 1 : undefined,
  });

  const posts = useMemo(
    () => query.data?.pages.flatMap((p) => p.items) ?? [],
    [query.data],
  );

  const sentinelRef = useInfiniteScroll(
    () => {
      if (query.hasNextPage && !query.isFetchingNextPage) query.fetchNextPage();
    },
    !!query.hasNextPage && !query.isFetchingNextPage,
  );

  return (
    <GridView
      posts={posts}
      loading={query.isLoading}
      isError={query.isError}
      onRetry={() => query.refetch()}
      hasMore={!!query.hasNextPage}
      sentinelRef={sentinelRef}
      isFetching={query.isFetchingNextPage}
      emptyIcon="🔖"
      emptyTitle="No saved posts"
      emptyHint="Posts you save will appear here."
    />
  );
}

/* ── Shared grid renderer ─────────────────────────────────── */

function GridView({
  posts,
  loading,
  isError,
  onRetry,
  hasMore,
  sentinelRef,
  isFetching,
  emptyIcon,
  emptyTitle,
  emptyHint,
}: {
  posts: PostResponse[];
  loading: boolean;
  isError: boolean;
  onRetry: () => void;
  hasMore: boolean;
  sentinelRef: React.RefObject<HTMLDivElement | null>;
  isFetching: boolean;
  emptyIcon: string;
  emptyTitle: string;
  emptyHint: string;
}) {
  const router = useRouter();

  if (loading) {
    return <SkeletonList count={6} Component={GridSkeleton} />;
  }

  if (isError) {
    return (
      <div style={styles.error}>
        <span>Could not load content.</span>
        <button onClick={onRetry} style={styles.retry}>
          Retry
        </button>
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div style={styles.empty}>
        <span style={styles.emptyIcon}>{emptyIcon}</span>
        <p style={styles.emptyTitle}>{emptyTitle}</p>
        <p style={styles.emptyHint}>{emptyHint}</p>
      </div>
    );
  }

  return (
    <>
      <div style={styles.grid}>
        {posts.map((post) => (
          <button
            key={post.id}
            className="grid-thumb-hover"
            style={styles.gridItem}
            onClick={() => router.push(`/posts/${post.id}`)}
            title={post.content?.slice(0, 80) || "View post"}
          >
            <GridThumbnail post={post} />
            <div className="grid-overlay" style={styles.gridOverlay}>
              <span style={styles.gridStat}>♥ {post.like_count}</span>
              <span style={styles.gridStat}>💬 {post.comment_count}</span>
            </div>
          </button>
        ))}
      </div>

      {hasMore && (
        <div ref={sentinelRef} style={{ marginTop: 12, minHeight: 40 }}>
          {isFetching && <GridSkeleton />}
        </div>
      )}
    </>
  );
}

/* ── Thumbnail renderer ───────────────────────────────────── */

function GridThumbnail({ post }: { post: PostResponse }) {
  if (post.post_type === "short" && post.video_url) {
    const src = post.video_url.startsWith("http")
      ? post.video_url
      : `${BACKEND_URL}${post.video_url}`;
    return (
      <>
        <video src={src} style={styles.thumbMedia} muted preload="metadata" />
        <div style={styles.videoIcon}>▶</div>
      </>
    );
  }

  if (post.image_url) {
    const src = post.image_url.startsWith("http")
      ? post.image_url
      : `${BACKEND_URL}${post.image_url}`;
    return (
      /* eslint-disable-next-line @next/next/no-img-element */
      <img src={src} alt="" style={styles.thumbMedia} loading="lazy" />
    );
  }

  // Text-only post
  return (
    <div style={styles.textThumb}>
      <p style={styles.textThumbContent}>
        {post.content
          ? post.content.length > 100
            ? post.content.slice(0, 100) + "..."
            : post.content
          : "..."}
      </p>
    </div>
  );
}

/* ── Skeleton ─────────────────────────────────────────────── */

function GridSkeleton() {
  return (
    <div style={styles.grid}>
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="skeleton" style={styles.gridItemSkeleton} />
      ))}
    </div>
  );
}

/* ── Styles ───────────────────────────────────────────────── */

const styles: Record<string, React.CSSProperties> = {
  tabBar: {
    display: "flex",
    borderBottom: "1px solid #eee",
    marginBottom: 16,
  },
  tabBtn: {
    flex: 1,
    padding: "12px 0",
    border: "none",
    borderBottom: "2px solid transparent",
    background: "none",
    fontSize: 14,
    fontWeight: 500,
    color: "#999",
    cursor: "pointer",
    transition: "all 0.15s",
  },
  tabBtnActive: {
    color: "#6C63FF",
    borderBottomColor: "#6C63FF",
    fontWeight: 600,
  },

  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: 3,
  },
  gridItem: {
    position: "relative",
    aspectRatio: "1",
    overflow: "hidden",
    cursor: "pointer",
    border: "none",
    padding: 0,
    background: "#f5f5f5",
    borderRadius: 2,
  },
  gridOverlay: {
    position: "absolute",
    inset: 0,
    background: "rgba(0,0,0,0.3)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    opacity: 0,
    transition: "opacity 0.15s",
  },
  gridStat: {
    color: "#fff",
    fontSize: 13,
    fontWeight: 600,
  },

  thumbMedia: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    display: "block",
  },
  videoIcon: {
    position: "absolute",
    top: 8,
    right: 8,
    background: "rgba(0,0,0,0.5)",
    color: "#fff",
    borderRadius: 4,
    padding: "2px 6px",
    fontSize: 10,
  },
  textThumb: {
    width: "100%",
    height: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    background: "#f8f8f8",
  },
  textThumbContent: {
    fontSize: 12,
    lineHeight: 1.4,
    color: "#555",
    margin: 0,
    overflow: "hidden",
    textOverflow: "ellipsis",
    display: "-webkit-box",
    WebkitLineClamp: 4,
    WebkitBoxOrient: "vertical",
  },

  gridItemSkeleton: {
    aspectRatio: "1",
    borderRadius: 2,
  },

  empty: {
    textAlign: "center",
    padding: "36px 24px",
    background: "#fafafa",
    borderRadius: 10,
    border: "1px dashed #ddd",
  },
  emptyIcon: { fontSize: 32, display: "block", marginBottom: 8 },
  emptyTitle: {
    fontSize: 16,
    fontWeight: 600,
    color: "#333",
    margin: "0 0 4px",
  },
  emptyHint: { color: "#888", fontSize: 14, margin: 0 },
  error: {
    background: "#fff5f5",
    border: "1px solid #fed7d7",
    color: "#c53030",
    padding: 12,
    borderRadius: 8,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
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
