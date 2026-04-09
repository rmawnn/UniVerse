"use client";

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
      return "❤️";
    case "comment":
      return "💬";
    case "message":
      return "✉️";
    case "follow":
      return "👤";
    default:
      return "🔔";
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
        <p style={styles.muted}>No notifications yet.</p>
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
            }}
          >
            <div style={styles.icon}>{iconForType(n.type)}</div>
            <div style={styles.rowContent}>
              <p style={styles.content}>{n.content}</p>
              <span style={styles.time}>
                {formatRelativeTime(n.created_at)}
              </span>
            </div>
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
  },
  muted: { color: "#999", fontSize: 15 },
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
    padding: 14,
    borderBottom: "1px solid #f0f0f0",
    border: "none",
    borderLeftWidth: 0,
    borderRightWidth: 0,
    borderTopWidth: 0,
    borderBottomWidth: 1,
    borderBottomStyle: "solid",
    borderBottomColor: "#f0f0f0",
    textAlign: "left",
    cursor: "pointer",
    fontSize: 14,
  },
  icon: {
    fontSize: 22,
    width: 32,
    textAlign: "center",
    marginRight: 12,
    flexShrink: 0,
  },
  rowContent: { flex: 1, minWidth: 0 },
  content: { fontSize: 14, margin: 0, color: "#333" },
  time: { fontSize: 12, color: "#999" },
  dot: {
    width: 8,
    height: 8,
    borderRadius: "50%",
    background: "#6C63FF",
    marginLeft: 12,
    flexShrink: 0,
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
