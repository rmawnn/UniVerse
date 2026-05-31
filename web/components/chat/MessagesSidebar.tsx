"use client";

import { useState, useMemo } from "react";
import { Edit, Mail, MessageCircle, Search } from "lucide-react";
import { Chip } from "@/components/ui/Chip";
import { ConversationRow } from "./ConversationRow";
import { NewConversationModal } from "./NewConversationModal";
import type { ConversationResponse } from "@/lib/api/conversations";

interface MessagesSidebarProps {
  conversations: ConversationResponse[];
  activeId?: string;
  currentUserId?: string;
}

type ChatFilter = "All" | "Unread" | "DMs" | "Groups";
const FILTERS: ChatFilter[] = ["All", "Unread", "DMs", "Groups"];

/**
 * Left sidebar of the messages surface — search + filters + conversation list.
 * Rendered by both `/messages` (with no active id) and `/messages/[id]`.
 */
export function MessagesSidebar({
  conversations,
  activeId,
  currentUserId,
}: MessagesSidebarProps) {
  const [newMsgOpen, setNewMsgOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<ChatFilter>("All");

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

    // Apply search filter
    const q = search.trim().toLowerCase();
    if (q.length >= 1) {
      list = list.filter((c) => {
        // Match participant full_name or username
        const participantMatch = c.participants.some(
          (p) =>
            p.id !== currentUserId &&
            (p.full_name.toLowerCase().includes(q) ||
              p.username.toLowerCase().includes(q)),
        );
        // Match last message content
        const messageMatch = c.last_message?.content
          ?.toLowerCase()
          .includes(q);
        return participantMatch || messageMatch;
      });
    }

    return list;
  }, [conversations, activeFilter, search, currentUserId]);

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
          <div className="mt-3.5 flex h-9 items-center gap-2 rounded-md border border-line-2 bg-bg-2 px-3 text-[13px]">
            <Search className="h-3.5 w-3.5 text-fg-3" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search messages…"
              className="h-full flex-1 bg-transparent text-fg-1 placeholder:text-fg-3 focus:outline-none"
            />
          </div>
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

        <div className="flex-1">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
              <MessageCircle className="h-6 w-6 text-fg-4" />
              <p className="text-[13px] text-fg-3">
                {search.trim()
                  ? "No conversations match your search"
                  : activeFilter !== "All"
                    ? `No ${activeFilter.toLowerCase()} conversations`
                    : "No conversations yet"}
              </p>
            </div>
          ) : (
            filtered.map((c) => (
              <ConversationRow
                key={c.id}
                conversation={c}
                active={c.id === activeId}
                currentUserId={currentUserId}
              />
            ))
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
