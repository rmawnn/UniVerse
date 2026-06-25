"use client";

import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { Edit, Mail, MessageCircle, Search, X } from "lucide-react";
import dynamic from "next/dynamic";
import { Chip } from "@/components/ui/Chip";
import { ConversationRow } from "./ConversationRow";

const NewConversationModal = dynamic(() => import("./NewConversationModal").then(m => m.NewConversationModal), { ssr: false });
import { useDebouncedValue } from "@/lib/hooks/useDebouncedValue";
import type { ConversationResponse } from "@/lib/api/conversations";

interface MessagesSidebarProps {
  conversations: ConversationResponse[];
  activeId?: string;
  currentUserId?: string;
  onlineUsers?: Record<string, boolean>;
}

type ChatFilter = "All" | "Unread" | "DMs" | "Groups";
const FILTERS: ChatFilter[] = ["All", "Unread", "DMs", "Groups"];

/** Normalize a string for search: lowercase + collapse whitespace */
function normalize(s: string): string {
  return s.toLowerCase().replace(/\s+/g, " ").trim();
}

/**
 * Left sidebar of the messages surface — search + filters + conversation list.
 * Rendered by both `/messages` (with no active id) and `/messages/[id]`.
 */
export function MessagesSidebar({
  conversations,
  activeId,
  currentUserId,
  onlineUsers = {},
}: MessagesSidebarProps) {
  const [newMsgOpen, setNewMsgOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<ChatFilter>("All");
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounce the raw search input — 300 ms delay
  const debouncedSearch = useDebouncedValue(search, 300);

  const clearSearch = useCallback(() => {
    setSearch("");
    inputRef.current?.focus();
  }, []);

  /* ── Filter + search conversations ─────────────────────── */

  const filtered = useMemo(() => {
    let list = conversations;

    // Apply category filter
    if (activeFilter === "Unread") {
      list = list.filter((c) => c.unread_count > 0);
    } else if (activeFilter === "DMs") {
      list = list.filter((c) => c.participants.length <= 2);
    } else if (activeFilter === "Groups") {
      list = list.filter((c) => c.participants.length > 2);
    }

    // Apply search filter using the debounced value
    const q = normalize(debouncedSearch);
    if (q.length >= 1) {
      list = list.filter((c) => {
        // 1. Match participant display name (partial, case-insensitive)
        const nameMatch = c.participants.some(
          (p) =>
            p.id !== currentUserId &&
            normalize(p.full_name).includes(q),
        );

        // 2. Match participant username (partial, case-insensitive)
        //    Also match with or without the @ prefix
        const usernameQuery = q.startsWith("@") ? q.slice(1) : q;
        const usernameMatch = c.participants.some(
          (p) =>
            p.id !== currentUserId &&
            normalize(p.username).includes(usernameQuery),
        );

        // 3. Match last message content (partial, case-insensitive)
        const messageMatch =
          c.last_message?.content != null &&
          normalize(c.last_message.content).includes(q);

        return nameMatch || usernameMatch || messageMatch;
      });
    }

    // Sort by most recent activity — newest first
    return [...list].sort((a, b) => {
      const aTime =
        a.last_message?.created_at ?? a.updated_at ?? a.created_at;
      const bTime =
        b.last_message?.created_at ?? b.updated_at ?? b.created_at;
      return new Date(bTime).getTime() - new Date(aTime).getTime();
    });
  }, [conversations, activeFilter, debouncedSearch, currentUserId]);

  // Reset filter when search is active to show results across all categories
  useEffect(() => {
    if (debouncedSearch.trim().length >= 1 && activeFilter !== "All") {
      setActiveFilter("All");
    }
  }, [debouncedSearch, activeFilter]);

  /* ── Determine the empty state message ─────────────────── */
  const isSearching = debouncedSearch.trim().length >= 1;

  const emptyMessage = isSearching
    ? `No conversations match "${debouncedSearch.trim()}"`
    : activeFilter !== "All"
      ? `No ${activeFilter.toLowerCase()} conversations`
      : "No conversations yet";

  const emptySubtext = isSearching
    ? "Try searching by name, username, or message content"
    : activeFilter === "All"
      ? "Start a new conversation to get chatting"
      : undefined;

  return (
    <>
      <aside className="scroll-hidden flex h-full flex-col overflow-y-auto border-r border-line-1">
        <div className="px-4 pb-3.5 pt-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-mono text-[11px] uppercase tracking-[0.06em] text-fg-3">
                Inbox · {conversations.length} active
              </div>
              <h2 className="mt-0.5 text-[22px] font-bold tracking-tighter">
                Messages
              </h2>
            </div>
            <button
              className="flex h-[38px] w-[38px] items-center justify-center rounded-[10px] bg-acc-gradient text-white shadow-acc"
              aria-label="New message"
              onClick={() => setNewMsgOpen(true)}
            >
              <Edit className="h-4 w-4" />
            </button>
          </div>

          {/* ── Search input ─────────────────────────────── */}
          <div className="relative mt-3.5 flex h-9 items-center gap-2 rounded-md border border-line-2 bg-bg-2 px-3 text-[13px] focus-within:border-brand-purple/50 focus-within:ring-1 focus-within:ring-brand-purple/20">
            <Search className="h-3.5 w-3.5 shrink-0 text-fg-3" />
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, username, or message…"
              className="h-full flex-1 bg-transparent text-fg-1 placeholder:text-fg-3 focus:outline-none"
              aria-label="Search conversations"
            />
            {search.length > 0 && (
              <button
                type="button"
                onClick={clearSearch}
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-fg-3 transition-colors hover:bg-bg-3 hover:text-fg-1"
                aria-label="Clear search"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          {/* ── Category filters ─────────────────────────── */}
          <div className="mt-3 flex gap-1.5">
            {FILTERS.map((t) => (
              <Chip
                key={t}
                active={activeFilter === t}
                onClick={() => setActiveFilter(t)}
              >
                {t}
              </Chip>
            ))}
          </div>
        </div>

        {/* ── Message requests ─────────────────────────────── */}
        <div className="flex items-center gap-2.5 border-y border-line-1 px-4 py-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-purple/15 text-brand-purple">
            <Mail className="h-4 w-4" />
          </div>
          <div className="flex-1">
            <div className="text-[13px] font-semibold">Message requests</div>
            <div className="text-[11px] text-fg-3">
              {conversations.filter((c) => c.unread_count > 0).length > 0
                ? `${conversations.filter((c) => c.unread_count > 0).length} unread`
                : "No new requests"}
            </div>
          </div>
        </div>

        {/* ── Conversation list / empty state ──────────────── */}
        <div className="flex-1">
          {/* Search result count */}
          {isSearching && filtered.length > 0 && (
            <div className="border-b border-line-1 px-4 py-2 text-[11px] font-medium text-fg-3">
              {filtered.length} result{filtered.length !== 1 ? "s" : ""} for
              &ldquo;{debouncedSearch.trim()}&rdquo;
            </div>
          )}

          {filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
              {isSearching ? (
                <Search className="h-6 w-6 text-fg-4" />
              ) : (
                <MessageCircle className="h-6 w-6 text-fg-4" />
              )}
              <p className="text-[13px] text-fg-3">{emptyMessage}</p>
              {emptySubtext && (
                <p className="text-[11.5px] text-fg-4">{emptySubtext}</p>
              )}
            </div>
          ) : (
            filtered.map((c) => {
              const other = c.participants.find(
                (p) => p.id !== currentUserId,
              );
              const isOnline = other ? !!onlineUsers[other.id] : false;
              return (
                <ConversationRow
                  key={c.id}
                  conversation={c}
                  active={c.id === activeId}
                  currentUserId={currentUserId}
                  online={isOnline}
                  searchQuery={debouncedSearch.trim()}
                />
              );
            })
          )}
        </div>
      </aside>

      <NewConversationModal
        open={newMsgOpen}
        onClose={() => setNewMsgOpen(false)}
      />
    </>
  );
}
