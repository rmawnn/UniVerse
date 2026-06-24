"use client";

import { useState } from "react";
import { Calendar, ImageIcon, MapPin, Smile, Sticker } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useCompose } from "@/components/post/ComposeProvider";
import { useAuthStore } from "@/lib/stores/auth-store";
import { cn } from "@/lib/utils";

const COMPOSER_TOOLS = [
  { key: "photo", icon: ImageIcon, label: "Photo" },
  { key: "gif", icon: Sticker, label: "GIF" },
  { key: "poll", icon: Smile, label: "Poll" },
  { key: "event", icon: Calendar, label: "Event" },
  { key: "place", icon: MapPin, label: "Place" },
] as const;

const MAX_LEN = 300;

interface ComposerInlineProps {
  /** Defaults to the home feed prompt — communities override this. */
  placeholder?: string;
  /** Which community this composer drops into. */
  communitySlug?: string;
}

/**
 * The "share something..." card at the top of the feed. Expands to a
 * textarea + toolbar on focus; the full modal (`ComposeModal`) takes
 * over for media-heavy flows.
 */
export function ComposerInline({
  placeholder = "Share something with your campus...",
  communitySlug,
}: ComposerInlineProps) {
  const [expanded, setExpanded] = useState(false);
  const [value, setValue] = useState("");
  const { open } = useCompose();
  const user = useAuthStore((s) => s.user);

  const remaining = MAX_LEN - value.length;
  const overBudget = remaining < 0;
  const displayName = user?.full_name ?? "User";

  return (
    <Card padded className="mb-3.5">
      <div className="flex gap-3">
        <Avatar name={displayName} src={user?.profile_image_url} size={40} />
        <div className="min-w-0 flex-1">
          {!expanded ? (
            <button
              type="button"
              onClick={() => open(communitySlug)}
              className="flex h-[46px] w-full items-center rounded-md border border-line-1 bg-bg-3 px-4 text-left text-[14.5px] text-fg-3 hover:bg-bg-4"
            >
              {placeholder}
            </button>
          ) : (
            <textarea
              autoFocus
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={placeholder}
              rows={3}
              className="w-full resize-none bg-transparent py-2 text-[15.5px] leading-[1.5] text-fg-1 placeholder:text-fg-3 focus:outline-none"
            />
          )}
        </div>
      </div>

      <div className="mt-3 flex items-center gap-1 pl-[52px]">
        {COMPOSER_TOOLS.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => open(communitySlug)}
              className="flex h-8 items-center gap-1.5 rounded-md px-2.5 text-[12.5px] font-medium text-fg-2 hover:bg-bg-3 hover:text-fg-1"
            >
              <Icon className="h-4 w-4 text-brand-purple" />
              <span className="hidden sm:inline">{t.label}</span>
            </button>
          );
        })}
        <div className="flex-1" />
        {expanded && (
          <span
            className={cn(
              "mr-2 font-mono text-[11px] tabular-nums",
              overBudget ? "text-danger" : "text-fg-3",
            )}
          >
            {value.length}/{MAX_LEN}
          </span>
        )}
        <Button
          size="sm"
          variant="primary"
          onClick={() => open(communitySlug)}
          aria-label={communitySlug ? `Post to #${communitySlug}` : "Post"}
        >
          Post
        </Button>
      </div>
    </Card>
  );
}
