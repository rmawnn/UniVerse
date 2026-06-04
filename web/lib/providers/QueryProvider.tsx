"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";

export function QueryProvider({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Data stays "fresh" for 60s — no refetch within this window
            staleTime: 60_000,
            // Cache entries survive for 10 minutes after unmount
            gcTime: 10 * 60_000,
            // Retry failed requests once with exponential backoff
            retry: 1,
            retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10_000),
            // Don't refetch on window focus (avoids unnecessary API calls)
            refetchOnWindowFocus: false,
            // Don't refetch on reconnect (the user can refresh manually)
            refetchOnReconnect: "always",
          },
          mutations: {
            // Retry mutations once on network errors
            retry: 1,
          },
        },
      }),
  );

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
