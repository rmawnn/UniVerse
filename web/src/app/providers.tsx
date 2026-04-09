"use client";

import QueryProvider from "@/lib/query-provider";
import { useHydrate } from "@/hooks/use-hydrate";

export default function Providers({ children }: { children: React.ReactNode }) {
  useHydrate();
  return <QueryProvider>{children}</QueryProvider>;
}
