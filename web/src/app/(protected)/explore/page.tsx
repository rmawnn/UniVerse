"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getExplore } from "@/api/explore";
import { joinCommunity } from "@/api/communities";
import PostCard from "@/components/post/PostCard";
import {
  PostSkeleton,
  CommunitySkeleton,
  SkeletonList,
} from "@/components/skeletons/Skeletons";
import type { ExploreResponse } from "@/types/api";

const EXPLORE_KEY = ["explore"] as const;

const BACKEND_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/api\/v1$/, "") ??
  "http://localhost:8000";

export default function ExplorePage() {
  const qc = useQueryClient();
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = useCallback((message: string) => {
    setToastMsg(message);
    setTimeout(() => setToastMsg(null), 3000);
  }, []);

  const { data, isLoading, isError, refetch } = useQuery<ExploreResponse>({
    queryKey: [...EXPLORE_KEY],
    queryFn: getExplore,
  });

  const joinMutation = useMutation({
    mutationFn: (communityId: string) => joinCommunity(communityId),
    onMutate: (communityId) => setJoiningId(communityId),
    onSuccess: (_data, communityId) => {
      qc.invalidateQueries({ queryKey: [...EXPLORE_KEY] });
      qc.invalidateQueries({ queryKey: ["community", communityId] });
      qc.invalidateQueries({ queryKey: ["communities"] });
      qc.invalidateQueries({ queryKey: ["feed"] });
      setJoiningId(null);
    },
    onError: (err: { message?: string }) => {
      setJoiningId(null);
      showToast(err?.message ?? "Failed to join community");
    },
  });

  const trendingPosts = data?.trending_posts ?? [];
  const suggestedCommunities = data?.suggested_communities ?? [];
  const suggestedUsers = data?.suggested_users ?? [];

  return (
    <div>
      <h2 style={styles.heading}>Explore</h2>

      {/* ── Error state ─────────────────────────────────── */}
      {isError && (
        <div style={styles.error}>
          <span>Could not load explore data.</span>
          <button onClick={() => refetch()} style={styles.retry}>
            Retry
          </button>
        </div>
      )}

      {/* ── Loading skeleton ────────────────────────────── */}
      {isLoading && (
        <>
          <p style={styles.sectionTitle}>Trending Posts</p>
          <SkeletonList count={3} Component={PostSkeleton} />
          <p style={{ ...styles.sectionTitle, marginTop: 28 }}>
            Suggested Communities
          </p>
          <div style={styles.grid}>
            {Array.from({ length: 3 }).map((_, i) => (
              <CommunitySkeleton key={i} />
            ))}
          </div>
        </>
      )}

      {/* ── Empty state ─────────────────────────────────── */}
      {!isLoading &&
        !isError &&
        trendingPosts.length === 0 &&
        suggestedCommunities.length === 0 &&
        suggestedUsers.length === 0 && (
          <div style={styles.empty}>
            <span style={styles.emptyIcon}>🧭</span>
            <p style={styles.emptyTitle}>Nothing to explore yet</p>
            <p style={styles.emptyHint}>
              Join communities and follow people to see suggestions here.
            </p>
          </div>
        )}

      {/* ── Trending Posts ──────────────────────────────── */}
      {!isLoading && trendingPosts.length > 0 && (
        <section style={{ marginBottom: 32 }}>
          <p style={styles.sectionTitle}>Trending Posts</p>
          <div style={styles.postList}>
            {trendingPosts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                invalidateKeys={[["explore"], ["feed"]]}
              />
            ))}
          </div>
        </section>
      )}

      {/* ── Suggested Communities ───────────────────────── */}
      {!isLoading && suggestedCommunities.length > 0 && (
        <section style={{ marginBottom: 32 }}>
          <p style={styles.sectionTitle}>Suggested Communities</p>
          <div style={styles.grid}>
            {suggestedCommunities.map((c) => (
              <div key={c.id} style={styles.card} className="card-hover">
                <Link
                  href={`/communities/${c.id}`}
                  style={styles.cardLink}
                >
                  <h3 style={styles.cardName}>{c.name}</h3>
                  <p style={styles.cardDesc}>
                    {c.description
                      ? c.description.length > 100
                        ? c.description.slice(0, 100) + "..."
                        : c.description
                      : "No description"}
                  </p>
                  <span style={styles.memberCount}>
                    {c.member_count}{" "}
                    {c.member_count === 1 ? "member" : "members"}
                  </span>
                </Link>
                <div style={styles.cardFooter}>
                  {c.is_member ? (
                    <span style={styles.joinedBadge}>Joined</span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => joinMutation.mutate(c.id)}
                      disabled={joiningId !== null}
                      style={{
                        ...styles.joinBtn,
                        opacity:
                          joiningId === c.id
                            ? 0.6
                            : joiningId !== null
                              ? 0.4
                              : 1,
                      }}
                    >
                      {joiningId === c.id ? "Joining..." : "Join"}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Suggested Users ─────────────────────────────── */}
      {!isLoading && suggestedUsers.length > 0 && (
        <section style={{ marginBottom: 32 }}>
          <p style={styles.sectionTitle}>Suggested Users</p>
          <div style={styles.grid}>
            {suggestedUsers.map((u) => {
              const profileUrl = u.profile_image_url
                ? u.profile_image_url.startsWith("http")
                  ? u.profile_image_url
                  : `${BACKEND_URL}${u.profile_image_url}`
                : null;

              return (
                <Link
                  key={u.id}
                  href={`/profile/${u.id}`}
                  style={{ textDecoration: "none", color: "inherit" }}
                >
                  <div style={styles.userCard} className="card-hover">
                    {profileUrl ? (
                      <img
                        src={profileUrl}
                        alt=""
                        style={styles.userAvatar}
                      />
                    ) : (
                      <div style={styles.userAvatarFallback}>
                        {u.full_name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div style={styles.userName}>{u.full_name}</div>
                    <div style={styles.userHandle}>@{u.username}</div>
                    {u.is_verified_student && (
                      <span style={styles.verifiedBadge}>Verified</span>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* ── Toast ───────────────────────────────────────── */}
      {toastMsg && (
        <div
          style={{
            position: "fixed",
            bottom: 24,
            right: 24,
            zIndex: 1100,
            background: "#ef4444",
            color: "#fff",
            padding: "12px 20px",
            borderRadius: 8,
            fontSize: 14,
            fontWeight: 500,
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
          }}
        >
          {toastMsg}
        </div>
      )}
    </div>
  );
}

/* ── Styles ────────────────────────────────────────────────── */

const styles: Record<string, React.CSSProperties> = {
  heading: { fontSize: 22, fontWeight: 700, marginBottom: 20 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 600,
    color: "#333",
    marginBottom: 12,
    marginTop: 0,
  },
  postList: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
    gap: 16,
  },

  /* ── Community cards ──────────────── */
  card: {
    background: "#fff",
    border: "1px solid #eee",
    borderRadius: 12,
    padding: 20,
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    transition: "border-color 0.15s",
  },
  cardLink: {
    textDecoration: "none",
    color: "inherit",
    flex: 1,
  },
  cardName: {
    fontSize: 16,
    fontWeight: 600,
    margin: "0 0 6px",
    color: "#111",
  },
  cardDesc: {
    fontSize: 13,
    color: "#666",
    margin: "0 0 12px",
    lineHeight: 1.5,
  },
  memberCount: {
    fontSize: 12,
    color: "#999",
    fontWeight: 500,
  },
  cardFooter: {
    marginTop: 14,
    paddingTop: 12,
    borderTop: "1px solid #f0f0f0",
    display: "flex",
    justifyContent: "flex-end",
  },
  joinBtn: {
    background: "#6C63FF",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    padding: "6px 18px",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
  },
  joinedBadge: {
    background: "#f0efff",
    color: "#6C63FF",
    borderRadius: 8,
    padding: "6px 14px",
    fontSize: 13,
    fontWeight: 600,
  },

  /* ── User cards ───────────────────── */
  userCard: {
    background: "#fff",
    border: "1px solid #eee",
    borderRadius: 12,
    padding: 20,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    textAlign: "center",
    transition: "border-color 0.15s",
  },
  userAvatar: {
    width: 56,
    height: 56,
    borderRadius: "50%",
    objectFit: "cover" as const,
    marginBottom: 10,
  },
  userAvatarFallback: {
    width: 56,
    height: 56,
    borderRadius: "50%",
    background: "#6C63FF",
    color: "#fff",
    fontSize: 22,
    fontWeight: 700,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  userName: {
    fontSize: 14,
    fontWeight: 600,
    color: "#111",
    marginBottom: 2,
  },
  userHandle: {
    fontSize: 12,
    color: "#999",
    marginBottom: 6,
  },
  verifiedBadge: {
    fontSize: 11,
    color: "#6C63FF",
    background: "#f0efff",
    borderRadius: 6,
    padding: "2px 8px",
    fontWeight: 500,
  },

  /* ── States ───────────────────────── */
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
