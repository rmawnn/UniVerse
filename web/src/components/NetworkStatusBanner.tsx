"use client";

import { useState, useCallback } from "react";
import { useNetworkStatus } from "@/hooks/use-network-status";

/**
 * A thin banner that appears when the backend API is unreachable.
 * Automatically hides when connectivity is restored.
 *
 * Mount once in the protected layout — it renders nothing when online.
 */
export default function NetworkStatusBanner() {
  const { offline } = useNetworkStatus();
  const [retrying, setRetrying] = useState(false);

  const handleRetry = useCallback(async () => {
    setRetrying(true);
    try {
      // Ping the API base to check reachability.
      // Use native fetch (not the axios instance) so the interceptor
      // doesn't interfere with the retry UX.
      const base =
        process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";
      const res = await fetch(`${base}/../health`, {
        method: "GET",
        signal: AbortSignal.timeout(5_000),
      }).catch(() => null);

      if (res && res.ok) {
        // The network-status module will flip to online on the next
        // successful axios response. Force a page-level re-fetch.
        window.location.reload();
      }
    } finally {
      setRetrying(false);
    }
  }, []);

  if (!offline) return null;

  return (
    <div style={styles.banner}>
      <span style={styles.icon}>⚠️</span>
      <span style={styles.text}>
        Unable to reach the server. Check your connection or try again.
      </span>
      <button
        type="button"
        onClick={handleRetry}
        disabled={retrying}
        style={{
          ...styles.retryBtn,
          opacity: retrying ? 0.6 : 1,
        }}
      >
        {retrying ? "Retrying…" : "Retry"}
      </button>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  banner: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "10px 16px",
    background: "#fffbeb",
    borderBottom: "1px solid #fbbf24",
    fontSize: 13,
    fontWeight: 500,
    color: "#92400e",
    position: "sticky",
    top: 0,
    zIndex: 1000,
  },
  icon: { fontSize: 16, flexShrink: 0 },
  text: { flex: 1 },
  retryBtn: {
    background: "#fbbf24",
    color: "#78350f",
    border: "none",
    borderRadius: 6,
    padding: "4px 14px",
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
    flexShrink: 0,
  },
};
