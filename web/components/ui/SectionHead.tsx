import { cn } from "@/lib/utils";

interface SectionHeadProps {
  title: string;
  sub?: string;
  action?: React.ReactNode;
  className?: string;
}

/** Reusable in-page section header. */
export function SectionHead({ title, sub, action, className }: SectionHeadProps) {
  return (
    <header
      className={cn(
        "flex items-baseline justify-between pb-3.5 pt-1",
        className,
      )}
    >
      <div>
        <h2 className="text-[16px] font-bold tracking-tighter">{title}</h2>
        {sub && <p className="mt-0.5 text-[12px] text-fg-3">{sub}</p>}
      </div>
      {action ?? (
        <button className="text-[12.5px] font-medium text-brand-blue hover:underline">
          See all →
        </button>
      )}
    </header>
  );
}
