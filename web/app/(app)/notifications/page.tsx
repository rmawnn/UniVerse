"use client";

import type { LucideIcon } from "lucide-react";
import {
  Bell,
  Calendar,
  Check,
  Hash,
  Heart,
  MessageCircle,
  RefreshCw,
  Settings,
  Sparkles,
  User as UserIcon,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/AppShell";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { WidgetCard } from "@/components/widgets/WidgetCard";
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  type NotificationResponse,
} from "@/lib/api/notifications";
import { cn } from "@/lib/utils";

/* ── Type → icon/color mapping ──────────────────────────────── */

const TYPE_META: Record<
  string,
  { Icon: LucideIcon; color: string; bg: string; fill?: boolean }
> = {
  like: { Icon: Heart, color: "text-danger", bg: "bg-danger/12", fill: true },
  comment: {
    Icon: MessageCircle,
    color: "text-brand-blue",
    bg: "bg-brand-blue/12",
  },
  follow: {
    Icon: UserIcon,
    color: "text-brand-purple",
    bg: "bg-brand-purple/18",
  },
  mention: { Icon: Hash, color: "text-warn", bg: "bg-warn/12" },
  community_event: {
    Icon: Calendar,
    color: "text-brand-purple",
    bg: "bg-brand-purple/18",
  },
  community_join: {
    Icon: Check,
    color: "text-success",
    bg: "bg-success/12",
  },
  system: {
    Icon: Sparkles,
    color: "text-[#C7B0FF]",
    bg: "bg-brand-purple/18",
  },
};

const FALLBACK_META = TYPE_META.system;

/* ── Time grouping helper ───────────────────────────────────── */

function getTimePeriod(iso: string): string {
  const now = new Date();
  const date = new Date(iso);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);

  if (date >= today) return "Today";
  if (date >= yesterday) return "Yesterday";
  if (date >= weekAgo) return "This week";
  return "Earlier";
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function groupNotifications(
  items: NotificationResponse[],
): { label: string; items: NotificationResponse[] }[] {
  const groups: Map<string, NotificationResponse[]> = new Map();
  for (const n of items) {
    const period = getTimePeriod(n.created_at);
    if (!groups.has(period)) groups.set(period, []);
    groups.get(period)!.push(n);
  }
  const order = ["Today", "Yesterday", "This week", "Earlier"];
  return order
    .filter((label) => groups.has(label))
    .map((label) => ({ label, items: groups.get(label)! }));
}

/* ── Page ───────────────────────────────────────────────────── */

