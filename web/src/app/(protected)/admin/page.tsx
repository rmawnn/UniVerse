"use client";

import { useState } from "react";
import { useAuthStore } from "@/store/auth-store";
import DashboardTab from "./DashboardTab";
import UsersTab from "./UsersTab";
import VerificationsTab from "./VerificationsTab";
import CommunitiesTab from "./CommunitiesTab";
import PostsTab from "./PostsTab";

type Tab = "dashboard" | "users" | "verifications" | "communities" | "posts";

export default function AdminPage() {
  const user = useAuthStore((s) => s.user);
  const [tab, setTab] = useState<Tab>("dashboard");

  if (user?.role !== "admin") {
    return (
      <div style={styles.denied}>
        <p style={styles.deniedText}>Admin access required.</p>
      </div>
    );
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: "dashboard", label: "Dashboard" },
    { key: "users", label: "Users" },
    { key: "verifications", label: "Verifications" },
    { key: "communities", label: "Communities" },
    { key: "posts", label: "Posts" },
  ];

  return (
    <div>
      <h2 style={styles.heading}>Admin Panel</h2>

      <div style={styles.tabBar}>
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              ...styles.tabBtn,
              ...(tab === t.key ? styles.tabActive : {}),
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div style={styles.tabContent}>
        {tab === "dashboard" && (
          <DashboardTab onNavigate={(t) => setTab(t as Tab)} />
        )}
        {tab === "users" && <UsersTab currentUserId={user.id} />}
        {tab === "verifications" && <VerificationsTab />}
        {tab === "communities" && <CommunitiesTab />}
        {tab === "posts" && <PostsTab />}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  heading: { fontSize: 22, fontWeight: 700, marginBottom: 16 },
  denied: { textAlign: "center", padding: "64px 24px" },
  deniedText: { fontSize: 16, color: "#999" },
  tabBar: {
    display: "flex",
    gap: 4,
    marginBottom: 20,
    borderBottom: "1px solid #eee",
    paddingBottom: 0,
  },
  tabBtn: {
    padding: "10px 20px",
    fontSize: 14,
    fontWeight: 500,
    border: "none",
    borderBottomWidth: 2,
    borderBottomStyle: "solid" as const,
    borderBottomColor: "transparent",
    background: "none",
    color: "#666",
    cursor: "pointer",
    marginBottom: -1,
  },
  tabActive: {
    color: "#6C63FF",
    borderBottomColor: "#6C63FF",
    fontWeight: 600,
  },
  tabContent: {},
};
