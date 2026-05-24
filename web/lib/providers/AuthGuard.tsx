"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/stores/auth-store";

/**
 * Wraps protected routes. Redirects to /login when no token is present.
 * Shows nothing while hydrating to avoid flash of content.
 */
export function AuthGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { token, isHydrated, isLoading } = useAuthStore();

  useEffect(() => {
    if (isHydrated && !token) {
      router.replace("/login");
    }
  }, [isHydrated, token, router]);

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

  // Not authenticated — will redirect in useEffect above
  if (!token) return null;

  return <>{children}</>;
}
