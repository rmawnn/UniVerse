"use client";

import { useMemo, useRef, useEffect, useCallback, useState } from "react";
import Link from "next/link";
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listShorts, toggleLike, savePost, unsavePost } from "@/api/posts";
import { useInfiniteScroll } from "@/hooks/use-infinite-scroll";
import { formatRelativeTime } from "@/lib/format";
import { PostSkeleton, SkeletonList } from "@/components/skeletons/Skeletons";
import type { PaginatedResponse, PostResponse } from "@/types/api";

const SHORTS_KEY = ["shorts"] as const;
const PAGE_SIZE = 10;

/**
 * How many slots away from the active index a video should
 * keep its `src` loaded.  Videos outside this window have their
 * src removed so the browser can free the buffered data.
 */
const PRELOAD_WINDOW = 1;

const BACKEND_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/api\/v1$/, "") ??
  "http://localhost:8000";

export default function ShortsPage() {
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

  // ── IntersectionObserver: detect which card is fully visible ──
  const cardRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  const setCardRef = useCallback(
    (index: number) => (el: HTMLDivElement | null) => {
      if (el) cardRefs.current.set(index, el);
      else cardRefs.current.delete(index);
    },
    [],
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container || shorts.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.6) {
            const idx = Number(
              (entry.target as HTMLElement).dataset.shortIndex,
            );
            if (!Number.isNaN(idx)) setActiveIndex(idx);
          }
        }
      },
      { root: container, threshold: 0.6 },
    );

    cardRefs.current.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [shorts.length]);

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
              index={i}
              isActive={i === activeIndex}
              isNearby={Math.abs(i - activeIndex) <= PRELOAD_WINDOW}
              cardRef={setCardRef(i)}
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
  index,
  isActive,
  isNearby,
  cardRef,
}: {
  post: PostResponse;
  index: number;
  isActive: boolean;
  /** Within ±PRELOAD_WINDOW of active — keep src loaded */
  isNearby: boolean;
  cardRef: (el: HTMLDivElement | null) => void;
}) {
  const qc = useQueryClient();
  const videoRef = useRef<HTMLVideoElement>(null);

  const videoSrc = post.video_url
    ? post.video_url.startsWith("http")
      ? post.video_url
      : `${BACKEND_URL}${post.video_url}`
    : null;

  // Lazy load / unload video src based on proximity to active index
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !videoSrc) return;

    if (isNearby) {
      // Load src if not already set
      if (!video.src || video.src === window.location.href) {
        video.src = videoSrc;
        video.load();
      }
    } else {
      // Unload — free memory for distant videos
      video.pause();
      video.removeAttribute("src");
      video.load(); // resets the media element
    }
  }, [isNearby, videoSrc]);

  // Auto-play / pause based on active state
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !videoSrc) return;
    if (isActive && isNearby) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  }, [isActive, isNearby, videoSrc]);

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

  return (
    <div
      ref={cardRef}
      data-short-index={index}
      style={styles.shortCard}
    >
      {/* Video */}
      <div style={styles.videoWrap}>
        {videoSrc ? (
          <video
            ref={videoRef}
            style={styles.video}
            loop
            muted
            playsInline
            preload="none"
            onClick={() => {
              const v = videoRef.current;
              if (v) {
                if (v.paused) v.play();
                else v.pause();
              }
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
