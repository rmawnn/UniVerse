"use client";

import { useEffect, useRef } from "react";
import { useAuthStore } from "@/store/auth-store";

/**
 * Call once in the root layout to hydrate auth from localStorage on app start.
 */
export function useHydrate() {
  const hydrate = useAuthStore((s) => s.hydrate);
  const called = useRef(false);

  useEffect(() => {
    if (!called.current) {
      called.current = true;
      hydrate();
    }
  }, [hydrate]);
}
