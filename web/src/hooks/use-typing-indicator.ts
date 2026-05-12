"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useWebSocket } from "@/hooks/use-websocket";

/**
 * Typing indicator hook for the chat screen.
 *
 * Returns:
 *   - `isTyping`: whether the other user is currently typing
 *   - `handleInputChange`: call on every keystroke in the message input
 *
 * Sending logic (debounced):
 *   - On first keystroke → send typing_start immediately
 *   - While user keeps typing → do nothing (no spamming)
 *   - After 2s of inactivity → send typing_stop
 *   - On component unmount or message send → send typing_stop
 *
 * Receiving logic:
 *   - Listens for ws:typing CustomEvents from the WebSocket hook
 *   - Sets isTyping=true on typing_start for this conversation
 *   - Sets isTyping=false on typing_stop
 *   - Auto-clears after 4s (safety timeout if typing_stop is lost)
 */

const TYPING_STOP_DELAY = 2_000;
const TYPING_TIMEOUT = 4_000;

export function useTypingIndicator(conversationId: string) {
  const { send } = useWebSocket();
  const [isTyping, setIsTyping] = useState(false);

  // ── Sending side ──────────────────────────────────────────
  const isLocallyTyping = useRef(false);
  const stopTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const sendTypingStop = useCallback(() => {
    if (isLocallyTyping.current) {
      isLocallyTyping.current = false;
      send({
        type: "typing_stop",
        data: { conversation_id: conversationId },
      });
    }
    if (stopTimer.current) {
      clearTimeout(stopTimer.current);
      stopTimer.current = null;
    }
  }, [conversationId, send]);

  const handleInputChange = useCallback(() => {
    // First keystroke → send typing_start
    if (!isLocallyTyping.current) {
      isLocallyTyping.current = true;
      send({
        type: "typing_start",
        data: { conversation_id: conversationId },
      });
    }

    // Reset the inactivity timer
    if (stopTimer.current) clearTimeout(stopTimer.current);
    stopTimer.current = setTimeout(() => {
      sendTypingStop();
    }, TYPING_STOP_DELAY);
  }, [conversationId, send, sendTypingStop]);

  // Clean up on unmount — send typing_stop if still typing
  useEffect(() => {
    return () => {
      if (isLocallyTyping.current) {
        send({
          type: "typing_stop",
          data: { conversation_id: conversationId },
        });
      }
      if (stopTimer.current) clearTimeout(stopTimer.current);
    };
  }, [conversationId, send]);

  // ── Receiving side ────────────────────────────────────────
  const remoteTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function handleTypingEvent(e: Event) {
      const detail = (e as CustomEvent).detail;
      if (!detail?.data?.conversation_id) return;
      if (detail.data.conversation_id !== conversationId) return;

      if (detail.type === "typing_start") {
        setIsTyping(true);
        // Safety timeout — auto-clear if typing_stop never arrives
        if (remoteTimeout.current) clearTimeout(remoteTimeout.current);
        remoteTimeout.current = setTimeout(() => {
          setIsTyping(false);
        }, TYPING_TIMEOUT);
      } else if (detail.type === "typing_stop") {
        setIsTyping(false);
        if (remoteTimeout.current) {
          clearTimeout(remoteTimeout.current);
          remoteTimeout.current = null;
        }
      }
    }

    window.addEventListener("ws:typing", handleTypingEvent);
    return () => {
      window.removeEventListener("ws:typing", handleTypingEvent);
      if (remoteTimeout.current) clearTimeout(remoteTimeout.current);
    };
  }, [conversationId]);

  return { isTyping, handleInputChange, sendTypingStop };
}
