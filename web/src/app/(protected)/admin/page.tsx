"use client";

import { useState } from "react";
import { useAuthStore } from "@/store/auth-store";
import DashboardTab from "./DashboardTab";
import ModerationTab from "./ModerationTab";
import ReportsTab from "./ReportsTab";
import UsersTab from "./UsersTab";
import VerificationsTab from "./VerificationsTab";
import CommunitiesTab from "./CommunitiesTab";
import PostsTab from "./PostsTab";

type Tab = "dashboard" | "moderation" | "reports" | "users" | "verifications" | "communities" | "posts";

export default function AdminPage() {
  const user = useAuthStore((s) => s.user);
  const [tab, setTab] = useState<Tab>("dashboard");

  if (user?.role !== "admin") {
    return (
      <div style={styles.denied}>
        <div style={styles.deniedIcon}>X</div>
        <p style={styles.deniedTitle}>Access Denied</p>
        <p style={styles.deniedText}>Admin privileges required to view this page.</p>
      </div>
    );
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: "dashboard", label: "Dashboard" },
    { key: "moderation", label: "Moderation" },
    { key: "reports", label: "Reports" },
    { key: "users", label: "Users" },
    { key: "verifications", label: "Verifications" },
    { key: "communities", label: "Communities" },
    { key: "posts", label: "Posts" },
  ];

  return (
    <div>
      {/* ── Header ──────────────────────────────────── */}
      <div style={styles.headerRow}>
        <div>
          <h2 style={styles.heading}>Admin Panel</h2>
          <p style={styles.headingSub}>
            Manage users, content, and platform operations
          </p>
        </div>
        <span style={styles.adminBadge}>Admin</span>
      </div>

      {/* ── Tab Bar ─────────────────────────────────── */}
      <div style={styles.tabBar}>
        <div style={styles.tabScroll}>
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
      </div>

      {/* ── Content ─────────────────────────────────── */}
      <div style={styles.tabContent}>
        {tab === "dashboard" && (
          <DashboardTab onNavigate={(t) => setTab(t as Tab)} />
        )}
        {tab === "moderation" && <ModerationTab />}
        {tab === "reports" && <ReportsTab />}
        {tab === "users" && <UsersTab currentUserId={user.id} />}
        {tab === "verifications" && <VerificationsTab />}
        {tab === "communities" && <CommunitiesTab />}
        {tab === "posts" && <PostsTab />}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  /* ── Header ─────────────────────────── */
  headerRow: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  heading: {
    fontSize: 24,
    fontWeight: 700,
    color: "#1a1a1a",
    margin: 0,
    lineHeight: 1.2,
  },
  headingSub: {
    fontSize: 14,
    color: "#888",
    margin: "4px 0 0",
  },
  adminBadge: {
    display: "inline-block",
    fontSize: 12,
    fontWeight: 700,
    color: "#6C63FF",
    background: "#f0efff",
    borderRadius: 6,
    padding: "4px 12px",
    letterSpacing: 0.5,
    textTransform: "uppercase" as const,
    flexShrink: 0,
  },

  /* ── Access denied ──────────────────── */
  denied: {
    textAlign: "center" as const,
    padding: "64px 24px",
  },
  deniedIcon: {
    width: 48,
    height: 48,
    borderRadius: "50%",
    background: "#fee2e2",
    color: "#dc2626",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 20,
    fontWeight: 700,
    marginBottom: 12,
  },
  deniedTitle: {
    fontSize: 18,
    fontWeight: 700,
    color: "#1a1a1a",
    margin: "0 0 4px",
  },
  deniedText: { fontSize: 14, color: "#999", margin: 0 },

  /* ── Tab bar ────────────────────────── */
  tabBar: {
    borderBottomWidth: 1,
    borderBottomStyle: "solid" as const,
    borderBottomColor: "#eee",
    marginBottom: 24,
  },
  tabScroll: {
    display: "flex",
    gap: 2,
    overflowX: "auto" as const,
    paddingBottom: 0,
  },
  tabBtn: {
    padding: "10px 18px",
    fontSize: 13,
    fontWeight: 500,
    border: "none",
    borderBottomWidth: 2,
    borderBottomStyle: "solid" as const,
    borderBottomColor: "transparent",
    background: "none",
    color: "#777",
    cursor: "pointer",
    marginBottom: -1,
    whiteSpace: "nowrap" as const,
    transition: "color 0.15s, border-color 0.15s",
  },
  tabActive: {
    color: "#6C63FF",
    borderBottomColor: "#6C63FF",
    fontWeight: 600,
  },
  tabContent: {},
};
