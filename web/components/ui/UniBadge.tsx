import { ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

interface UniBadgeProps {
  university: string;
  compact?: boolean;
  className?: string;
}

/** Verified-university chip. Compact variant for inline use. */
export function UniBadge({ university, compact, className }: UniBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border font-semibold leading-none",
        "border-brand-blue/22 bg-brand-blue/10 text-brand-blue",
        compact ? "px-1.5 py-[2px] text-[11px]" : "px-2 py-[3px] text-xs",
        className,
      )}
    >
      <ShieldCheck className="h-[11px] w-[11px]" />
      {university}
    </span>
  );
}
