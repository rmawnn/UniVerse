import { Avatar } from "./Avatar";
import { cn } from "@/lib/utils";

interface AvatarStackProps {
  names: string[];
  size?: number;
  className?: string;
}

/** Overlapping avatars with consistent overlap regardless of size. */
export function AvatarStack({ names, size = 22, className }: AvatarStackProps) {
  return (
    <span className={cn("inline-flex", className)}>
      {names.map((n, i) => (
        <span
          key={n + i}
          className="rounded-full ring-2 ring-bg-2"
          style={{
            marginLeft: i ? -size * 0.4 : 0,
            zIndex: names.length - i,
          }}
        >
          <Avatar name={n} size={size} />
        </span>
      ))}
    </span>
  );
}
