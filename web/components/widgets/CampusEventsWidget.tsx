import { Calendar } from "lucide-react";
import { WidgetCard } from "./WidgetCard";

export function CampusEventsWidget() {
  return (
    <WidgetCard
      title="Campus events"
      action={<span className="text-[11px] font-medium text-fg-3">Coming soon</span>}
    >
      <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-bg-3">
          <Calendar className="h-5 w-5 text-fg-3" />
        </div>
        <p className="text-[13px] font-medium text-fg-2">
          Events are coming soon
        </p>
        <p className="text-[11.5px] leading-relaxed text-fg-3">
          University events, study sessions, and campus happenings will appear
          here.
        </p>
      </div>
    </WidgetCard>
  );
}
