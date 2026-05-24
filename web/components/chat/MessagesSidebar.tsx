import { Edit, Mail, Search } from "lucide-react";
import { Chip } from "@/components/ui/Chip";
import { ConversationRow } from "./ConversationRow";
import { CONVERSATIONS } from "@/lib/mock-data-extra";

interface MessagesSidebarProps {
  activeId?: string;
}

/**
 * Left sidebar of the messages surface — filters + conversation list.
 * Rendered by both `/messages` (with no active id) and `/messages/[id]`.
 */
export function MessagesSidebar({ activeId }: MessagesSidebarProps) {
  return (
    <aside className="scroll-hidden flex h-full flex-col overflow-y-auto border-r border-line-1">
      <div className="px-4 pb-3.5 pt-5">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-mono text-[11px] uppercase tracking-[0.06em] text-fg-3">
              Inbox · 9 active
            </div>
            <h2 className="mt-0.5 text-[22px] font-bold tracking-tighter">
              Messages
            </h2>
          </div>
          <button
            className="flex h-[38px] w-[38px] items-center justify-center rounded-[10px] bg-acc-gradient text-white shadow-acc"
            aria-label="New message"
          >
            <Edit className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-3.5 flex h-9 items-center gap-2 rounded-md border border-line-2 bg-bg-2 px-3 text-[13px] text-fg-3">
          <Search className="h-3.5 w-3.5" />
          <span>Search messages…</span>
        </div>
        <div className="mt-3 flex gap-1.5">
          {["All", "Unread", "DMs", "Groups"].map((t, i) => (
            <Chip key={t} active={i === 0}>
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
          <div className="text-[11px] text-fg-3">3 verified students</div>
        </div>
      </div>

      <div className="flex-1">
        {CONVERSATIONS.map((c) => (
          <ConversationRow
            key={c.id}
            conversation={c}
            active={c.id === activeId}
          />
        ))}
      </div>
    </aside>
  );
}
