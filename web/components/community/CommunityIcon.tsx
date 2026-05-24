import { cn } from "@/lib/utils";
import type { Community } from "@/lib/types";

interface CommunityIconProps {
  community: Pick<Community, "emoji" | "hue">;
  size?: number;
  className?: string;
}

/** Gradient + emoji tile used everywhere we show a community. */
export function CommunityIcon({
  community,
  size = 32,
  className,
}: CommunityIconProps) {
  const [from, to] = community.hue;
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center",
        className,
      )}
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.28,
        background: `linear-gradient(135deg, ${from}, ${to})`,
        fontSize: size * 0.42,
        lineHeight: 1,
        boxShadow:
          "inset 0 1px 1px rgba(255,255,255,0.25), inset 0 -2px 6px rgba(0,0,0,0.18)",
      }}
    >
      {community.emoji}
    </span>
  );
}
