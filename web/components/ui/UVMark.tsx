import { cn } from "@/lib/utils";

interface UVMarkProps {
  size?: number;
  className?: string;
}

/**
 * UniVerse logomark — orbiting ring + center dot, rendered on the brand
 * gradient. Pure SVG, sizes via the `size` prop.
 */
export function UVMark({ size = 32, className }: UVMarkProps) {
  return (
    <span
      className={cn("inline-flex items-center justify-center", className)}
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.28,
        background: "var(--acc-gradient)",
        boxShadow:
          "0 12px 36px rgba(124,82,255,0.45), inset 0 1px 1px rgba(255,255,255,0.25)",
      }}
    >
      <svg
        width={size * 0.58}
        height={size * 0.58}
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="9" stroke="#fff" strokeWidth="2.2" />
        <circle cx="12" cy="12" r="2.4" fill="#fff" />
        <ellipse
          cx="12"
          cy="12"
          rx="9"
          ry="3.5"
          stroke="#fff"
          strokeWidth="1.6"
          transform="rotate(-22 12 12)"
        />
      </svg>
    </span>
  );
}
