"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

interface ChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
  icon?: ReactNode;
}

/** Pill toggle / filter chip. */
export function Chip({
  active,
  icon,
  className,
  children,
  ...rest
}: ChipProps) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-[7px]",
        "text-[13px] font-medium whitespace-nowrap transition-colors",
        active
          ? "bg-fg-1 text-bg-1"
          : "border border-line-1 bg-bg-3 text-fg-2 hover:bg-bg-4",
        className,
      )}
      {...rest}
    >
      {icon}
      {children}
    </button>
  );
}
