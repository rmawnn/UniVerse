"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { useAuthStore } from "@/lib/stores/auth-store";

/* ── Types ────────────────────────────────────────────── */

export interface WsEvent {
  type: "new_message" | "new_notification" | "typing_start" | "typing_stop";
  data: Record<string, unknown>;
}

type WsEventHandler = (event: WsEvent) => void;

interface UseWebSocketReturn {
  isConnected: boolean;
  sendTypingStart: (conversationId: string) => void;
  sendTypingStop: (conversationId: string) => void;
  subscribe: (handler: WsEventHandler) => () => void;
}

/* ── Derive WS base URL from the HTTP API URL ────────── */

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";
const WS_BASE = API_URL.replace(/^http/, "ws").replace(/\/api\/v1\/?$/, "");

/** Reconnect back-off steps (ms). */
const RECONNECT_DELAYS = [1000, 2000, 4000, 8000, 16000];

/* ── Hook ─────────────────────────────────────────────── */

export function useWebSocket(): UseWebSocketReturn {
  const token = useAuthStore((s) => s.token);
  const wsRef = useRef<WebSocket | null>(null);
  const handlersRef = useRef<Set<WsEventHandler>>(new Set());
  const retryRef = useRef(0);
  const mountedRef = useRef(true);
  const [isConnected, setIsConnected] = useState(false);

  /* ---- connect / reconnect ---- */
  const connect = useCallback(() => {
    if (!token || !mountedRef.current) return;

    // Tear down any previous socket
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    const ws = new WebSocket(`${WS_BASE}/ws?token=${token}`);
    wsRef.current = ws;

    ws.onopen = () => {
      if (!mountedRef.current) return;
      retryRef.current = 0;
      setIsConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data) as WsEvent;
        handlersRef.current.forEach((h) => h(parsed));
      } catch {
        // ignore malformed messages
      }
    };

    ws.onclose = (closeEvent) => {
      if (!mountedRef.current) return;
      setIsConnected(false);
      wsRef.current = null;

      // Don't reconnect on auth failure
      if (closeEvent.code === 4001) return;

      const delay =
        RECONNECT_DELAYS[retryRef.current] ??
        RECONNECT_DELAYS[RECONNECT_DELAYS.length - 1]!;
      retryRef.current = Math.min(
        retryRef.current + 1,
        RECONNECT_DELAYS.length - 1,
      );
      setTimeout(() => {
        if (mountedRef.current) connect();
      }, delay);
    };

    ws.onerror = () => {
      // onclose fires after onerror — reconnect logic lives there
    };
  }, [token]);

  useEffect(() => {
    mountedRef.current = true;
    connect();
    return () => {
      mountedRef.current = false;
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [connect]);

  /* ---- send helpers ---- */
  const sendTypingStart = useCallback((conversationId: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: "typing_start",
          data: { conversation_id: conversationId },
        }),
      );
    }
  }, []);

  const sendTypingStop = useCallback((conversationId: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: "typing_stop",
          data: { conversation_id: conversationId },
        }),
      );
    }
  }, []);

  /* ---- subscribe / unsubscribe ---- */
  const subscribe = useCallback((handler: WsEventHandler) => {
    handlersRef.current.add(handler);
    return () => {
      handlersRef.current.delete(handler);
    };
  }, []);

  return { isConnected, sendTypingStart, sendTypingStop, subscribe };
}
