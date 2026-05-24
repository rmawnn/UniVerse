"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getExplore } from "@/api/explore";
import { joinCommunity } from "@/api/communities";
import {
  getTrendingCommunities,
  getTrendingJobs,
} from "@/api/trending";
import type {
  TrendingCommunityItem,
  TrendingJobItem,
} from "@/api/trending";
import PostCard from "@/components/post/PostCard";
import {
  PostSkeleton,
  CommunitySkeleton,
  SkeletonList,
} from "@/components/skeletons/Skeletons";
import SuggestedUsers from "@/components/users/SuggestedUsers";
import type { ExploreResponse } from "@/types/api";

const EXPLORE_KEY = ["explore"] as const;

/* ── helpers ──────────────────────────────────────────────── */

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function JobTypeBadge({ type }: { type: string }) {
  const label = type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  const bg =
    type === "full_time"
      ? "#e8f5e9"
      : type === "part_time"
        ? "#fff3e0"
        : type === "internship"
          ? "#e3f2fd"
          : "#f3e8ff";
  const color =
    type === "full_time"
      ? "#2e7d32"
      : type === "part_time"
        ? "#e65100"
        : type === "internship"
          ? "#1565c0"
          : "#7b1fa2";
  return (
    <span
      style={{
        fontSize: 11,
        fontWeight: 600,
        padding: "3px 10px",
        borderRadius: 6,
        background: bg,
        color,
      }}
    >
      {label}
    </span>
  );
}

function FireIcon() {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 22,
        height: 22,
        borderRadius: "50%",
        background: "#fff3e0",
        color: "#e65100",
        fontSize: 12,
        fontWeight: 700,
        marginRight: 6,
        flexShrink: 0,
      }}
    >
      T
    </span>
  );
}

function SectionHeader({
  title,
  subtitle,
  icon,
}: {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        {icon}
        <h3
          style={{
            fontSize: 17,
            fontWeight: 700,
            color: "#111",
            margin: 0,
          }}
        >
          {title}
        </h3>
      </div>
      {subtitle && (
        <p
          style={{
            fontSize: 13,
            color: "#888",
            margin: "4px 0 0",
          }}
        >
          {subtitle}
        </p>
      )}
    </div>
  );
}

function EngagementPill({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        fontSize: 11,
        fontWeight: 600,
        padding: "3px 8px",
        borderRadius: 6,
        background: color + "14",
        color,
      }}
    >
      {value} {label}
    </span>
  );
}

function TrendingScoreBadge({ score }: { score: number }) {
  return (
    <span
      style={{
        fontSize: 10,
        fontWeight: 700,
        padding: "2px 7px",
        borderRadius: 4,
        background: "#6C63FF",
        color: "#fff",
        letterSpacing: 0.3,
      }}
    >
      {score.toFixed(1)}
    </span>
  );
}

/* ── Skeleton for compact cards ──────────────────────────── */

function CompactCardSkeleton() {
  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #eee",
        borderRadius: 12,
        padding: 16,
      }}
    >
      <div className="skeleton" style={{ width: "70%", height: 14, borderRadius: 6, marginBottom: 8 }} />
      <div className="skeleton" style={{ width: "50%", height: 10, borderRadius: 6, marginBottom: 10 }} />
      <div style={{ display: "flex", gap: 6 }}>
        <div className="skeleton" style={{ width: 50, height: 18, borderRadius: 6 }} />
        <div className="skeleton" style={{ width: 50, height: 18, borderRadius: 6 }} />
      </div>
    </div>
  );
}

/* ── Main page ────────────────────────────────────────────── */

