"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth-store";

export default function Home() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const isReady = useAuthStore((s) => s.isReady);

  useEffect(() => {
    if (!isReady) return;
    if (user) {
      router.replace("/feed");
    } else {
      router.replace("/login");
    }
  }, [isReady, user, router]);

  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
      <p style={{ color: "#999" }}>Loading...</p>
    </div>
  );
}
