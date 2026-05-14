"use client";

import { useEffect, useRef, useCallback, useState } from "react";

const THRESHOLD = 80; // px of overscroll needed to trigger
const MAX_PULL = 120; // visual cap
const RESISTANCE = 0.45; // damping factor

/**
 * Pull-to-refresh hook for mobile / touch devices.
 *
 * Returns:
 *  - pullDistance: current pull offset in px (0 when idle)
 *  - isRefreshing: true while the onRefresh callback is in-flight
 *
 * Attach no ref — the hook listens on `window` and only activates
 * when `document.scrollingElement.scrollTop <= 0`.
 */
export function usePullToRefresh(onRefresh: () => Promise<unknown>) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const startY = useRef(0);
  const pulling = useRef(false);
  const onRefreshRef = useRef(onRefresh);

  useEffect(() => {
    onRefreshRef.current = onRefresh;
  }, [onRefresh]);

  const handleTouchStart = useCallback(
    (e: TouchEvent) => {
      if (isRefreshing) return;
      const scrollTop =
        document.scrollingElement?.scrollTop ??
        document.documentElement.scrollTop;
      if (scrollTop <= 0) {
        startY.current = e.touches[0].clientY;
        pulling.current = true;
      }
    },
    [isRefreshing],
  );

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (!pulling.current || isRefreshing) return;
      const dy = e.touches[0].clientY - startY.current;
      if (dy > 0) {
        // Apply resistance so it feels physical
        const distance = Math.min(dy * RESISTANCE, MAX_PULL);
        setPullDistance(distance);
      } else {
        // Scrolling up — cancel
        pulling.current = false;
        setPullDistance(0);
      }
    },
    [isRefreshing],
  );

  const handleTouchEnd = useCallback(() => {
    if (!pulling.current) return;
    pulling.current = false;

    if (pullDistance >= THRESHOLD) {
      setIsRefreshing(true);
      setPullDistance(THRESHOLD); // snap to threshold while refreshing
      onRefreshRef.current().finally(() => {
        setIsRefreshing(false);
        setPullDistance(0);
      });
    } else {
      setPullDistance(0);
    }
  }, [pullDistance]);

  useEffect(() => {
    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchmove", handleTouchMove, { passive: true });
    window.addEventListener("touchend", handleTouchEnd);

    return () => {
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  return { pullDistance, isRefreshing };
}