export default function ExplorePage() {
  const qc = useQueryClient();
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = useCallback((message: string) => {
    setToastMsg(message);
    setTimeout(() => setToastMsg(null), 3000);
  }, []);

  /* existing explore data */
  const { data, isLoading, isError, refetch } = useQuery<ExploreResponse>({
    queryKey: [...EXPLORE_KEY],
    queryFn: getExplore,
  });

  /* trending communities */
  const {
    data: trendingComms,
    isLoading: commsLoading,
  } = useQuery<TrendingCommunityItem[]>({
    queryKey: ["trending", "communities"],
    queryFn: () => getTrendingCommunities(6),
  });

  /* trending jobs */
  const {
    data: trendingJobs,
    isLoading: jobsLoading,
  } = useQuery<TrendingJobItem[]>({
    queryKey: ["trending", "jobs"],
    queryFn: () => getTrendingJobs(6),
  });

  const joinMutation = useMutation({
    mutationFn: (communityId: string) => joinCommunity(communityId),
    onMutate: (communityId) => setJoiningId(communityId),
    onSuccess: (_data, communityId) => {
      qc.invalidateQueries({ queryKey: [...EXPLORE_KEY] });
      qc.invalidateQueries({ queryKey: ["trending", "communities"] });
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
  const comms = trendingComms ?? [];
  const jobs = trendingJobs ?? [];

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
        comms.length === 0 &&
        jobs.length === 0 && (
          <div style={styles.empty}>
            <span style={styles.emptyIcon}>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 56,
                  height: 56,
                  borderRadius: "50%",
                  background: "#f0efff",
                  color: "#6C63FF",
                  fontSize: 26,
                  fontWeight: 700,
                }}
              >
                E
              </span>
            </span>
            <p style={styles.emptyTitle}>Nothing to explore yet</p>
            <p style={styles.emptyHint}>
              Join communities and follow people to see suggestions here.
            </p>
          </div>
        )}

      {/* ── Trending Posts ──────────────────────────────── */}
      {!isLoading && trendingPosts.length > 0 && (
        <section style={{ marginBottom: 32 }}>
          <SectionHeader
            title="Trending Posts"
            subtitle="Most engaging posts this week"
            icon={<FireIcon />}
          />
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

      {/* ── Trending Communities ────────────────────────── */}
      {commsLoading && (
        <section style={{ marginBottom: 32 }}>
          <SectionHeader
            title="Trending Communities"
            subtitle="Growing fast this week"
            icon={<FireIcon />}
          />
          <div style={styles.grid}>
            {Array.from({ length: 3 }).map((_, i) => (
              <CompactCardSkeleton key={i} />
            ))}
          </div>
        </section>
      )}
      {!commsLoading && comms.length > 0 && (
        <section style={{ marginBottom: 32 }}>
          <SectionHeader
            title="Trending Communities"
            subtitle="Growing fast this week"
            icon={<FireIcon />}
          />
          <div style={styles.grid}>
            {comms.map((c) => (
              <div key={c.id} style={styles.card} className="card-hover">
                <Link href={`/communities/${c.id}`} style={styles.cardLink}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      marginBottom: 6,
                    }}
                  >
                    <h3 style={styles.cardName}>{c.name}</h3>
                    <TrendingScoreBadge score={c.trending_score} />
                  </div>
                  <p style={styles.cardDesc}>
                    {c.description
                      ? c.description.length > 100
                        ? c.description.slice(0, 100) + "..."
                        : c.description
                      : "No description"}
                  </p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    <EngagementPill
                      label="members"
                      value={c.member_count}
                      color="#6C63FF"
                    />
                    <EngagementPill
                      label="posts/wk"
                      value={c.posts_this_week}
                      color="#2e7d32"
                    />
                    {c.new_members_this_week > 0 && (
                      <EngagementPill
                        label="new"
                        value={c.new_members_this_week}
                        color="#e65100"
                      />
                    )}
                  </div>
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

      {/* ── Suggested Communities ───────────────────────── */}
      {!isLoading && suggestedCommunities.length > 0 && (
        <section style={{ marginBottom: 32 }}>
          <SectionHeader title="Suggested Communities" />
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

      {/* ── Trending Jobs ──────────────────────────────── */}
      {jobsLoading && (
        <section style={{ marginBottom: 32 }}>
          <SectionHeader
            title="Trending Jobs"
            subtitle="Most applied-to positions"
            icon={<FireIcon />}
          />
          <div style={styles.grid}>
            {Array.from({ length: 3 }).map((_, i) => (
              <CompactCardSkeleton key={i} />
            ))}
          </div>
        </section>
      )}
      {!jobsLoading && jobs.length > 0 && (
        <section style={{ marginBottom: 32 }}>
          <SectionHeader
            title="Trending Jobs"
            subtitle="Most applied-to positions"
            icon={<FireIcon />}
          />
          <div style={styles.grid}>
            {jobs.map((j) => (
              <Link
                key={j.id}
                href={`/jobs/${j.id}`}
                style={{ textDecoration: "none", color: "inherit" }}
              >
                <div style={styles.jobCard} className="card-hover">
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      marginBottom: 4,
                    }}
                  >
                    <h3 style={styles.jobTitle}>{j.title}</h3>
                    <TrendingScoreBadge score={j.trending_score} />
                  </div>
                  {j.company_name && (
                    <p style={styles.jobCompany}>{j.company_name}</p>
                  )}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      marginBottom: 10,
                    }}
                  >
                    <JobTypeBadge type={j.job_type} />
                    {j.location && (
                      <span style={{ fontSize: 12, color: "#888" }}>
                        {j.location}
                      </span>
                    )}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      flexWrap: "wrap",
                    }}
                  >
                    <EngagementPill
                      label="applied"
                      value={j.application_count}
                      color="#1565c0"
                    />
                    <EngagementPill
                      label="saved"
                      value={j.save_count}
                      color="#e65100"
                    />
                  </div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginTop: 10,
                      paddingTop: 10,
                      borderTop: "1px solid #f0f0f0",
                    }}
                  >
                    <span style={{ fontSize: 11, color: "#aaa" }}>
                      by {j.author_username}
                    </span>
                    <span style={{ fontSize: 11, color: "#aaa" }}>
                      {timeAgo(j.created_at)}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ── Suggested Users (with follow) ─────────────── */}
      {!isLoading && (
        <section style={{ marginBottom: 32 }}>
          <SectionHeader title="People You May Know" />
          <SuggestedUsers variant="card" limit={6} />
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
            paddingTop: 12,
            paddingBottom: 12,
            paddingLeft: 20,
            paddingRight: 20,
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
    paddingTop: 6,
    paddingBottom: 6,
    paddingLeft: 18,
    paddingRight: 18,
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
  },
  joinedBadge: {
    background: "#f0efff",
    color: "#6C63FF",
    borderRadius: 8,
    paddingTop: 6,
    paddingBottom: 6,
    paddingLeft: 14,
    paddingRight: 14,
    fontSize: 13,
    fontWeight: 600,
  },

  /* ── Job cards ───────────────────── */
  jobCard: {
    background: "#fff",
    border: "1px solid #eee",
    borderRadius: 12,
    padding: 20,
    transition: "border-color 0.15s",
  },
  jobTitle: {
    fontSize: 15,
    fontWeight: 600,
    margin: "0 0 2px",
    color: "#111",
    flex: 1,
    marginRight: 8,
  },
  jobCompany: {
    fontSize: 13,
    color: "#555",
    margin: "0 0 8px",
    fontWeight: 500,
  },

  /* ── States ───────────────────────── */
  empty: {
    textAlign: "center",
    paddingTop: 48,
    paddingBottom: 48,
    paddingLeft: 24,
    paddingRight: 24,
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
    paddingTop: 4,
    paddingBottom: 4,
    paddingLeft: 12,
    paddingRight: 12,
    fontSize: 13,
    cursor: "pointer",
  },
};
