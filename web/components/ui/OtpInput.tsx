"use client";

import { useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface OtpInputProps {
  length?: number;
  defaultValue?: string;
  onChange?: (value: string) => void;
}

/** 6-digit OTP input — client component, focuses next box on type. */
export function OtpInput({ length = 6, defaultValue = "", onChange }: OtpInputProps) {
  const [digits, setDigits] = useState<string[]>(() => {
    const arr = new Array(length).fill("");
    for (let i = 0; i < Math.min(length, defaultValue.length); i++) {
      arr[i] = defaultValue[i];
    }
    return arr;
  });
  const refs = useRef<Array<HTMLInputElement | null>>([]);

  function update(idx: number, ch: string) {
    const next = [...digits];
    next[idx] = ch.slice(-1);
    setDigits(next);
    onChange?.(next.join(""));
    if (ch && idx < length - 1) refs.current[idx + 1]?.focus();
  }

  function handleKey(idx: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !digits[idx] && idx > 0) {
      refs.current[idx - 1]?.focus();
    }
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
    if (!pasted) return;
    e.preventDefault();
    const next = [...digits];
    for (let i = 0; i < pasted.length; i++) {
      next[i] = pasted[i];
    }
    setDigits(next);
    onChange?.(next.join(""));
    const focusIdx = Math.min(pasted.length, length - 1);
    refs.current[focusIdx]?.focus();
  }

  return (
    <div className="flex justify-center gap-2.5" role="group" aria-label="One-time code">
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={d}
          aria-label={`Digit ${i + 1}`}
          onChange={(e) => update(i, e.target.value)}
          onKeyDown={(e) => handleKey(i, e)}
          onPaste={handlePaste}
          className={cn(
            "h-[56px] w-[56px] rounded-md border bg-bg-2 text-center text-[26px] font-semibold text-fg-1",
            "focus:outline-none focus:ring-4",
            d
              ? "border-line-3"
              : "border-line-2",
            "focus:border-brand-purple/80 focus:ring-brand-purple/20",
          )}
        />
      ))}
    </div>
  );
}
