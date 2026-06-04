"use client";

import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar";
import type { ConversationResponse } from "@/lib/api/conversations";
import { cn, formatRelativeTime } from "@/lib/utils";

interface ConversationRowProps {
  conversation: ConversationResponse;
  active?: boolean;
  currentUserId?: string;
  online?: boolean;
}

/** Single row in the chat list sidebar. */
export function ConversationRow({
  conversation: c,
  active,
  currentUserId,
  online,
}: ConversationRowProps) {
  // Resolve the "other" participant (not the current user)
  const other =
    c.participants.find((p) => p.id !== currentUserId) ?? c.participants[0];
  const displayName = other?.full_name ?? "Unknown";
  const lastText = c.last_message?.content ?? "No messages yet";
  const timeStr = c.last_message
    ? formatRelativeTime(c.last_message.created_at)
    : "";

  return (
    <Link
      href={`/messages/${c.id}`}
      className={cn(
        "relative flex items-center gap-3 border-b border-line-1 px-4 py-3 transition-colors",
        active
          ? "border-l-[2px] border-l-brand-purple bg-[linear-gradient(90deg,rgba(139,92,246,0.10),transparent_60%)]"
          : "border-l-[2px] border-l-transparent hover:bg-bg-2",
      )}
    >
      <div className="relative">
        <Avatar name={displayName} size={42} />
        {online && (
          <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-bg-1 bg-success" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span
            className={cn(
              "truncate text-[13.5px]",
              c.unread_count > 0 ? "font-semibold" : "font-medium",
            )}
          >
            {displayName}
          </span>
        </div>
        <div
          className={cn(
            "mt-1 max-w-[220px] truncate text-[12px]",
            c.unread_count > 0 ? "text-fg-1" : "text-fg-3",
          )}
        >
          {lastText}
        </div>
      </div>
      <div className="flex flex-col items-end gap-1">
        <span
          className={cn(
            "text-[11px]",
            c.unread_count > 0 ? "font-semibold text-brand-purple" : "text-fg-3",
          )}
        >
          {timeStr}
        </span>
        {c.unread_count > 0 && (
          <span className="flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-acc-gradient px-1.5 text-[10.5px] font-bold text-white">
            {c.unread_count}
          </span>
        )}
      </div>
    </Link>
  );
}
