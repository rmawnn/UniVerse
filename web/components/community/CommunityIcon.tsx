import { cn } from "@/lib/utils";

interface CommunityIconProps {
  community: {
    emoji?: string;
    hue?: [string, string];
    name?: string;
  };
  size?: number;
  className?: string;
}

/** Deterministic gradient from a community name string. */
function nameToGradient(name: string): [string, string] {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h = Math.abs(hash) % 360;
  return [`hsl(${h}, 55%, 45%)`, `hsl(${(h + 40) % 360}, 55%, 35%)`];
}

/**
 * Gradient tile used everywhere we show a community.
 *
 * When `emoji` + `hue` are present (mock data / rich community), renders the
 * emoji on a gradient background.
 *
 * When only `name` is available (real API data), renders the first letter on a
 * deterministically generated gradient.
 */
export function CommunityIcon({
  community,
  size = 32,
  className,
}: CommunityIconProps) {
  const hasRichData = community.emoji && community.hue;
  const [from, to] = hasRichData
    ? community.hue!
    : nameToGradient(community.name ?? "C");
  const label = hasRichData
    ? community.emoji!
    : (community.name ?? "C").charAt(0).toUpperCase();

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center",
        !hasRichData && "font-semibold text-white",
        className,
      )}
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.28,
        background: `linear-gradient(135deg, ${from}, ${to})`,
        fontSize: size * (hasRichData ? 0.42 : 0.38),
        lineHeight: 1,
        boxShadow:
          "inset 0 1px 1px rgba(255,255,255,0.25), inset 0 -2px 6px rgba(0,0,0,0.18)",
      }}
    >
      {label}
    </span>
  );
}
