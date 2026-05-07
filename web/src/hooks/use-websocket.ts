"use client";

import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getToken } from "@/lib/api-client";

/**
 * Singleton WebSocket hook.
 *
 * Connects to /api/v1/ws?token=<JWT> and listens for server-pushed events.
 * On "new_message" → invalidates the relevant message and conversation caches.
 * On "new_notification" → invalidates the notification caches.
 *
 * Includes event deduplication: events with the same type + key within a short
 * window are coalesced to prevent redundant cache invalidations.
 *
 * Falls back gracefully: if the WS can't connect, polling (still configured
 * on the pages with longer intervals) acts as the safety net.
 */

const WS_BASE = (
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1"
).replace(/^http/, "ws");

const RECONNECT_DELAY_MS = 5_000;
const MAX_RECONNECT_DELAY_MS = 30_000;
const DEDUP_WINDOW_MS = 2_000;

export function useWebSocket() {
  const qc = useQueryClient();
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const delayRef = useRef(RECONNECT_DELAY_MS);
  const recentEvents = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    let mounted = true;

    /** Check if this event was already processed recently. */
    function isDuplicate(eventKey: string): boolean {
      const now = Date.now();
      const lastSeen = recentEvents.current.get(eventKey);
      if (lastSeen && now - lastSeen < DEDUP_WINDOW_MS) {
        return true;
      }
      recentEvents.current.set(eventKey, now);

      // Prune old entries to avoid unbounded growth
      if (recentEvents.current.size > 50) {
        for (const [key, ts] of recentEvents.current) {
          if (now - ts > DEDUP_WINDOW_MS) {
            recentEvents.current.delete(key);
          }
        }
      }
      return false;
    }

    function connect() {
      const token = getToken();
      if (!token || !mounted) {
        console.debug("[WS] No token available — skipping connection");
        return;
      }

      // Don't double-connect
      if (
        wsRef.current &&
        (wsRef.current.readyState === WebSocket.OPEN ||
          wsRef.current.readyState === WebSocket.CONNECTING)
      ) {
        return;
      }

      const wsUrl = `${WS_BASE}/ws?token=${token}`;
      console.debug("[WS] Connecting to", wsUrl.replace(/token=.*/, "token=<redacted>"));
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.debug("[WS] Connected");
        delayRef.current = RECONNECT_DELAY_MS; // reset backoff
      };

      ws.onmessage = (evt) => {
        try {
          const event = JSON.parse(evt.data);
          if (event.type === "new_message") {
            const convId = event.data?.conversation_id;
            const dedupKey = `msg:${convId ?? "unknown"}`;
            if (!isDuplicate(dedupKey)) {
              if (convId) {
                qc.invalidateQueries({ queryKey: ["messages", convId] });
              }
              qc.invalidateQueries({ queryKey: ["conversations"] });
            }
          } else if (event.type === "new_notification") {
            const dedupKey = `notif:${event.data?.id ?? Date.now()}`;
            if (!isDuplicate(dedupKey)) {
              qc.invalidateQueries({ queryKey: ["notifications", "list"] });
              qc.invalidateQueries({ queryKey: ["notifications", "badge"] });
            }
          }
        } catch {
          // ignore malformed frames
        }
      };

      ws.onclose = (evt) => {
        wsRef.current = null;
        console.debug("[WS] Closed — code=%d reason=%s", evt.code, evt.reason || "(none)");

        // Auth failure (4001) — don't reconnect with the same bad token
        if (evt.code === 4001) {
          console.warn("[WS] Auth failed — not reconnecting");
          return;
        }

        if (mounted) {
          console.debug("[WS] Reconnecting in %dms", delayRef.current);
          reconnectTimer.current = setTimeout(() => {
            delayRef.current = Math.min(
              delayRef.current * 2,
              MAX_RECONNECT_DELAY_MS
            );
            connect();
          }, delayRef.current);
        }
      };

      ws.onerror = () => {
        console.error("[WS] Connection error");
        ws.close();
      };
    }

    connect();

    return () => {
      mounted = false;
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [qc]);
}
