"use client";

import { Bell, ChevronDown, MessageCircle, Search } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { CURRENT_USER } from "@/lib/mock-data";

interface TopBarProps {
  breadcrumb?: string;
  title?: string;
  action?: React.ReactNode;
}

/**
 * Sticky top bar that lives inside the main column. Houses the global
 * search trigger, notif/messages quick-access, and the user menu.
 */
export function TopBar({ breadcrumb, title, action }: TopBarProps) {
  return (
    <div
      className="sticky top-0 z-[5] flex h-16 items-center gap-4 border-b border-line-1 px-7"
      style={{
        background: "rgba(14,14,24,0.72)",
        backdropFilter: "blur(20px) saturate(180%)",
        WebkitBackdropFilter: "blur(20px) saturate(180%)",
      }}
    >
      {/* Search trigger — opens ⌘K command bar on click */}
      <button
        className="flex h-10 w-full max-w-[380px] items-center gap-2.5 rounded-xl border border-line-2 bg-bg-2 px-3.5 text-[14px] text-fg-3 hover:bg-bg-3"
        aria-label="Open search"
        type="button"
      >
        <Search className="h-4 w-4" />
        <span className="flex-1 text-left">Search students, communities, posts…</span>
        <span className="rounded-[5px] border border-line-2 px-1.5 py-0.5 font-mono text-[11px] text-fg-4">
          ⌘K
        </span>
      </button>

      {/* Page title slot */}
      <div className="hidden min-w-0 flex-1 lg:block">
        {breadcrumb && (
          <div className="font-mono text-[11px] uppercase tracking-[0.04em] text-fg-3">
            {breadcrumb}
          </div>
        )}
        {title && (
          <div className="truncate text-[16px] font-semibold tracking-tightish">
            {title}
          </div>
        )}
      </div>

      {/* Right cluster */}
      <div className="ml-auto flex items-center gap-2.5">
        {action}
        <button
          className="relative flex h-[38px] w-[38px] items-center justify-center rounded-[10px] border border-line-1 bg-bg-2 text-fg-2 hover:text-fg-1"
          aria-label="Notifications"
        >
          <Bell className="h-4.5 w-4.5" />
          <span className="absolute right-[7px] top-[6px] h-[7px] w-[7px] rounded-full bg-danger shadow-[0_0_0_2px_var(--bg-2)]" />
        </button>
        <button
          className="hidden h-[38px] w-[38px] items-center justify-center rounded-[10px] border border-line-1 bg-bg-2 text-fg-2 hover:text-fg-1 md:flex"
          aria-label="Messages"
        >
          <MessageCircle className="h-4.5 w-4.5" />
        </button>
        <div className="hidden h-6 w-px bg-line-2 md:block" />
        <button
          className="flex items-center gap-2 rounded-full border border-line-1 bg-bg-2 py-1 pl-1 pr-2.5 hover:bg-bg-3"
          aria-label="Account menu"
        >
          <Avatar name={CURRENT_USER.name} size={30} />
          <ChevronDown className="h-3.5 w-3.5 text-fg-3" />
        </button>
      </div>
    </div>
  );
}