export default function NotificationsPage() {
  const qc = useQueryClient();

  const {
    data: notificationsData,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => getNotifications(1, 50),
  });

  const notifications = notificationsData?.items ?? [];
  const unreadCount = notifications.filter((n) => !n.is_read).length;
  const grouped = groupNotifications(notifications);

  /* ── Mark single as read ───────────────────────────────── */
  const markReadMut = useMutation({
    mutationFn: (id: string) => markNotificationRead(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  /* ── Mark all as read ──────────────────────────────────── */
  const markAllMut = useMutation({
    mutationFn: () => markAllNotificationsRead(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  return (
    <AppShell
      topBar={{
        breadcrumb: "Activity",
        title: "Notifications",
        action: (
          <div className="flex gap-2">
            <Button
              variant="soft"
              size="sm"
              onClick={() => markAllMut.mutate()}
              disabled={markAllMut.isPending || unreadCount === 0}
            >
              {markAllMut.isPending ? "Marking..." : "Mark all read"}
            </Button>
          </div>
        ),
      }}
      rightRail={
        <WidgetCard title="Summary">
          <div className="flex flex-col gap-2 p-3.5">
            <div className="flex items-center justify-between text-[13px]">
              <span className="text-fg-3">Total</span>
              <b className="tabular-nums">
                {notificationsData?.total ?? 0}
              </b>
            </div>
            <div className="flex items-center justify-between text-[13px]">
              <span className="text-fg-3">Unread</span>
              <b className="tabular-nums text-brand-purple">{unreadCount}</b>
            </div>
          </div>
        </WidgetCard>
      }
    >
      <div className="mx-auto max-w-[760px] px-4 py-6 sm:px-8">
        {/* Loading */}
        {isLoading && (
          <Card padded={false}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="animate-pulse flex items-start gap-3.5 p-3.5"
                style={{
                  borderTop: i ? "1px solid var(--line-1)" : "none",
                }}
              >
                <div className="h-10 w-10 shrink-0 rounded-full bg-bg-3" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 w-2/3 rounded bg-bg-3" />
                  <div className="h-3 w-1/3 rounded bg-bg-3" />
                </div>
              </div>
            ))}
          </Card>
        )}

        {/* Error */}
        {isError && !isLoading && (
          <div className="flex flex-col items-center gap-3 rounded-md border border-danger/20 bg-danger/[0.06] px-6 py-8 text-center">
            <p className="text-[14px] font-medium text-fg-1">
              Could not load notifications
            </p>
            <p className="text-[13px] text-fg-3">
              Something went wrong. Please try again.
            </p>
            <Button
              variant="ghost"
              size="sm"
              icon={<RefreshCw className="h-3.5 w-3.5" />}
              onClick={() => refetch()}
            >
              Retry
            </Button>
          </div>
        )}

        {/* Empty */}
        {!isLoading && !isError && notifications.length === 0 && (
          <div className="flex flex-col items-center gap-3 rounded-md border border-line-2 bg-bg-2 px-6 py-12 text-center">
            <Bell className="h-10 w-10 text-fg-4" />
            <p className="text-[15px] font-medium">No notifications yet</p>
            <p className="text-[13px] text-fg-3">
              When someone likes, comments, or follows you, it will show up
              here.
            </p>
          </div>
        )}

        {/* Grouped list */}
        {!isLoading &&
          !isError &&
          grouped.map((group) => (
            <div key={group.label} className="mb-6 last:mb-0">
              <div className="px-1 pb-2.5 font-mono text-[11px] uppercase tracking-[0.08em] text-fg-3">
                {group.label}
              </div>
              <Card padded={false}>
                {group.items.map((n, i) => (
                  <NotificationItem
                    key={n.id}
                    notification={n}
                    index={i}
                    onMarkRead={() => {
                      if (!n.is_read) markReadMut.mutate(n.id);
                    }}
                  />
                ))}
              </Card>
            </div>
          ))}
      </div>
    </AppShell>
  );
}

/* ── Single notification row ────────────────────────────────── */

function NotificationItem({
  notification: n,
  index,
  onMarkRead,
}: {
  notification: NotificationResponse;
  index: number;
  onMarkRead: () => void;
}) {
  const meta = TYPE_META[n.type] ?? FALLBACK_META;
  const { Icon, color, bg, fill } = meta;
  const actorName = n.actor?.full_name ?? "UniVerse";

  return (
    <button
      type="button"
      onClick={onMarkRead}
      className={cn(
        "relative flex w-full items-start gap-3.5 p-3.5 text-left transition-colors hover:bg-bg-2",
        index && "border-t border-line-1",
        !n.is_read &&
          "bg-[linear-gradient(90deg,rgba(139,92,246,0.06),transparent_60%)]",
      )}
    >
      {/* Unread dot */}
      {!n.is_read && (
        <span
          className="absolute left-2 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-brand-purple"
          aria-hidden="true"
        />
      )}

      {/* Avatar + type badge */}
      <div className="relative shrink-0">
        <Avatar name={actorName} size={40} />
        <div
          className={cn(
            "absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full ring-2 ring-bg-2",
            bg,
            color,
          )}
        >
          <Icon
            className="h-2.5 w-2.5"
            fill={fill ? "currentColor" : "none"}
          />
        </div>
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <p className="text-[13.5px] leading-[1.4]">
          {n.actor && (
            <b className="font-semibold">{n.actor.full_name}</b>
          )}
          <span className="text-fg-2"> {n.content}</span>
        </p>
        <div className="mt-1.5 text-[11.5px] text-fg-4">
          {relativeTime(n.created_at)}
        </div>
      </div>
    </button>
  );
}
