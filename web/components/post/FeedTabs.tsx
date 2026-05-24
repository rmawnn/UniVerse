"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

const TABS = [
  { key: "for-you", label: "For you" },
  { key: "following", label: "Following" },
  { key: "campus", label: "My campus" },
  { key: "saved", label: "Saved" },
] as const;

export type FeedTabKey = (typeof TABS)[number]["key"];

interface FeedTabsProps {
  defaultTab?: FeedTabKey;
  onChange?: (tab: FeedTabKey) => void;
}

/** Underline tabs at the top of the feed. */
export function FeedTabs({ defaultTab = "for-you", onChange }: FeedTabsProps) {
  const [active, setActive] = useState<FeedTabKey>(defaultTab);

  return (
    <div className="mb-4 flex gap-6 border-b border-line-1" role="tablist">
      {TABS.map((t) => {
        const isActive = active === t.key;
        return (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => {
              setActive(t.key);
              onChange?.(t.key);
            }}
            className={cn(
              "relative -mb-px py-2.5 pb-3.5 text-[14px] font-medium transition-colors",
              isActive ? "font-semibold text-fg-1" : "text-fg-3 hover:text-fg-2",
            )}
          >
            {t.label}
            {isActive && (
              <span
                className="absolute inset-x-0 -bottom-px h-[2.5px] rounded bg-acc-gradient"
                aria-hidden="true"
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
