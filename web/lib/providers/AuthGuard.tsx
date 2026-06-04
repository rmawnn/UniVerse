"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from "@/lib/stores/auth-store";

/**
 * Wraps protected routes inside the (app) group.
 *
 * Gate logic:
 *   1. No token → redirect to /login
 *   2. Email not verified → redirect to /verify
 *   3. Otherwise → render children
 *
 * The /verify page itself lives in (auth), outside this guard.
 */
export function AuthGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { token, user, isHydrated, isLoading } = useAuthStore();

  useEffect(() => {
    if (!isHydrated) return;

    // Not logged in → login page
    if (!token) {
      router.replace("/login");
      return;
    }

    // Logged in but email not verified → verification flow
    // Allow admin to bypass (they may need to manage the platform)
    if (user && !user.email_verified && user.role !== "admin") {
      router.replace("/verify");
      return;
    }
  }, [isHydrated, token, user, router, pathname]);

  // Still hydrating — show nothing to prevent flash
  if (!isHydrated || isLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-bg-1">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-purple border-t-transparent" />
          <span className="text-[13px] text-fg-3">Loading...</span>
        </div>
      </div>
    );
  }

  // Not authenticated or not verified — will redirect in useEffect above
  if (!token) return null;
  if (user && !user.email_verified && user.role !== "admin") return null;

  return <>{children}</>;
}
