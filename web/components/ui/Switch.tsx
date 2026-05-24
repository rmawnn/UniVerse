"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

interface SwitchProps {
  defaultOn?: boolean;
  onChange?: (on: boolean) => void;
  label?: string;
  ariaLabel?: string;
}

/** Token-styled toggle switch. */
export function Switch({
  defaultOn = false,
  onChange,
  label,
  ariaLabel,
}: SwitchProps) {
  const [on, setOn] = useState(defaultOn);
  function toggle() {
    const next = !on;
    setOn(next);
    onChange?.(next);
  }
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={ariaLabel ?? label}
      onClick={toggle}
      className={cn(
        "relative inline-flex h-[22px] w-[38px] shrink-0 items-center rounded-full transition-colors",
        on ? "bg-acc-gradient shadow-acc" : "bg-bg-4",
      )}
    >
      <span
        className={cn(
          "absolute top-[2px] h-[18px] w-[18px] rounded-full bg-white transition-[left]",
          on ? "left-[18px]" : "left-[2px]",
        )}
      />
    </button>
  );
}
