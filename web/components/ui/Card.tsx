import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padded?: boolean;
}

/** Standard surface card — rounded, bordered, on bg-2. */
export function Card({ className, padded = true, ...rest }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-md border border-line-1 bg-bg-2",
        padded && "p-[18px]",
        className,
      )}
      {...rest}
    />
  );
}
