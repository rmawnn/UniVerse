"use client";

import { useAuthGuard } from "@/hooks/use-auth-guard";
import Navbar from "@/components/layouts/Navbar";

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const { user, isReady } = useAuthGuard();

  if (!isReady || !user) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
        <p style={{ color: "#999" }}>Loading...</p>
      </div>
    );
  }

  return (
    <div>
      <Navbar />
      <main style={{ maxWidth: 960, margin: "0 auto", padding: "24px" }}>
        {children}
      </main>
    </div>
  );
}
