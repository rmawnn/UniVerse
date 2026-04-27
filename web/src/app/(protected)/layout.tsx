"use client";

import { useAuthGuard } from "@/hooks/use-auth-guard";
import { useWebSocket } from "@/hooks/use-websocket";
import AppShell from "@/components/layouts/AppShell";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isReady } = useAuthGuard();

  // Connect WebSocket for real-time messages & notifications
  useWebSocket();

  if (!isReady || !user) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
        }}
      >
        <p style={{ color: "#999" }}>Loading...</p>
      </div>
    );
  }

  return <AppShell>{children}</AppShell>;
}
