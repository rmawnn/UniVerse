"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listNotifications, markAsRead, markAllAsRead } from "@/api/notifications";
import { formatRelativeTime } from "@/lib/format";
import {
  NotificationSkeleton,
  SkeletonList,
} from "@/components/skeletons/Skeletons";
import type { NotificationResponse } from "@/types/api";

const NOTIFICATIONS_KEY = ["notifications", "list"] as const;

const BACKEND_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/api\/v1$/, "") ??
  "http://localhost:8000";

/* ── Type helpers ──────────────────────────────────────────── */

function iconForType(type: string): string {
  switch (type) {
    case "like":
      return "❤️";
    case "comment":
      return "💬";
    case "message":
      return "✉️";
    case "follow":
      return "👤";
    case "job_application":
      return "📋";
    case "job_posted":
      return "💼";
    default:
      return "🔔";
  }
}

function badgeColorForType(type: string): string {
  switch (type) {
    case "like":
      return "#ef4444";
    case "comment":
      return "#3b82f6";
    case "message":
      return "#10b981";
    case "follow":
      return "#8b5cf6";
    case "job_application":
      return "#f59e0b";
    case "job_posted":
      return "#0ea5e9";
    default:
      return "#6b7280";
  }
}

function actionTextForType(type: string): string {
  switch (type) {
    case "like":
      return "liked your post";
    case "comment":
      return "commented on your post";
    case "message":
      return "sent you a message";
    case "follow":
      return "started following you";
    case "job_application":
      return "applied to your job";
    case "job_posted":
      return "posted a new job";
    default:
      return "";
  }
}

function hrefForNotification(n: NotificationResponse): string | null {
  if (!n.reference_id) return null;
  switch (n.type) {
    case "like":
    case "comment":
      return `/posts/${n.reference_id}`;
    case "message":
      return `/messages/${n.reference_id}`;
    case "follow":
      return `/profile/${n.reference_id}`;
    case "job_application":
    case "job_posted":
      return `/jobs/${n.reference_id}`;
    default:
      return null;
  }
}

/* ── Simple grouping ───────────────────────────────────────── */

interface GroupedNotification {
  /** The most recent notification in the group */
  latest: NotificationResponse;
  /** All notification IDs in this group */
  ids: string[];
  /** How many are in this group */
  count: number;
  /** All unique actors in the group */
  actors: NotificationResponse["actor"][];
  /** Whether any in the group is unread */
  hasUnread: boolean;
}

/**
 * Group adjacent notifications of the same type targeting the same
 * reference (e.g. "3 people liked your post"). Groups are only formed
 * from consecutive notifications — this keeps the timeline coherent.
 */
function groupNotifications(
  notifications: NotificationResponse[]
): GroupedNotification[] {
  const groups: GroupedNotification[] = [];

  for (const n of notifications) {
    const prev = groups[groups.length - 1];

    // Group if same type + same reference_id + reference_id exists
    if (
      prev &&
      prev.latest.type === n.type &&
      prev.latest.reference_id === n.reference_id &&
      n.reference_id !== null
    ) {
      prev.ids.push(n.id);
      prev.count++;
      if (!prev.actors.find((a) => a?.id === n.actor?.id) && n.actor) {
        prev.actors.push(n.actor);
      }
      if (!n.is_read) prev.hasUnread = true;
    } else {
      groups.push({
        latest: n,
        ids: [n.id],
        count: 1,
        actors: n.actor ? [n.actor] : [],
        hasUnread: !n.is_read,
      });
    }
  }

  return groups;
}

function buildGroupText(g: GroupedNotification): React.ReactNode {
  const { latest, actors, count } = g;

  if (!latest.actor) return <span>{latest.content}</span>;

  // Single notification
  if (count === 1 || actors.length <= 1) {
    return (
      <>
        <Link
          href={`/profile/${latest.actor.id}`}
          onClick={(e) => e.stopPropagation()}
          style={styles.actorName}
        >
          {latest.actor.full_name}
        </Link>{" "}
        <span style={styles.actionText}>
          {actionTextForType(latest.type)}
        </span>
      </>
    );
  }

  // Grouped: "Ali, Sara and 2 others liked your post"
  const firstName = actors[0]?.full_name ?? "";
  const othersCount = actors.length - 1;

  return (
    <>
      <Link
        href={`/profile/${actors[0]?.id}`}
        onClick={(e) => e.stopPropagation()}
        style={styles.actorName}
      >
        {firstName}
      </Link>
      {othersCount === 1 ? (
        <>
          {" and "}
          <Link
            href={`/profile/${actors[1]?.id}`}
            onClick={(e) => e.stopPropagation()}
            style={styles.actorName}
          >
            {actors[1]?.full_name}
          </Link>
        </>
      ) : (
        <span style={styles.actionText}>
          {" "}and {othersCount} others
        </span>
      )}{" "}
      <span style={styles.actionText}>
        {actionTextForType(latest.type)}
      </span>
    </>
  );
}

