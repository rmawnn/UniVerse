import { cn, compactNumber } from "@/lib/utils";

interface ProfileStatProps {
  label: string;
  value: number | string;
  highlight?: string;
  accent?: boolean;
}

/** Single stat tile in the profile header. */
export function ProfileStat({ label, value, highlight, accent }: ProfileStatProps) {
  const display = typeof value === "number" ? compactNumber(value) : value;
  return (
    <div
      className={cn(
        "rounded-md border border-line-1 px-4 py-3.5",
        accent ? "bg-acc-gradient-soft" : "bg-bg-2",
      )}
    >
      <div className="font-mono text-[11px] font-medium uppercase tracking-[0.05em] text-fg-3">
        {label}
      </div>
      <div className="mt-1.5 text-[22px] font-bold tracking-tighter tabular-nums">
        {display}
      </div>
      {highlight && (
        <div className="mt-0.5 text-[11px] text-success">{highlight}</div>
      )}
    </div>
  );
}
