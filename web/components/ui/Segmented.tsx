"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

interface SegmentedProps {
  options: readonly string[];
  defaultValue?: string;
  onChange?: (value: string) => void;
  className?: string;
}

/** Inline 3-way segmented toggle. */
export function Segmented({
  options,
  defaultValue,
  onChange,
  className,
}: SegmentedProps) {
  const [value, setValue] = useState(defaultValue ?? options[0]);
  return (
    <div
      role="tablist"
      className={cn(
        "inline-flex rounded-[9px] border border-line-1 bg-bg-3 p-[3px]",
        className,
      )}
    >
      {options.map((o) => {
        const isActive = o === value;
        return (
          <button
            key={o}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => {
              setValue(o);
              onChange?.(o);
            }}
            className={cn(
              "rounded-[6px] px-3 py-1 text-[12px] font-medium transition-colors",
              isActive
                ? "bg-bg-1 font-semibold text-fg-1 shadow-[0_1px_2px_rgba(0,0,0,0.4)]"
                : "text-fg-3 hover:text-fg-1",
            )}
          >
            {o}
          </button>
        );
      })}
    </div>
  );
}
