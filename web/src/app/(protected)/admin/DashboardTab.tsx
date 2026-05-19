"use client";

import Link from "next/link";
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
    <div style={s.wrapper}>
      {/* ── Moderation Alerts ──────────────────────────── */}
      {stats && (stats.pending_reports > 0 || stats.pending_verifications > 0) && (
        <section style={s.alertSection}>
          <h3 style={s.alertTitle}>Needs Attention</h3>
          <div style={s.alertGrid}>
            {stats.pending_reports > 0 && (
              <button
                onClick={() => onNavigate("reports")}
                style={s.alertCard}
              >
                <div style={s.alertIcon}>!</div>
                <div style={s.alertInfo}>
                  <span style={s.alertCount}>{stats.pending_reports}</span>
                  <span style={s.alertLabel}>
                    Pending Report{stats.pending_reports !== 1 ? "s" : ""}
                  </span>
                </div>
                <span style={s.alertArrow}>&rarr;</span>
              </button>
            )}
            {stats.pending_verifications > 0 && (
              <button
                onClick={() => onNavigate("verifications")}
                style={{
                  ...s.alertCard,
                  borderLeftColor: "#f59e0b",
                }}
              >
                <div style={{ ...s.alertIcon, background: "#fef3c7", color: "#d97706" }}>
                  ?
                </div>
                <div style={s.alertInfo}>
                  <span style={s.alertCount}>{stats.pending_verifications}</span>
                  <span style={s.alertLabel}>
                    Pending Verification{stats.pending_verifications !== 1 ? "s" : ""}
                  </span>
                </div>
                <span style={s.alertArrow}>&rarr;</span>
              </button>
            )}
          </div>
        </section>
      )}

      {/* ── Quick Stats ────────────────────────────────── */}
      {statsError && (
        <div style={s.errorBox}>
          <p style={s.errorText}>
            {(statsError as { message?: string })?.message ?? "Failed to load stats"}
          </p>
        </div>
      )}

      {statsLoading && (
        <div style={s.statsGrid}>
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} style={s.cardSkeleton}>
              <div className="skeleton" style={{ width: 80, height: 14, borderRadius: 4 }} />
              <div className="skeleton" style={{ width: 50, height: 28, borderRadius: 4, marginTop: 8 }} />
            </div>
          ))}
        </div>
      )}

      {stats && (
        <section>
          <SectionHeader title="Quick Stats" />
          <div style={s.statsGrid}>
            <StatCard
              label="Total Users"
              value={stats.total_users}
              color="#6C63FF"
              trend={stats.users_this_week}
              onClick={() => onNavigate("users")}
            />
            <StatCard
              label="Verified Students"
              value={stats.verified_students}
              color="#0ea5e9"
              sub={`${Math.round((stats.verified_students / Math.max(stats.total_users, 1)) * 100)}% of users`}
            />
            <StatCard
              label="Total Jobs"
              value={stats.total_jobs}
              color="#7c3aed"
              sub={`${stats.active_jobs} active`}
              trend={stats.jobs_this_week}
            />
            <StatCard
              label="Reports"
              value={stats.total_reports}
              color="#ef4444"
              sub={stats.pending_reports > 0 ? `${stats.pending_reports} pending` : undefined}
              trend={stats.reports_this_week}
              highlight={stats.pending_reports > 0}
              onClick={() => onNavigate("reports")}
            />
            <StatCard
              label="Communities"
              value={stats.total_communities}
              color="#8b5cf6"
              sub={`${stats.active_communities} active`}
              trend={stats.communities_this_week}
              onClick={() => onNavigate("communities")}
            />
            <StatCard
              label="Total Posts"
              value={stats.total_posts}
              color="#ec4899"
              trend={stats.posts_this_week}
              onClick={() => onNavigate("posts")}
            />
            <StatCard
              label="Applications"
              value={stats.total_applications}
              color="#2563eb"
              trend={stats.applications_this_week}
            />
            <StatCard
              label="Hidden Posts"
              value={stats.hidden_posts}
              color="#f97316"
              onClick={() => onNavigate("moderation")}
            />
            <StatCard
              label="Active Users"
              value={stats.active_users}
              color="#22c55e"
            />
            <StatCard
              label="Messages"
              value={stats.total_messages}
              color="#14b8a6"
            />
          </div>
        </section>
      )}

      {/* ── Weekly Activity Summary ────────────────────── */}
      {stats && (
        <section style={s.weeklySection}>
          <SectionHeader title="This Week" />
          <div style={s.weeklyGrid}>
            <WeeklyPill label="Users" count={stats.users_this_week} icon="U" color="#6C63FF" />
            <WeeklyPill label="Posts" count={stats.posts_this_week} icon="P" color="#ec4899" />
            <WeeklyPill label="Jobs" count={stats.jobs_this_week} icon="J" color="#7c3aed" />
            <WeeklyPill label="Apps" count={stats.applications_this_week} icon="A" color="#2563eb" />
            <WeeklyPill label="Reports" count={stats.reports_this_week} icon="R" color="#ef4444" />
            <WeeklyPill label="Verifications" count={stats.verifications_this_week} icon="V" color="#f59e0b" />
            <WeeklyPill label="Communities" count={stats.communities_this_week} icon="C" color="#8b5cf6" />
          </div>
        </section>
      )}

      {/* ── Quick Actions ──────────────────────────────── */}
      <section style={s.quickActionsSection}>
        <SectionHeader title="Quick Actions" />
        <div style={s.quickActionsGrid}>
          <ActionBtn
            label="Review Reports"
            sub="Open pending reports"
            color="#ef4444"
            onClick={() => onNavigate("reports")}
          />
          <ActionBtn
            label="Verify Students"
            sub="Review verification requests"
            color="#f59e0b"
            onClick={() => onNavigate("verifications")}
          />
          <ActionBtn
            label="Moderation Queue"
            sub="Hidden posts, new content"
            color="#6C63FF"
            onClick={() => onNavigate("moderation")}
          />
          <ActionBtn
            label="Manage Users"
            sub="Search and manage accounts"
            color="#22c55e"
            onClick={() => onNavigate("users")}
          />
        </div>
      </section>

      {/* ── Recent Activity ────────────────────────────── */}
      {activityError && (
        <div style={{ ...s.errorBox, marginTop: 24 }}>
          <p style={s.errorText}>
            {(activityError as { message?: string })?.message ?? "Failed to load activity"}
          </p>
        </div>
      )}

      {activityLoading && (
        <div style={s.activityGrid}>
          {Array.from({ length: 3 }).map((_, i) => (
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
        <section>
          <SectionHeader title="Recent Activity" />
          <div style={s.activityGrid}>
            {/* Latest Users */}
            <div style={s.activityCard}>
              <div style={s.activityHeader}>
                <h4 style={s.activityTitle}>New Users</h4>
                <button onClick={() => onNavigate("users")} style={s.viewAll}>
                  View all
                </button>
              </div>
              {activity.latest_users.length === 0 && (
                <EmptyRow text="No recent users" />
              )}
              {activity.latest_users.map((u) => (
                <Link key={u.id} href={`/admin/users/${u.id}`} style={s.activityRowLink}>
                  <div style={s.activityAvatar}>
                    {u.username.charAt(0).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span style={s.activityName}>{u.username}</span>
                    <span style={s.activitySub}>{u.email}</span>
                  </div>
                  <span style={s.activityTime}>{formatRelativeTime(u.created_at)}</span>
                </Link>
              ))}
            </div>

            {/* Latest Reports */}
            <div style={s.activityCard}>
              <div style={s.activityHeader}>
                <h4 style={s.activityTitle}>Latest Reports</h4>
                <button onClick={() => onNavigate("reports")} style={s.viewAll}>
                  View all
                </button>
              </div>
              {activity.latest_reports.length === 0 && (
                <EmptyRow text="No recent reports" />
              )}
              {activity.latest_reports.map((r) => (
                <div key={r.id} style={s.activityRow}>
                  <TypeBadge type={r.target_type} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span style={s.activityName}>
                      {r.reason.length > 50 ? r.reason.slice(0, 50) + "..." : r.reason}
                    </span>
                    <span style={s.activitySub}>by @{r.reporter_username}</span>
                  </div>
                  <StatusPill status={r.status} />
                </div>
              ))}
            </div>

            {/* Latest Jobs */}
            <div style={s.activityCard}>
              <div style={s.activityHeader}>
                <h4 style={s.activityTitle}>Recent Posts</h4>
                <button onClick={() => onNavigate("posts")} style={s.viewAll}>
                  View all
                </button>
              </div>
              {activity.latest_posts.length === 0 && (
                <EmptyRow text="No recent posts" />
              )}
              {activity.latest_posts.map((p) => (
                <Link key={p.id} href={`/admin/posts/${p.id}`} style={s.activityRowLink}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={s.activityName}>{p.author_username}</span>
                      <span style={s.inLabel}>in</span>
                      <span style={s.communityTag}>{p.community_name}</span>
                      {p.is_deleted && <span style={s.hiddenTag}>Hidden</span>}
                    </div>
                    <span style={s.activitySub}>
                      {p.content_preview.length > 55
                        ? p.content_preview.slice(0, 55) + "..."
                        : p.content_preview}
                    </span>
                  </div>
                  <span style={s.activityTime}>{formatRelativeTime(p.created_at)}</span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

/* ── Section Header ────────────────────────────────────────── */

function SectionHeader({ title }: { title: string }) {
  return (
    <div style={s.sectionHeader}>
      <h3 style={s.sectionTitle}>{title}</h3>
      <div style={s.sectionLine} />
    </div>
  );
}

/* ── StatCard ──────────────────────────────────────────────── */

function StatCard({
  label,
  value,
  color,
  sub,
  trend,
  highlight,
  onClick,
}: {
  label: string;
  value: number;
  color: string;
  sub?: string;
  trend?: number;
  highlight?: boolean;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      style={{
        ...s.statCard,
        borderLeftWidth: 4,
        borderLeftStyle: "solid" as const,
        borderLeftColor: color,
        cursor: onClick ? "pointer" : "default",
        background: highlight ? "#fff5f5" : "#fff",
      }}
    >
      <span style={s.statLabel}>{label}</span>
      <span style={{ ...s.statValue, color }}>{value.toLocaleString()}</span>
      {sub && <span style={s.statSub}>{sub}</span>}
      {trend !== undefined && trend > 0 && (
        <span style={s.trendBadge}>+{trend} this week</span>
      )}
    </div>
  );
}

/* ── Weekly pill ───────────────────────────────────────────── */

function WeeklyPill({
  label,
  count,
  icon,
  color,
}: {
  label: string;
  count: number;
  icon: string;
  color: string;
}) {
  return (
    <div style={s.weeklyPill}>
      <div
        style={{
          ...s.weeklyIconCircle,
          background: color + "18",
          color,
        }}
      >
        {icon}
      </div>
      <div>
        <span style={s.weeklyCount}>{count}</span>
        <span style={s.weeklyLabel}>{label}</span>
      </div>
    </div>
  );
}

/* ── Quick Action button ───────────────────────────────────── */

function ActionBtn({
  label,
  sub,
  color,
  onClick,
}: {
  label: string;
  sub: string;
  color: string;
  onClick: () => void;
}) {
  return (
    <button onClick={onClick} style={s.actionCard}>
      <div
        style={{
          ...s.actionDot,
          background: color,
        }}
      />
      <div style={{ flex: 1 }}>
        <span style={s.actionLabel}>{label}</span>
        <span style={s.actionSub}>{sub}</span>
      </div>
      <span style={s.actionArrow}>&rarr;</span>
    </button>
  );
}

/* ── Helper badges ─────────────────────────────────────────── */

function TypeBadge({ type }: { type: string }) {
  const colors: Record<string, { bg: string; fg: string }> = {
    post: { bg: "#dbeafe", fg: "#1d4ed8" },
    comment: { bg: "#fef3c7", fg: "#d97706" },
    community: { bg: "#dcfce7", fg: "#16a34a" },
    job: { bg: "#f3e8ff", fg: "#7c3aed" },
    user: { bg: "#fce7f3", fg: "#be185d" },
  };
  const c = colors[type] ?? { bg: "#f3f4f6", fg: "#6b7280" };
  return (
    <span
      style={{
        fontSize: 10,
        fontWeight: 700,
        padding: "2px 7px",
        borderRadius: 5,
        background: c.bg,
        color: c.fg,
        textTransform: "uppercase" as const,
        letterSpacing: 0.5,
        flexShrink: 0,
      }}
    >
      {type}
    </span>
  );
}

function StatusPill({ status }: { status: string }) {
  const colors: Record<string, { bg: string; fg: string }> = {
    pending: { bg: "#fef3c7", fg: "#d97706" },
    reviewed: { bg: "#dbeafe", fg: "#1d4ed8" },
    dismissed: { bg: "#f3f4f6", fg: "#6b7280" },
    action_taken: { bg: "#dcfce7", fg: "#16a34a" },
  };
  const c = colors[status] ?? { bg: "#f3f4f6", fg: "#6b7280" };
  return (
    <span
      style={{
        fontSize: 11,
        fontWeight: 600,
        padding: "2px 8px",
        borderRadius: 6,
        background: c.bg,
        color: c.fg,
        flexShrink: 0,
        textTransform: "capitalize" as const,
      }}
    >
      {status.replace("_", " ")}
    </span>
  );
}

function EmptyRow({ text }: { text: string }) {
  return (
    <div style={s.emptyRow}>
      <span style={s.emptyRowText}>{text}</span>
    </div>
  );
}

/* ── Styles ─────────────────────────────────────────────────── */

const s: Record<string, React.CSSProperties> = {
  wrapper: {
    display: "flex",
    flexDirection: "column",
    gap: 28,
  },

  /* ── Alert section ──────────────────── */
  alertSection: {
    background: "#fff8f8",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "#fecaca",
    borderRadius: 14,
    padding: "18px 22px",
  },
  alertTitle: {
    fontSize: 14,
    fontWeight: 700,
    color: "#dc2626",
    margin: "0 0 12px",
    textTransform: "uppercase" as const,
    letterSpacing: 0.5,
  },
  alertGrid: {
    display: "flex",
    gap: 12,
    flexWrap: "wrap" as const,
  },
  alertCard: {
    display: "flex",
    alignItems: "center",
    gap: 14,
    flex: "1 1 260px",
    background: "#fff",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "#fee2e2",
    borderLeftWidth: 4,
    borderLeftStyle: "solid" as const,
    borderLeftColor: "#ef4444",
    borderRadius: 10,
    padding: "14px 18px",
    cursor: "pointer",
    textAlign: "left" as const,
    transition: "box-shadow 0.15s",
  },
  alertIcon: {
    width: 36,
    height: 36,
    borderRadius: "50%",
    background: "#fee2e2",
    color: "#dc2626",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 16,
    fontWeight: 700,
    flexShrink: 0,
  },
  alertInfo: {
    flex: 1,
    display: "flex",
    flexDirection: "column" as const,
  },
  alertCount: {
    fontSize: 22,
    fontWeight: 700,
    color: "#1a1a1a",
    lineHeight: 1.1,
  },
  alertLabel: {
    fontSize: 13,
    color: "#666",
    fontWeight: 500,
  },
  alertArrow: {
    fontSize: 18,
    color: "#bbb",
    flexShrink: 0,
  },

  /* ── Section header ─────────────────── */
  sectionHeader: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: 700,
    color: "#333",
    margin: 0,
    whiteSpace: "nowrap" as const,
  },
  sectionLine: {
    flex: 1,
    height: 1,
    background: "#eee",
  },

  /* ── Stats grid ─────────────────────── */
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))",
    gap: 14,
  },
  statCard: {
    background: "#fff",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "#eee",
    borderRadius: 12,
    padding: "16px 18px",
    display: "flex",
    flexDirection: "column" as const,
    transition: "box-shadow 0.15s, transform 0.15s",
  },
  statLabel: {
    fontSize: 12,
    color: "#888",
    fontWeight: 600,
    marginBottom: 4,
    textTransform: "uppercase" as const,
    letterSpacing: 0.3,
  },
  statValue: {
    fontSize: 26,
    fontWeight: 700,
    lineHeight: 1.2,
  },
  statSub: {
    fontSize: 12,
    color: "#aaa",
    marginTop: 4,
  },
  trendBadge: {
    display: "inline-block",
    marginTop: 6,
    fontSize: 11,
    fontWeight: 600,
    color: "#16a34a",
    background: "#dcfce7",
    borderRadius: 6,
    padding: "2px 8px",
    alignSelf: "flex-start",
  },
  cardSkeleton: {
    background: "#fff",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "#eee",
    borderRadius: 12,
    padding: "16px 18px",
  },

  /* ── Weekly summary ─────────────────── */
  weeklySection: {},
  weeklyGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
    gap: 10,
  },
  weeklyPill: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    background: "#fff",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "#eee",
    borderRadius: 10,
    padding: "12px 14px",
    transition: "box-shadow 0.15s",
  },
  weeklyIconCircle: {
    width: 34,
    height: 34,
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 14,
    fontWeight: 700,
    flexShrink: 0,
  },
  weeklyCount: {
    display: "block",
    fontSize: 18,
    fontWeight: 700,
    color: "#1a1a1a",
    lineHeight: 1.2,
  },
  weeklyLabel: {
    display: "block",
    fontSize: 11,
    color: "#888",
    fontWeight: 500,
  },

  /* ── Quick Actions ──────────────────── */
  quickActionsSection: {},
  quickActionsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
    gap: 12,
  },
  actionCard: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    background: "#fff",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "#eee",
    borderRadius: 10,
    padding: "14px 18px",
    cursor: "pointer",
    textAlign: "left" as const,
    transition: "box-shadow 0.15s, border-color 0.15s",
  },
  actionDot: {
    width: 10,
    height: 10,
    borderRadius: "50%",
    flexShrink: 0,
  },
  actionLabel: {
    display: "block",
    fontSize: 14,
    fontWeight: 600,
    color: "#1a1a1a",
  },
  actionSub: {
    display: "block",
    fontSize: 12,
    color: "#999",
    marginTop: 1,
  },
  actionArrow: {
    fontSize: 16,
    color: "#ccc",
    flexShrink: 0,
  },

  /* ── Activity section ───────────────── */
  activityGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
    gap: 14,
  },
  activityCard: {
    background: "#fff",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "#eee",
    borderRadius: 12,
    padding: 18,
  },
  activityHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  activityTitle: {
    fontSize: 14,
    fontWeight: 700,
    color: "#1a1a1a",
    margin: 0,
  },
  viewAll: {
    fontSize: 12,
    color: "#6C63FF",
    fontWeight: 600,
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: 0,
  },
  activityRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "9px 0",
    borderBottomWidth: 1,
    borderBottomStyle: "solid" as const,
    borderBottomColor: "#f5f5f5",
  },
  activityRowLink: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "9px 0",
    borderBottomWidth: 1,
    borderBottomStyle: "solid" as const,
    borderBottomColor: "#f5f5f5",
    textDecoration: "none",
    color: "inherit",
  },
  activityAvatar: {
    width: 30,
    height: 30,
    borderRadius: "50%",
    background: "#6C63FF",
    color: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 13,
    fontWeight: 600,
    flexShrink: 0,
  },
  activityName: {
    fontSize: 13,
    fontWeight: 600,
    color: "#1a1a1a",
    display: "block",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap" as const,
  },
  activitySub: {
    fontSize: 11,
    color: "#999",
    display: "block",
    marginTop: 1,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap" as const,
  },
  activityTime: {
    fontSize: 11,
    color: "#bbb",
    flexShrink: 0,
  },
  inLabel: {
    fontSize: 11,
    color: "#bbb",
  },
  communityTag: {
    fontSize: 11,
    color: "#6C63FF",
    fontWeight: 500,
  },
  hiddenTag: {
    display: "inline-block",
    marginLeft: 4,
    padding: "1px 5px",
    fontSize: 10,
    fontWeight: 600,
    background: "#fee2e2",
    color: "#dc2626",
    borderRadius: 4,
  },

  /* ── Empty / Error ──────────────────── */
  emptyRow: {
    textAlign: "center" as const,
    padding: "24px 0",
  },
  emptyRowText: {
    fontSize: 13,
    color: "#ccc",
  },
  errorBox: {
    background: "#fff5f5",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "#fed7d7",
    borderRadius: 12,
    padding: 18,
  },
  errorText: {
    color: "#c53030",
    fontSize: 14,
    margin: 0,
  },
};
