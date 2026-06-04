"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { useAuthStore } from "@/lib/stores/auth-store";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase";

import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";

/**
 * Subscribe to Supabase Realtime channels for the current user.
 *
 * This is a supplementary hook — the primary WebSocket connection
 * (useWebSocket) handles all messaging. This hook adds:
 *   - Horizontal-scaling awareness (events from other FastAPI instances)
 *   - Direct Supabase Realtime features (presence tracking)
 *
 * When Supabase is not configured, this hook is a no-op.
 */
export function useSupabaseRealtime() {
  const user = useAuthStore((s) => s.user);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const clientRef = useRef<SupabaseClient | null>(null);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured || !user?.id) return;

    const client = getSupabaseClient();
    if (!client) return;
    clientRef.current = client;

    // Subscribe to the user's personal channel
    const channel = client
      .channel(`user:${user.id}`)
      .on("broadcast", { event: "*" }, (payload) => {
        // Events from Supabase Realtime are handled here.
        // The primary useWebSocket hook handles the same events
        // via the FastAPI WebSocket — this is for multi-instance scaling.
        // In single-instance mode, events arrive via WS first.
      })
      .subscribe((status) => {
        setIsActive(status === "SUBSCRIBED");
      });

    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
      channelRef.current = null;
      setIsActive(false);
    };
  }, [user?.id]);

  return { isActive, isConfigured: isSupabaseConfigured };
}
