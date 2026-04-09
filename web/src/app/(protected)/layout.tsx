"use client";

import { useAuthGuard } from "@/hooks/use-auth-guard";
import AppShell from "@/components/layouts/AppShell";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isReady } = useAuthGuard();

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
