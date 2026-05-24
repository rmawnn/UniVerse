import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "soft" | "minimal" | "danger";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  icon?: ReactNode;
  iconRight?: ReactNode;
  full?: boolean;
}

const variantStyles: Record<Variant, string> = {
  primary:
    "bg-acc-gradient text-white shadow-acc hover:brightness-110 active:brightness-95",
  secondary:
    "bg-bg-3 text-fg-1 border border-line-2 hover:bg-bg-4",
  ghost:
    "bg-transparent text-fg-1 border border-line-2 hover:bg-bg-2",
  soft:
    "bg-[var(--acc-purple)]/15 text-[#C7B0FF] border border-[var(--acc-purple)]/28 hover:bg-[var(--acc-purple)]/25",
  minimal:
    "bg-transparent text-fg-2 hover:bg-bg-2 hover:text-fg-1",
  danger:
    "bg-danger/12 text-danger border border-danger/28 hover:bg-danger/20",
};

const sizeStyles: Record<Size, string> = {
  sm: "h-8 px-3 text-[13px] rounded-[10px] gap-1.5",
  md: "h-11 px-4 text-[15px] rounded-xl gap-2",
  lg: "h-[52px] px-5 text-base rounded-md gap-2",
};

/**
 * Single button primitive with 5 variants × 3 sizes.
 * Use `icon` / `iconRight` for inline icons; pass an <Icon/> component.
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    { variant = "primary", size = "md", icon, iconRight, full, className, children, ...rest },
    ref,
  ) {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center font-semibold tracking-tightish",
          "whitespace-nowrap transition-[background,box-shadow,filter,transform] duration-150",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple/60",
          "disabled:cursor-not-allowed disabled:opacity-50",
          variantStyles[variant],
          sizeStyles[size],
          full && "w-full",
          className,
        )}
        {...rest}
      >
        {icon}
        {children}
        {iconRight}
      </button>
    );
  },
);