/* ── Avatar with action badge ──────────────────────────────── */

function NotificationAvatar({
  n,
}: {
  n: NotificationResponse;
}) {
  const profileUrl = n.actor?.profile_image_url
    ? n.actor.profile_image_url.startsWith("http")
      ? n.actor.profile_image_url
      : `${BACKEND_URL}${n.actor.profile_image_url}`
    : null;

  return (
    <div style={styles.avatarWrap}>
      {profileUrl ? (
        <img src={profileUrl} alt="" style={styles.avatarImg} />
      ) : n.actor ? (
        <div style={styles.avatarFallback}>
          {n.actor.full_name.charAt(0).toUpperCase()}
        </div>
      ) : (
        <div style={styles.iconFallback}>{iconForType(n.type)}</div>
      )}
      {/* Action-type badge */}
      <div
        style={{
          ...styles.typeBadge,
          background: badgeColorForType(n.type),
        }}
      >
        <span style={styles.typeBadgeIcon}>{iconForType(n.type)}</span>
      </div>
    </div>
  );
}

/* ── Stacked avatars for grouped notifications ─────────────── */

function GroupedAvatars({ g }: { g: GroupedNotification }) {
  if (g.count === 1 || g.actors.length <= 1) {
    return <NotificationAvatar n={g.latest} />;
  }

  // Show up to 2 stacked avatars
  const shown = g.actors.slice(0, 2);

  return (
    <div style={styles.stackedWrap}>
      {shown.map((actor, i) => {
        const profileUrl = actor?.profile_image_url
          ? actor.profile_image_url.startsWith("http")
            ? actor.profile_image_url
            : `${BACKEND_URL}${actor.profile_image_url}`
          : null;

        return (
          <div
            key={actor?.id ?? i}
            style={{
              ...styles.stackedAvatar,
              zIndex: shown.length - i,
              marginLeft: i > 0 ? -12 : 0,
            }}
          >
            {profileUrl ? (
              <img src={profileUrl} alt="" style={styles.stackedImg} />
            ) : (
              <div style={styles.stackedFallback}>
                {actor?.full_name?.charAt(0).toUpperCase() ?? "?"}
              </div>
            )}
          </div>
        );
      })}
      {/* Action-type badge on the stack */}
      <div
        style={{
          ...styles.typeBadge,
          background: badgeColorForType(g.latest.type),
          right: -2,
          bottom: -2,
        }}
      >
        <span style={styles.typeBadgeIcon}>
          {iconForType(g.latest.type)}
        </span>
      </div>
    </div>
  );
}

/* ── Page component ────────────────────────────────────────── */

