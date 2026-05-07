"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { exploreCommunities, joinCommunity } from "@/api/communities";
import {
  CommunitySkeleton,
  SkeletonList,
} from "@/components/skeletons/Skeletons";
import type {
  PaginatedResponse,
  ExploreCommunityResponse,
} from "@/types/api";

const EXPLORE_KEY = ["explore", "communities"] as const;

export default function ExplorePage() {
  const qc = useQueryClient();
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = useCallback((message: string) => {
    setToastMsg(message);
    setTimeout(() => setToastMsg(null), 3000);
  }, []);

  const { data, isLoading, isError, refetch } = useQuery<
    PaginatedResponse<ExploreCommunityResponse>
  >({
    queryKey: [...EXPLORE_KEY],
    queryFn: () => exploreCommunities({ page: 1, page_size: 30 }),
  });

  const joinMutation = useMutation({
    mutationFn: (communityId: string) => joinCommunity(communityId),
    onMutate: (communityId) => {
      setJoiningId(communityId);
    },
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

  const communities = data?.items ?? [];

  return (
    <div>
      <h2 style={styles.heading}>Explore</h2>
      <p style={styles.subtitle}>Trending Communities</p>

      {isLoading && <SkeletonList count={6} Component={CommunitySkeleton} />}

      {isError && (
        <div style={styles.error}>
          <span>Could not load communities.</span>
          <button onClick={() => refetch()} style={styles.retry}>
            Retry
          </button>
        </div>
      )}

      {!isLoading && !isError && communities.length === 0 && (
        <div style={styles.empty}>
          <span style={styles.emptyIcon}>🌐</span>
          <p style={styles.emptyTitle}>No communities yet</p>
          <p style={styles.emptyHint}>
            Be the first to create one!
          </p>
          <Link href="/communities/create" style={styles.emptyLink}>
            Create Community
          </Link>
        </div>
      )}

      <div style={styles.grid}>
        {communities.map((c) => (
          <div key={c.id} style={styles.card} className="card-hover">
            <Link href={`/communities/${c.id}`} style={styles.cardLink}>
              <h3 style={styles.cardName}>{c.name}</h3>
              <p style={styles.cardDesc}>
                {c.description
                  ? c.description.length > 100
                    ? c.description.slice(0, 100) + "..."
                    : c.description
                  : "No description"}
              </p>
              <span style={styles.memberCount}>
                {c.member_count} {c.member_count === 1 ? "member" : "members"}
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
                    opacity: joiningId === c.id ? 0.6 : joiningId !== null ? 0.4 : 1,
                  }}
                >
                  {joiningId === c.id ? "Joining..." : "Join"}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {toastMsg && (
        <div style={{
          position: "fixed", bottom: 24, right: 24, zIndex: 1100,
          background: "#ef4444", color: "#fff", padding: "12px 20px",
          borderRadius: 8, fontSize: 14, fontWeight: 500,
          boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
        }}>
          {toastMsg}
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  heading: { fontSize: 22, fontWeight: 700, marginBottom: 4 },
  subtitle: { fontSize: 15, color: "#888", marginBottom: 20 },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
    gap: 16,
  },
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
