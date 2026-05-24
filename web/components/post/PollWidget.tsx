import type { Poll } from "@/lib/types";
import { cn, compactNumber } from "@/lib/utils";

interface PollWidgetProps {
  poll: Poll;
  className?: string;
}

/** Bar-chart-style poll readout used in feed cards. */
export function PollWidget({ poll, className }: PollWidgetProps) {
  return (
    <div className={cn("mt-3.5 flex max-w-[460px] flex-col gap-2", className)}>
      {poll.options.map((o, i) => (
        <div
          key={o.label}
          className="relative h-10 overflow-hidden rounded-sm border border-line-1 bg-bg-3"
        >
          <div
            className="absolute inset-y-0 left-0"
            style={{
              width: `${o.pct}%`,
              background:
                i === 0
                  ? "var(--acc-gradient-soft)"
                  : "rgba(255,255,255,0.04)",
            }}
          />
          <div className="relative flex h-full items-center justify-between px-3.5 text-[13px]">
            <span
              className={cn(
                i === 0 ? "font-semibold text-fg-1" : "font-medium text-fg-2",
              )}
            >
              {o.label}
            </span>
            <span className="font-semibold tabular-nums text-fg-2">
              {o.pct}%
            </span>
          </div>
        </div>
      ))}
      <div className="text-[11.5px] text-fg-3">
        {compactNumber(poll.voters)} votes · 4h left
      </div>
    </div>
  );
}
