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
  /** When set, matching text is highlighted in name and last message. */
  searchQuery?: string;
}

/**
 * Highlight substrings that match `query` (case-insensitive).
 * Returns the original string with <mark> wrappers around matches.
 */
function highlightMatch(text: string, query: string) {
  if (!query || query.length === 0) return text;

  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;

  const before = text.slice(0, idx);
  const match = text.slice(idx, idx + query.length);
  const after = text.slice(idx + query.length);

  return (
    <>
      {before}
      <mark className="rounded-sm bg-brand-purple/20 text-inherit">{match}</mark>
      {after}
    </>
  );
}

/** Single row in the chat list sidebar. */
export function ConversationRow({
  conversation: c,
  active,
  currentUserId,
  online,
  searchQuery = "",
}: ConversationRowProps) {
  // Resolve the "other" participant (not the current user)
  const other =
    c.participants.find((p) => p.id !== currentUserId) ?? c.participants[0];
  const displayName = other?.full_name ?? "Unknown";
  const username = other?.username;
  const lastText = c.last_message?.content ?? "No messages yet";
  const timeStr = c.last_message
    ? formatRelativeTime(c.last_message.created_at)
    : "";

  // Determine what matched for highlighting
  const q = searchQuery.toLowerCase();
  const nameMatched = q.length > 0 && displayName.toLowerCase().includes(q);
  const usernameQ = q.startsWith("@") ? q.slice(1) : q;
  const usernameMatched =
    q.length > 0 && username != null && username.toLowerCase().includes(usernameQ);
  const messageMatched =
    q.length > 0 &&
    c.last_message?.content != null &&
    c.last_message.content.toLowerCase().includes(q);

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
            {nameMatched ? highlightMatch(displayName, searchQuery) : displayName}
          </span>
        </div>
        {/* Show matched username below name when searching by username */}
        {usernameMatched && !nameMatched && username && (
          <div className="mt-0.5 truncate text-[11px] text-fg-3">
            @{highlightMatch(username, usernameQ)}
          </div>
        )}
        <div
          className={cn(
            "mt-1 max-w-[220px] truncate text-[12px]",
            c.unread_count > 0 ? "text-fg-1" : "text-fg-3",
          )}
        >
          {messageMatched
            ? highlightMatch(lastText, searchQuery)
            : lastText}
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
