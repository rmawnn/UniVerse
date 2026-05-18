"use client";

import { useEffect, useRef, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getToken } from "@/lib/api-client";

/**
 * Singleton WebSocket hook.
 *
 * Connects to /api/v1/ws?token=<JWT> and listens for server-pushed events.
 * On "new_message" → invalidates the relevant message and conversation caches.
 * On "new_notification" → invalidates the notification caches.
 * On "typing_start"/"typing_stop" → fires custom window events for chat UI.
 *
 * Also exposes a `send` function so components can push events upstream
 * (used for typing indicators).
 *
 * Reconnection strategy:
 * - Exponential backoff starting at 3 s, doubling up to 30 s
 * - Max 12 consecutive failures → stop reconnecting (avoids infinite spam)
 * - Counter resets on successful connection
 * - Auth failure (4001) → no reconnect
 *
 * Falls back gracefully: if the WS can't connect, polling (still configured
 * on the pages with longer intervals) acts as the safety net.
 */

const __DEV__ = process.env.NODE_ENV === "development";

/**
 * Build the WebSocket URL.
 *
 * Priority:
 *   1. NEXT_PUBLIC_WS_URL  (e.g. "wss://api.example.com/api/v1")
 *   2. Derive from NEXT_PUBLIC_API_URL by swapping http→ws / https→wss
 *   3. Fallback to ws://localhost:8000/api/v1
 */
function getWsBase(): string {
  if (process.env.NEXT_PUBLIC_WS_URL) {
    return process.env.NEXT_PUBLIC_WS_URL;
  }
  const apiUrl =
    process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";
  return apiUrl.replace(/^http(s?)/, "ws$1");
}

const WS_BASE = getWsBase();

const INITIAL_DELAY_MS = 3_000;
const MAX_DELAY_MS = 30_000;
const MAX_RETRIES = 12;
const DEDUP_WINDOW_MS = 2_000;

export function useWebSocket() {
  const qc = useQueryClient();
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const delayRef = useRef(INITIAL_DELAY_MS);
  const retriesRef = useRef(0);
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

    function scheduleReconnect() {
      if (!mounted) return;

      retriesRef.current += 1;

      if (retriesRef.current > MAX_RETRIES) {
        if (__DEV__) {
          console.warn(
            `[WS] Gave up after ${MAX_RETRIES} failed attempts. Polling will act as fallback.`,
          );
        }
        return;
      }

      const jitter = Math.random() * 1000; // 0–1 s jitter
      const delay = delayRef.current + jitter;

      if (__DEV__) {
        console.debug(
          "[WS] Reconnecting in %dms (attempt %d/%d)",
          Math.round(delay),
          retriesRef.current,
          MAX_RETRIES,
        );
      }

      reconnectTimer.current = setTimeout(() => {
        delayRef.current = Math.min(delayRef.current * 2, MAX_DELAY_MS);
        connect();
      }, delay);
    }

    function connect() {
      const token = getToken();
      if (!token || !mounted) {
        if (__DEV__) console.debug("[WS] No token — skipping connection");
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
      if (__DEV__) {
        console.debug(
          "[WS] Connecting to",
          wsUrl.replace(/token=.*/, "token=<redacted>"),
        );
      }

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        if (__DEV__) console.debug("[WS] Connected");
        // Reset backoff on successful connection
        delayRef.current = INITIAL_DELAY_MS;
        retriesRef.current = 0;
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
          } else if (
            event.type === "typing_start" ||
            event.type === "typing_stop"
          ) {
            window.dispatchEvent(
              new CustomEvent("ws:typing", { detail: event }),
            );
          }
        } catch {
          // ignore malformed frames
        }
      };

      ws.onclose = (evt) => {
        wsRef.current = null;

        if (__DEV__) {
          console.debug(
            "[WS] Closed — code=%d reason=%s",
            evt.code,
            evt.reason || "(none)",
          );
        }

        // Auth failure (4001) — don't reconnect with the same bad token
        if (evt.code === 4001) {
          if (__DEV__) console.warn("[WS] Auth failed — not reconnecting");
          return;
        }

        scheduleReconnect();
      };

      ws.onerror = () => {
        // The onerror event fires *before* onclose, so we don't log here to
        // avoid double-logging. onclose will handle the reconnect scheduling.
        // Just force-close so onclose fires.
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

  /** Send a JSON event to the server via the open WebSocket. */
  const send = useCallback((event: Record<string, unknown>) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(event));
    }
  }, []);

  return { send };
}
