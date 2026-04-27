"use client";

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

function iconForType(type: string): string {
  switch (type) {
    case "like":
      return "\u2764\uFE0F";
    case "comment":
      return "\uD83D\uDCAC";
    case "message":
      return "\u2709\uFE0F";
    case "follow":
      return "\uD83D\uDC64";
    default:
      return "\uD83D\uDD14";
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
    default:
      return null;
  }
}

export default function NotificationsPage() {
  const router = useRouter();
  const qc = useQueryClient();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: [...NOTIFICATIONS_KEY],
    queryFn: () => listNotifications({ page_size: 50 }),
    refetchInterval: 20_000,
  });

  const notifications = data?.items ?? [];
  const hasUnread = notifications.some((n) => !n.is_read);

  const markOne = useMutation({
    mutationFn: (id: string) => markAsRead(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [...NOTIFICATIONS_KEY] });
      qc.invalidateQueries({ queryKey: ["notifications", "badge"] });
    },
  });

  const markAll = useMutation({
    mutationFn: () => markAllAsRead(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [...NOTIFICATIONS_KEY] });
      qc.invalidateQueries({ queryKey: ["notifications", "badge"] });
    },
  });

  const handleClick = (n: NotificationResponse) => {
    if (!n.is_read) markOne.mutate(n.id);
    const href = hrefForNotification(n);
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
          <span style={styles.emptyIcon}>{"\uD83D\uDD14"}</span>
          <p style={styles.emptyTitle}>No notifications yet</p>
          <p style={styles.emptyHint}>
            When someone likes, comments, or messages you, it will show up here.
          </p>
        </div>
      )}

      <div style={styles.list}>
        {notifications.map((n) => (
          <button
            key={n.id}
            type="button"
            onClick={() => handleClick(n)}
            style={{
              ...styles.row,
              background: n.is_read ? "#fff" : "#f5f4ff",
              borderLeft: n.is_read ? "3px solid transparent" : "3px solid #6C63FF",
            }}
          >
            {/* Avatar or icon */}
            <div style={styles.avatarWrap}>
              {n.actor?.profile_image_url ? (
                <img
                  src={n.actor.profile_image_url}
                  alt=""
                  style={styles.avatarImg}
                />
              ) : n.actor ? (
                <div style={styles.avatarFallback}>
                  {n.actor.full_name.charAt(0).toUpperCase()}
                </div>
              ) : (
                <div style={styles.iconFallback}>{iconForType(n.type)}</div>
              )}
            </div>

            {/* Content */}
            <div style={styles.rowContent}>
              <p style={styles.contentText}>
                {n.actor ? (
                  <>
                    <Link
                      href={`/profile/${n.actor.id}`}
                      onClick={(e) => e.stopPropagation()}
                      style={styles.actorName}
                    >
                      {n.actor.full_name}
                    </Link>{" "}
                    <span style={styles.actionText}>
                      {actionTextForType(n.type)}
                    </span>
                  </>
                ) : (
                  <span>{n.content}</span>
                )}
              </p>
              <div style={styles.meta}>
                <span style={styles.typeIcon}>{iconForType(n.type)}</span>
                <span style={styles.time}>
                  {formatRelativeTime(n.created_at)}
                </span>
              </div>
            </div>

            {/* Unread dot */}
            {!n.is_read && <div style={styles.dot} />}
          </button>
        ))}
      </div>
    </div>
  );
}

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
    transition: "background 0.1s",
  },
  avatarWrap: {
    flexShrink: 0,
    width: 40,
    height: 40,
  },
  avatarImg: {
    width: 40,
    height: 40,
    borderRadius: "50%",
    objectFit: "cover" as const,
  },
  avatarFallback: {
    width: 40,
    height: 40,
    borderRadius: "50%",
    background: "#6C63FF",
    color: "#fff",
    fontSize: 16,
    fontWeight: 700,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  iconFallback: {
    width: 40,
    height: 40,
    borderRadius: "50%",
    background: "#f0efff",
    fontSize: 20,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  rowContent: { flex: 1, minWidth: 0 },
  contentText: {
    fontSize: 14,
    margin: "0 0 4px",
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
  meta: {
    display: "flex",
    alignItems: "center",
    gap: 6,
  },
  typeIcon: {
    fontSize: 12,
  },
  time: { fontSize: 12, color: "#999" },
  dot: {
    width: 8,
    height: 8,
    borderRadius: "50%",
    background: "#6C63FF",
    flexShrink: 0,
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
