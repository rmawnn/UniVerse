import type { InputHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: boolean;
  icon?: ReactNode;
  trailing?: ReactNode;
}

/** Labeled text input — accepts an optional leading/trailing icon. */
export function Field({
  label,
  hint,
  error,
  icon,
  trailing,
  className,
  ...rest
}: FieldProps) {
  return (
    <label className="block">
      {label && (
        <div className="mb-1.5 text-[12px] font-medium text-fg-2">{label}</div>
      )}
      <div
        className={cn(
          "flex h-[50px] items-center gap-2.5 rounded-md border bg-bg-2 px-3.5",
          error ? "border-danger" : "border-line-2 focus-within:border-brand-purple/60",
          className,
        )}
      >
        {icon && <span className="text-fg-3">{icon}</span>}
        <input
          className="h-full flex-1 bg-transparent text-[14.5px] text-fg-1 placeholder:text-fg-4 focus:outline-none"
          {...rest}
        />
        {trailing}
      </div>
      {hint && (
        <div
          className={cn(
            "mt-1.5 text-[11.5px]",
            error ? "text-danger" : "text-fg-3",
          )}
        >
          {hint}
        </div>
      )}
    </label>
  );
}
