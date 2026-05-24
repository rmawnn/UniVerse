"use client";

import { useEffect, type ReactNode } from "react";
import { useAuthStore } from "@/lib/stores/auth-store";

/**
 * Mounts once in the root layout. Hydrates the auth store from localStorage
 * so that downstream components can read `user` / `token` synchronously.
 */
export function AuthHydrator({ children }: { children: ReactNode }) {
  const hydrate = useAuthStore((s) => s.hydrate);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  return <>{children}</>;
}
