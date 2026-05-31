"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  className?: string;
}

/** Simple overlay modal with backdrop close + ESC key. */
export function Modal({ open, onClose, title, children, className }: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      {/* Panel */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        className={cn(
          "relative z-10 w-full max-w-[480px] rounded-lg border border-line-1 bg-bg-2 shadow-2xl",
          className,
        )}
      >
        <div className="flex items-center justify-between border-b border-line-1 px-5 py-3.5">
          <h3 className="text-[16px] font-semibold tracking-tightish">{title}</h3>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-md text-fg-3 hover:bg-bg-3 hover:text-fg-1"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
      </div>
    </div>
  );
}
