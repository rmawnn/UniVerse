import { cn } from "@/lib/utils";

interface PlaceholderImageProps {
  label: string;
  height?: number;
  className?: string;
  accent?: string;
}

/**
 * Striped slot that holds the place of real imagery during design
 * iteration — never used in shipped pages once media is wired up.
 */
export function PlaceholderImage({
  label,
  height = 200,
  className,
  accent,
}: PlaceholderImageProps) {
  return (
    <div
      className={cn(
        "relative w-full overflow-hidden rounded-md border border-line-1",
        "flex items-center justify-center",
        "font-mono text-[11px] uppercase tracking-[0.05em] text-fg-3",
        className,
      )}
      style={{
        height,
        background:
          accent ??
          "repeating-linear-gradient(135deg, #1A1A26 0 8px, #1F1F2C 8px 16px)",
      }}
      aria-label={label}
    >
      [ {label} ]
    </div>
  );
}