export default function NotificationsPage() {
  const router = useRouter();
  const qc = useQueryClient();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: [...NOTIFICATIONS_KEY],
    queryFn: () => listNotifications({ page_size: 50 }),
    refetchInterval: 60_000,
  });

  const notifications = useMemo(() => data?.items ?? [], [data]);
  const hasUnread = notifications.some((n) => !n.is_read);
  const grouped = useMemo(() => groupNotifications(notifications), [notifications]);

  const markOne = useMutation({
    mutationFn: (id: string) => markAsRead(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [...NOTIFICATIONS_KEY] });
      qc.invalidateQueries({ queryKey: ["notifications", "badge"] });
    },
    onError: () => {},
  });

  const markAll = useMutation({
    mutationFn: () => markAllAsRead(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [...NOTIFICATIONS_KEY] });
      qc.invalidateQueries({ queryKey: ["notifications", "badge"] });
    },
    onError: () => {
      qc.invalidateQueries({ queryKey: [...NOTIFICATIONS_KEY] });
    },
  });

  const handleClick = (g: GroupedNotification) => {
    // Mark all in group as read
    for (const id of g.ids) {
      if (g.hasUnread) markOne.mutate(id);
    }
    const href = hrefForNotification(g.latest);
    if (href) router.push(href);
  };

  return (
    <div>
      <div style={styles.headerRow}>
        <h2 style={styles.heading}>Notifications</h2>
        {hasUnread && (
          <button
            type="button"
            onClick={() => markAll.mutate()}
            disabled={markAll.isPending}
            style={styles.markAllBtn}
          >
            {markAll.isPending ? "Marking..." : "Mark all as read"}
          </button>
        )}
      </div>

      {isLoading && (
        <SkeletonList count={5} Component={NotificationSkeleton} />
      )}

      {isError && (
        <div style={styles.error}>
          <span>Could not load notifications.</span>
          <button onClick={() => refetch()} style={styles.retry}>
            Retry
          </button>
        </div>
      )}

      {!isLoading && !isError && notifications.length === 0 && (
        <div style={styles.empty}>
          <span style={styles.emptyIcon}>{"🔔"}</span>
          <p style={styles.emptyTitle}>No notifications yet</p>
          <p style={styles.emptyHint}>
            When someone likes, comments, follows, messages you, or applies to
            your job, it will show up here.
          </p>
        </div>
      )}

      <div style={styles.list}>
        {grouped.map((g) => (
          <button
            key={g.latest.id}
            type="button"
            className="row-hover"
            onClick={() => handleClick(g)}
            style={{
              ...styles.row,
              background: g.hasUnread ? "#f5f4ff" : "#fff",
              borderLeft: g.hasUnread
                ? "3px solid #6C63FF"
                : "3px solid transparent",
            }}
          >
            {/* Avatar(s) with action badge */}
            <GroupedAvatars g={g} />

            {/* Content */}
            <div style={styles.rowContent}>
              <p style={styles.contentText}>{buildGroupText(g)}</p>
              <span style={styles.time}>
                {formatRelativeTime(g.latest.created_at)}
              </span>
            </div>

            {/* Unread dot */}
            {g.hasUnread && <div style={styles.dot} />}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ── Styles ────────────────────────────────────────────────── */

const styles: Record<string, React.CSSProperties> = {
  headerRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  heading: { fontSize: 22, fontWeight: 700, margin: 0 },
  markAllBtn: {
    background: "#fff",
    border: "1px solid #ddd",
    borderRadius: 6,
    padding: "6px 12px",
    fontSize: 13,
    cursor: "pointer",
    color: "#6C63FF",
    fontWeight: 500,
  },
  list: {
    background: "#fff",
    border: "1px solid #eee",
    borderRadius: 10,
    overflow: "hidden",
  },
  row: {
    display: "flex",
    alignItems: "center",
    width: "100%",
    padding: "14px 16px",
    borderBottom: "1px solid #f0f0f0",
    borderTop: "none",
    borderRight: "none",
    textAlign: "left",
    cursor: "pointer",
    fontSize: 14,
    gap: 12,
    transition: "background 0.15s",
  },

  /* ── Avatar ──────────────────── */
  avatarWrap: {
    flexShrink: 0,
    width: 44,
    height: 44,
    position: "relative",
  },
  avatarImg: {
    width: 44,
    height: 44,
    borderRadius: "50%",
    objectFit: "cover" as const,
  },
  avatarFallback: {
    width: 44,
    height: 44,
    borderRadius: "50%",
    background: "#6C63FF",
    color: "#fff",
    fontSize: 18,
    fontWeight: 700,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  iconFallback: {
    width: 44,
    height: 44,
    borderRadius: "50%",
    background: "#f0efff",
    fontSize: 20,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  typeBadge: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    border: "2px solid #fff",
  },
  typeBadgeIcon: {
    fontSize: 10,
    lineHeight: 1,
  },

  /* ── Stacked avatars ─────────── */
  stackedWrap: {
    flexShrink: 0,
    width: 52,
    height: 44,
    position: "relative",
    display: "flex",
    alignItems: "center",
  },
  stackedAvatar: {
    width: 36,
    height: 36,
    borderRadius: "50%",
    border: "2px solid #fff",
    overflow: "hidden",
    position: "relative",
  },
  stackedImg: {
    width: "100%",
    height: "100%",
    objectFit: "cover" as const,
    borderRadius: "50%",
  },
  stackedFallback: {
    width: "100%",
    height: "100%",
    borderRadius: "50%",
    background: "#6C63FF",
    color: "#fff",
    fontSize: 14,
    fontWeight: 700,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  /* ── Content ─────────────────── */
  rowContent: { flex: 1, minWidth: 0 },
  contentText: {
    fontSize: 14,
    margin: "0 0 2px",
    color: "#333",
    lineHeight: 1.4,
  },
  actorName: {
    fontWeight: 600,
    color: "#111",
    textDecoration: "none",
  },
  actionText: {
    color: "#555",
  },
  time: { fontSize: 12, color: "#999" },
  dot: {
    width: 8,
    height: 8,
    borderRadius: "50%",
    background: "#6C63FF",
    flexShrink: 0,
  },

  /* ── States ──────────────────── */
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
