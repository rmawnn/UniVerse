"use client";

import { useMemo, useRef, useEffect, useCallback, useState } from "react";
import Link from "next/link";
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listShorts, toggleLike, savePost, unsavePost } from "@/api/posts";
import { useAuthStore } from "@/store/auth-store";
import { useInfiniteScroll } from "@/hooks/use-infinite-scroll";
import { formatRelativeTime } from "@/lib/format";
import { PostSkeleton, SkeletonList } from "@/components/skeletons/Skeletons";
import type { PaginatedResponse, PostResponse } from "@/types/api";

const SHORTS_KEY = ["shorts"] as const;
const PAGE_SIZE = 10;

const BACKEND_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/api\/v1$/, "") ??
  "http://localhost:8000";

export default function ShortsPage() {
  const qc = useQueryClient();
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const {
    data,
    isLoading,
    isError,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery<PaginatedResponse<PostResponse>>({
    queryKey: [...SHORTS_KEY],
    queryFn: ({ pageParam = 1 }) =>
      listShorts({ page: pageParam as number, page_size: PAGE_SIZE }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.page < lastPage.total_pages ? lastPage.page + 1 : undefined,
  });

  const shorts = useMemo(
    () => data?.pages.flatMap((p) => p.items) ?? [],
    [data]
  );

  const sentinelRef = useInfiniteScroll(
    () => {
      if (hasNextPage && !isFetchingNextPage) fetchNextPage();
    },
    !!hasNextPage && !isFetchingNextPage
  );

  // Snap scroll — detect which short is in view
  const handleScroll = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const idx = Math.round(el.scrollTop / el.clientHeight);
    setActiveIndex(idx);
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => el.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  return (
    <div>
      <h2 style={styles.heading}>Shorts</h2>

      {isLoading && <SkeletonList count={2} Component={PostSkeleton} />}

      {isError && (
        <div style={styles.error}>
          <span>Could not load shorts.</span>
          <button onClick={() => refetch()} style={styles.retry}>
            Retry
          </button>
        </div>
      )}

      {!isLoading && !isError && shorts.length === 0 && (
        <div style={styles.empty}>
          <span style={styles.emptyIcon}>🎬</span>
          <p style={styles.emptyTitle}>No shorts yet</p>
          <p style={styles.emptyHint}>
            Create one by uploading a short video in a community post.
          </p>
        </div>
      )}

      {shorts.length > 0 && (
        <div ref={containerRef} style={styles.viewer}>
          {shorts.map((short, i) => (
            <ShortCard
              key={short.id}
              post={short}
              isActive={i === activeIndex}
            />
          ))}
          {hasNextPage && (
            <div ref={sentinelRef} style={{ minHeight: 40 }}>
              {isFetchingNextPage && <PostSkeleton />}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Single short card ───────────────────────────────────── */

function ShortCard({
  post,
  isActive,
}: {
  post: PostResponse;
  isActive: boolean;
}) {
  const qc = useQueryClient();
  const me = useAuthStore((s) => s.user);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Auto-play when active, pause when not
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (isActive) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  }, [isActive]);

  const likeMutation = useMutation({
    mutationFn: () => toggleLike(post.id),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["shorts"] });
    },
  });

  const saveMutation = useMutation({
    mutationFn: () =>
      post.saved_by_me ? unsavePost(post.id) : savePost(post.id),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["shorts"] });
      qc.invalidateQueries({ queryKey: ["saved-posts"] });
    },
  });

  const videoSrc = post.video_url
    ? post.video_url.startsWith("http")
      ? post.video_url
      : `${BACKEND_URL}${post.video_url}`
    : null;

  return (
    <div style={styles.shortCard}>
      {/* Video */}
      <div style={styles.videoWrap}>
        {videoSrc ? (
          <video
            ref={videoRef}
            src={videoSrc}
            style={styles.video}
            loop
            muted
            playsInline
            preload="metadata"
            onClick={() => {
              const v = videoRef.current;
              if (v) v.paused ? v.play() : v.pause();
            }}
          />
        ) : (
          <div style={styles.noVideo}>
            <span>No video</span>
          </div>
        )}

        {/* Overlay info */}
        <div style={styles.overlay}>
          <div style={styles.authorRow}>
            <Link
              href={`/profile/${post.author.id}`}
              style={styles.authorLink}
            >
              <strong>{post.author.full_name}</strong>
              <span style={styles.authorHandle}>
                @{post.author.username}
              </span>
            </Link>
            <span style={styles.timeText}>
              {formatRelativeTime(post.created_at)}
            </span>
          </div>
          {post.content && (
            <p style={styles.caption}>
              {post.content.length > 120
                ? post.content.slice(0, 120) + "..."
                : post.content}
            </p>
          )}
        </div>

        {/* Action buttons (right side) */}
        <div style={styles.actions}>
          <button
            type="button"
            onClick={() => !likeMutation.isPending && likeMutation.mutate()}
            style={styles.actionBtn}
          >
            <span style={{ fontSize: 22 }}>
              {post.liked_by_me ? "♥" : "♡"}
            </span>
            <span style={styles.actionCount}>{post.like_count}</span>
          </button>

          <Link href={`/posts/${post.id}`} style={styles.actionBtn}>
            <span style={{ fontSize: 20 }}>💬</span>
            <span style={styles.actionCount}>{post.comment_count}</span>
          </Link>

          <button
            type="button"
            onClick={() => !saveMutation.isPending && saveMutation.mutate()}
            style={styles.actionBtn}
          >
            <span style={{ fontSize: 20 }}>
              {post.saved_by_me ? "🔖" : "🏷️"}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Styles ────────────────────────────────────────────────── */

const styles: Record<string, React.CSSProperties> = {
  heading: { fontSize: 22, fontWeight: 700, marginBottom: 16 },
  viewer: {
    height: "calc(100vh - 160px)",
    overflowY: "auto",
    scrollSnapType: "y mandatory",
    borderRadius: 12,
    background: "#000",
  },
  shortCard: {
    height: "calc(100vh - 160px)",
    scrollSnapAlign: "start",
    position: "relative",
  },
  videoWrap: {
    width: "100%",
    height: "100%",
    position: "relative",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#000",
    overflow: "hidden",
    cursor: "pointer",
  },
  video: {
    width: "100%",
    height: "100%",
    objectFit: "contain",
  },
  noVideo: {
    color: "#666",
    fontSize: 16,
  },
  overlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 60,
    padding: "24px 16px 16px",
    background: "linear-gradient(transparent, rgba(0,0,0,0.7))",
  },
  authorRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  authorLink: {
    color: "#fff",
    textDecoration: "none",
    fontSize: 14,
    display: "flex",
    alignItems: "center",
    gap: 6,
  },
  authorHandle: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 13,
    fontWeight: 400,
  },
  timeText: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 12,
  },
  caption: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 13,
    lineHeight: 1.4,
    margin: 0,
  },

  /* Action buttons (right side) */
  actions: {
    position: "absolute",
    right: 12,
    bottom: 80,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 16,
  },
  actionBtn: {
    background: "none",
    border: "none",
    color: "#fff",
    cursor: "pointer",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 2,
    textDecoration: "none",
    padding: 0,
  },
  actionCount: {
    fontSize: 12,
    color: "rgba(255,255,255,0.8)",
  },

  /* States */
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
