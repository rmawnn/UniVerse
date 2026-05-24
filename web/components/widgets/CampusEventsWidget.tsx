import { WidgetCard } from "./WidgetCard";
import { CAMPUS_EVENTS } from "@/lib/mock-data";

export function CampusEventsWidget() {
  return (
    <WidgetCard title="Campus events">
      {CAMPUS_EVENTS.map((e) => (
        <div
          key={e.id}
          className="flex items-center gap-3 px-3 py-2.5 [&:not(:first-child)]:border-t [&:not(:first-child)]:border-line-1"
        >
          <div className="flex w-10 shrink-0 flex-col items-center rounded-md bg-bg-3 py-1">
            <span className="text-[9.5px] font-bold tracking-[0.06em] text-brand-purple">
              {e.day}
            </span>
            <span className="text-base font-bold">{e.date}</span>
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[13px] font-semibold">{e.title}</div>
            <div className="mt-0.5 text-[11px] text-fg-3">
              {e.when} · {e.where}
            </div>
          </div>
        </div>
      ))}
    </WidgetCard>
  );
}
