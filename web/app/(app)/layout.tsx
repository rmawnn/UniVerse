import type { ReactNode } from "react";
import { ComposeProvider } from "@/components/post/ComposeProvider";
import { AuthGuard } from "@/lib/providers/AuthGuard";

/**
 * Authenticated app group. Mounts the auth guard + global Compose modal
 * provider so any client component under (app) can call `useCompose().open()`.
 */
export default function AppGroupLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGuard>
      <ComposeProvider>{children}</ComposeProvider>
    </AuthGuard>
  );
}
