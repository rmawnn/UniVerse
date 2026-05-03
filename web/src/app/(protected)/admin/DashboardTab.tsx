"use client";

import { useQuery } from "@tanstack/react-query";
import { getStats, getRecentActivity } from "@/api/admin";
import type { AdminStats, RecentActivity } from "@/api/admin";
import { formatRelativeTime } from "@/lib/format";

export default function DashboardTab({
  onNavigate,
}: {
  onNavigate: (tab: string) => void;
}) {
  const {
    data: stats,
    isLoading: statsLoading,
    error: statsError,
  } = useQuery<AdminStats>({
    queryKey: ["admin-stats"],
    queryFn: getStats,
  });

  const {
    data: activity,
    isLoading: activityLoading,
    error: activityError,
  } = useQuery<RecentActivity>({
    queryKey: ["admin-recent-activity"],
    queryFn: getRecentActivity,
  });

  return (
    <div>
      {/* ── Stats Cards ──────────────────────────────── */}
      {statsError && (
        <div style={s.errorBox}>
          <p style={s.errorText}>
            {(statsError as { message?: string })?.message ?? "Failed to load stats"}
          </p>
        </div>
      )}

      {statsLoading && (
        <div style={s.grid}>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} style={s.cardSkeleton}>
              <div className="skeleton" style={{ width: 80, height: 14, borderRadius: 4 }} />
              <div className="skeleton" style={{ width: 50, height: 28, borderRadius: 4, marginTop: 8 }} />
            </div>
          ))}
        </div>
      )}

      {stats && (
        <div style={s.grid}>
          <StatCard
            label="Total Users"
            value={stats.total_users}
            color="#6C63FF"
            onClick={() => onNavigate("users")}
          />
          <StatCard
            label="Active Users"
            value={stats.active_users}
            color="#22c55e"
          />
          <StatCard
            label="Verified Students"
            value={stats.verified_students}
            color="#0ea5e9"
          />
          <StatCard
            label="Pending Verifications"
            value={stats.pending_verifications}
            color="#f59e0b"
            highlight={stats.pending_verifications > 0}
            onClick={() => onNavigate("verifications")}
          />
          <StatCard
            label="Communities"
            value={stats.total_communities}
            color="#8b5cf6"
            sub={`${stats.active_communities} active`}
            onClick={() => onNavigate("communities")}
          />
          <StatCard
            label="Total Posts"
            value={stats.total_posts}
            color="#ec4899"
            onClick={() => onNavigate("posts")}
          />
          <StatCard
            label="Hidden Posts"
            value={stats.hidden_posts}
            color="#ef4444"
          />
          <StatCard
            label="Messages"
            value={stats.total_messages}
            color="#14b8a6"
          />
        </div>
      )}

      {/* ── Recent Activity ──────────────────────────── */}
      {activityError && (
        <div style={{ ...s.errorBox, marginTop: 24 }}>
          <p style={s.errorText}>
            {(activityError as { message?: string })?.message ?? "Failed to load activity"}
          </p>
        </div>
      )}

      {activityLoading && (
        <div style={s.activityGrid}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} style={s.activityCard}>
              <div className="skeleton" style={{ width: 120, height: 16, borderRadius: 4 }} />
              {Array.from({ length: 3 }).map((__, j) => (
                <div key={j} className="skeleton" style={{ width: "100%", height: 14, borderRadius: 4, marginTop: 10 }} />
              ))}
            </div>
          ))}
        </div>
      )}

      {activity && (
        <div style={s.activityGrid}>
          {/* Latest Users */}
          <div style={s.activityCard}>
            <div style={s.activityHeader}>
              <h3 style={s.activityTitle}>New Users</h3>
              <button onClick={() => onNavigate("users")} style={s.viewAll}>
                View all
              </button>
            </div>
            {activity.latest_users.length === 0 && (
              <p style={s.emptyActivity}>No recent users</p>
            )}
            {activity.latest_users.map((u) => (
              <div key={u.id} style={s.activityRow}>
                <div style={s.activityAvatar}>
                  {u.username.charAt(0).toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                  <span style={s.activityName}>{u.username}</span>
                  <span style={s.activitySub}>{u.email}</span>
                </div>
                <span style={s.activityTime}>{formatRelativeTime(u.created_at)}</span>
              </div>
            ))}
          </div>

          {/* Latest Verifications */}
          <div style={s.activityCard}>
            <div style={s.activityHeader}>
              <h3 style={s.activityTitle}>Verification Requests</h3>
              <button onClick={() => onNavigate("verifications")} style={s.viewAll}>
                View all
              </button>
            </div>
            {activity.latest_verifications.length === 0 && (
              <p style={s.emptyActivity}>No recent verifications</p>
            )}
            {activity.latest_verifications.map((v) => (
              <div key={v.id} style={s.activityRow}>
                <div style={{
                  ...s.statusDot,
                  background: v.status === "pending" ? "#f59e0b"
                    : v.status === "verified" ? "#22c55e"
                    : v.status === "rejected" ? "#ef4444"
                    : "#9ca3af",
                }} />
                <div style={{ flex: 1 }}>
                  <span style={s.activityName}>{v.username}</span>
                  <span style={s.activitySub}>{v.university_email}</span>
                </div>
                <span style={{
                  ...s.statusPill,
                  background: v.status === "pending" ? "#fef3c7" : v.status === "verified" ? "#dcfce7" : v.status === "rejected" ? "#fee2e2" : "#f3f4f6",
                  color: v.status === "pending" ? "#d97706" : v.status === "verified" ? "#16a34a" : v.status === "rejected" ? "#dc2626" : "#6b7280",
                }}>
                  {v.status}
                </span>
              </div>
            ))}
          </div>

          {/* Latest Posts */}
          <div style={s.activityCard}>
            <div style={s.activityHeader}>
              <h3 style={s.activityTitle}>Recent Posts</h3>
              <button onClick={() => onNavigate("posts")} style={s.viewAll}>
                View all
              </button>
            </div>
            {activity.latest_posts.length === 0 && (
              <p style={s.emptyActivity}>No recent posts</p>
            )}
            {activity.latest_posts.map((p) => (
              <div key={p.id} style={s.activityRow}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={s.activityName}>{p.author_username}</span>
                    <span style={s.inLabel}>in</span>
                    <span style={s.communityTag}>{p.community_name}</span>
                    {p.is_deleted && <span style={s.hiddenTag}>Hidden</span>}
                  </div>
                  <span style={s.activitySub}>
                    {p.content_preview.length > 60
                      ? p.content_preview.slice(0, 60) + "..."
                      : p.content_preview}
                  </span>
                </div>
                <span style={s.activityTime}>{formatRelativeTime(p.created_at)}</span>
              </div>
            ))}
          </div>

          {/* Latest Communities */}
          <div style={s.activityCard}>
            <div style={s.activityHeader}>
              <h3 style={s.activityTitle}>New Communities</h3>
              <button onClick={() => onNavigate("communities")} style={s.viewAll}>
                View all
              </button>
            </div>
            {activity.latest_communities.length === 0 && (
              <p style={s.emptyActivity}>No recent communities</p>
            )}
            {activity.latest_communities.map((c) => (
              <div key={c.id} style={s.activityRow}>
                <div style={{ flex: 1 }}>
                  <span style={s.activityName}>{c.name}</span>
                  {c.is_deleted && <span style={s.hiddenTag}>Deleted</span>}
                </div>
                <span style={s.activityTime}>{formatRelativeTime(c.created_at)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
  sub,
  highlight,
  onClick,
}: {
  label: string;
  value: number;
  color: string;
  sub?: string;
  highlight?: boolean;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      style={{
        ...s.statCard,
        borderLeft: `4px solid ${color}`,
        cursor: onClick ? "pointer" : "default",
        background: highlight ? "#fffbeb" : "#fff",
      }}
    >
      <span style={s.statLabel}>{label}</span>
      <span style={{ ...s.statValue, color }}>{value.toLocaleString()}</span>
      {sub && <span style={s.statSub}>{sub}</span>}
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
    gap: 16,
    marginBottom: 32,
  },
  statCard: {
    background: "#fff",
    border: "1px solid #eee",
    borderRadius: 12,
    padding: "18px 20px",
    display: "flex",
    flexDirection: "column",
    transition: "box-shadow 0.2s",
  },
  statLabel: {
    fontSize: 13,
    color: "#888",
    fontWeight: 500,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 28,
    fontWeight: 700,
    lineHeight: 1.2,
  },
  statSub: {
    fontSize: 12,
    color: "#aaa",
    marginTop: 4,
  },
  cardSkeleton: {
    background: "#fff",
    border: "1px solid #eee",
    borderRadius: 12,
    padding: "18px 20px",
  },
  activityGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
    gap: 16,
  },
  activityCard: {
    background: "#fff",
    border: "1px solid #eee",
    borderRadius: 12,
    padding: 20,
  },
  activityHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  activityTitle: {
    fontSize: 15,
    fontWeight: 700,
    color: "#1a1a1a",
    margin: 0,
  },
  viewAll: {
    fontSize: 13,
    color: "#6C63FF",
    fontWeight: 500,
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: 0,
  },
  activityRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "10px 0",
    borderBottom: "1px solid #f5f5f5",
  },
  activityAvatar: {
    width: 32,
    height: 32,
    borderRadius: "50%",
    background: "#6C63FF",
    color: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 14,
    fontWeight: 600,
    flexShrink: 0,
  },
  activityName: {
    fontSize: 14,
    fontWeight: 600,
    color: "#1a1a1a",
    display: "block",
  },
  activitySub: {
    fontSize: 12,
    color: "#999",
    display: "block",
    marginTop: 1,
  },
  activityTime: {
    fontSize: 12,
    color: "#bbb",
    flexShrink: 0,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: "50%",
    flexShrink: 0,
  },
  statusPill: {
    display: "inline-block",
    padding: "2px 8px",
    borderRadius: 10,
    fontSize: 11,
    fontWeight: 600,
    textTransform: "capitalize" as const,
    flexShrink: 0,
  },
  inLabel: {
    fontSize: 12,
    color: "#bbb",
  },
  communityTag: {
    fontSize: 12,
    color: "#6C63FF",
    fontWeight: 500,
  },
  hiddenTag: {
    display: "inline-block",
    marginLeft: 6,
    padding: "1px 6px",
    fontSize: 10,
    fontWeight: 600,
    background: "#fee2e2",
    color: "#dc2626",
    borderRadius: 4,
  },
  emptyActivity: {
    textAlign: "center",
    padding: "20px 0",
    color: "#ccc",
    fontSize: 13,
  },
  errorBox: {
    background: "#fff5f5",
    border: "1px solid #fed7d7",
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
  },
  errorText: {
    color: "#c53030",
    fontSize: 14,
    margin: 0,
  },
};
