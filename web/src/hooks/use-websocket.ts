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
 * Falls back gracefully: if the WS can't connect, polling (still configured
 * on the pages with longer intervals) acts as the safety net.
 */

const WS_BASE = (
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1"
).replace(/^http/, "ws");

const RECONNECT_DELAY_MS = 5_000;
const MAX_RECONNECT_DELAY_MS = 30_000;

export function useWebSocket() {
  const qc = useQueryClient();
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const delayRef = useRef(RECONNECT_DELAY_MS);

  useEffect(() => {
    let mounted = true;

    function connect() {
      const token = getToken();
      if (!token || !mounted) return;

      // Don't double-connect
      if (
        wsRef.current &&
        (wsRef.current.readyState === WebSocket.OPEN ||
          wsRef.current.readyState === WebSocket.CONNECTING)
      ) {
        return;
      }

      const ws = new WebSocket(`${WS_BASE}/ws?token=${token}`);
      wsRef.current = ws;

      ws.onopen = () => {
        delayRef.current = RECONNECT_DELAY_MS; // reset backoff
      };

      ws.onmessage = (evt) => {
        try {
          const event = JSON.parse(evt.data);
          if (event.type === "new_message") {
            const convId = event.data?.conversation_id;
            if (convId) {
              qc.invalidateQueries({ queryKey: ["messages", convId] });
            }
            qc.invalidateQueries({ queryKey: ["conversations"] });
          } else if (event.type === "new_notification") {
            qc.invalidateQueries({ queryKey: ["notifications", "list"] });
            qc.invalidateQueries({ queryKey: ["notifications", "badge"] });
          }
        } catch {
          // ignore malformed frames
        }
      };

      ws.onclose = () => {
        wsRef.current = null;
        if (mounted) {
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
