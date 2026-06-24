import Image from "next/image";
import { cn, avatarTheme } from "@/lib/utils";

interface AvatarProps {
  name: string;
  src?: string | null;
  size?: number;
  online?: boolean;
  ring?: boolean;
  className?: string;
}

export function Avatar({
  name,
  src,
  size = 40,
  online,
  ring,
  className,
}: AvatarProps) {
  const { initials, from, to } = avatarTheme(name);
  const dot = Math.max(8, Math.round(size * 0.28));

  return (
    <span
      className={cn("relative inline-flex shrink-0", className)}
      style={{ width: size, height: size }}
    >
      {src ? (
        <Image
          src={src}
          alt={name}
          width={size}
          height={size}
          className={cn(
            "h-full w-full rounded-full object-cover",
            ring && "ring-2 ring-bg-1 ring-offset-0",
          )}
        />
      ) : (
        <span
          className={cn(
            "flex h-full w-full select-none items-center justify-center rounded-full text-white",
            "font-semibold",
            ring && "ring-2 ring-bg-1 ring-offset-0",
          )}
          style={{
            background: `linear-gradient(135deg, ${from}, ${to})`,
            fontSize: size * 0.4,
            letterSpacing: "-0.02em",
            boxShadow:
              "inset 0 -2px 6px rgba(0,0,0,0.18), inset 0 1px 1px rgba(255,255,255,0.25)",
          }}
          aria-hidden="true"
        >
          {initials}
        </span>
      )}
      {online && (
        <span
          className="absolute right-0 bottom-0 rounded-full bg-success shadow-[0_0_0_2px_var(--bg-1)]"
          style={{ width: dot, height: dot }}
          aria-label="Online"
        />
      )}
    </span>
  );
}
