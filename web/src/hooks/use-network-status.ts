"use client";

import { useSyncExternalStore } from "react";
import { isBackendOffline, subscribe } from "@/lib/network-status";

/**
 * React hook that re-renders when the backend goes offline or comes back.
 *
 * Usage:
 *   const { offline } = useNetworkStatus();
 *   if (offline) return <NetworkStatusBanner />;
 */
export function useNetworkStatus() {
  const offline = useSyncExternalStore(
    subscribe,
    isBackendOffline,
    // SSR snapshot — always assume online during server render
    () => false,
  );

  return { offline };
}
