"use client";

import { useEffect, useRef } from "react";

/**
 * Attach the returned ref to a sentinel element near the bottom of a list.
 * When it enters the viewport, onLoadMore() is called — ideal for infinite scroll.
 */
export function useInfiniteScroll(
  onLoadMore: () => void,
  enabled: boolean
): React.RefObject<HTMLDivElement | null> {
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const callbackRef = useRef(onLoadMore);

  // Keep the latest callback without re-creating the observer.
  useEffect(() => {
    callbackRef.current = onLoadMore;
  }, [onLoadMore]);

  useEffect(() => {
    if (!enabled) return;
    const node = sentinelRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            callbackRef.current();
          }
        }
      },
      { rootMargin: "300px 0px" }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [enabled]);

  return sentinelRef;
}
