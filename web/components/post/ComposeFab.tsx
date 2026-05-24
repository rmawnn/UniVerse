"use client";

import { Plus } from "lucide-react";
import { useCompose } from "@/components/post/ComposeProvider";

interface ComposeFabProps {
  /** Pre-select this community when the modal opens. */
  communitySlug?: string;
}

/**
 * Floating action button — opens the global Create Post modal with the
 * given community pre-selected. Hidden on small screens (we have an
 * inline composer + bottom-nav compose button on mobile).
 */
export function ComposeFab({ communitySlug }: ComposeFabProps) {
  const { open } = useCompose();
  return (
    <button
      type="button"
      onClick={() => open(communitySlug)}
      aria-label="New post"
      className="fixed bottom-6 right-6 z-30 hidden h-14 w-14 items-center justify-center rounded-2xl bg-acc-gradient text-white shadow-acc transition-transform hover:scale-[1.04] active:scale-[0.98] lg:flex"
    >
      <Plus className="h-6 w-6" strokeWidth={2.5} />
    </button>
  );
}
