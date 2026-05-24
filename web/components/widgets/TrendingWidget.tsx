import { Flame } from "lucide-react";
import { WidgetCard } from "./WidgetCard";
import { TRENDING } from "@/lib/mock-data";
import { compactNumber } from "@/lib/utils";

export function TrendingWidget() {
  return (
    <WidgetCard title="Trending on campus">
      {TRENDING.map((t, i) => (
        <div
          key={t.tag}
          className="flex items-center gap-2.5 rounded-md px-3 py-2.5 hover:bg-bg-3 [&:not(:first-child)]:border-t [&:not(:first-child)]:border-line-1"
        >
          <span className="w-5 font-mono text-[12px] text-fg-3">
            {String(i + 1).padStart(2, "0")}
          </span>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[13.5px] font-semibold">{t.tag}</div>
            <div className="mt-0.5 text-[11px] text-fg-3">
              {compactNumber(t.posts)} posts
            </div>
          </div>
          {t.hot && <Flame className="h-3.5 w-3.5 text-warn" />}
        </div>
      ))}
    </WidgetCard>
  );
}
