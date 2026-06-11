import type { ReactNode } from "react";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";

interface WidgetCardProps {
  title: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}

/** Section header + bordered card for a sidebar widget. */
export function WidgetCard({
  title,
  action,
  children,
  className,
}: WidgetCardProps) {
  return (
    <section className={cn("mb-4", className)}>
      <header className="flex items-baseline justify-between px-1 pb-2.5">
        <h3 className="text-[13px] font-semibold tracking-tightish">{title}</h3>
        {action ?? (
          <button className="text-[12px] font-medium text-brand-blue hover:underline">
            See all
          </button>
        )}
      </header>
      <Card padded={false} className="overflow-hidden p-1">
        {children}
      </Card>
    </section>
  );
}
