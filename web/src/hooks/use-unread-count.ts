"use client";

import { useQuery } from "@tanstack/react-query";
import { listNotifications } from "@/api/notifications";

/**
 * Polls the first notifications page every 30s and derives the unread count.
 * There is no dedicated unread-count endpoint, so we compute it client-side.
 */
export function useUnreadCount(): number {
  const { data } = useQuery({
    queryKey: ["notifications", "badge"],
    queryFn: () => listNotifications({ page_size: 30 }),
    refetchInterval: 30_000,
    staleTime: 15_000,
  });

  return data?.items.filter((n) => !n.is_read).length ?? 0;
}
