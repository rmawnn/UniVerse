import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface RightRailProps {
  children: ReactNode;
  className?: string;
}

/**
 * Persistent right-hand rail — hidden under lg (1024px) so the feed can
 * breathe. Each page composes its own widget stack inside.
 */
export function RightRail({ children, className }: RightRailProps) {
  return (
    <aside
      className={cn(
        "scroll-hidden hidden h-full w-[320px] shrink-0 overflow-y-auto border-l border-line-1 px-5 py-6 xl:block",
        className,
      )}
    >
      {children}
    </aside>
  );
}
