"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuthStore } from "@/store/auth-store";

const NAV_ITEMS = [
  { href: "/feed", label: "Feed" },
  { href: "/communities", label: "Communities" },
  { href: "/search", label: "Search" },
  { href: "/messages", label: "Messages" },
  { href: "/notifications", label: "Notifications" },
  { href: "/profile", label: "Profile" },
];

export default function Navbar() {
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  return (
    <header style={styles.header}>
      <div style={styles.inner}>
        <Link href="/feed" style={styles.logo}>
          UniVerse
        </Link>

        <nav style={styles.nav}>
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              style={{
                ...styles.link,
                ...(pathname.startsWith(item.href) ? styles.activeLink : {}),
              }}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div style={styles.right}>
          {user && (
            <span style={styles.username}>@{user.username}</span>
          )}
          <button onClick={logout} style={styles.logoutBtn}>
            Log out
          </button>
        </div>
      </div>
    </header>
  );
}

const styles: Record<string, React.CSSProperties> = {
  header: {
    borderBottom: "1px solid #eee",
    backgroundColor: "#fff",
    position: "sticky",
    top: 0,
    zIndex: 100,
  },
  inner: {
    maxWidth: 1200,
    margin: "0 auto",
    padding: "0 24px",
    height: 56,
    display: "flex",
    alignItems: "center",
    gap: 32,
  },
  logo: {
    fontWeight: 700,
    fontSize: 20,
    color: "#6C63FF",
    textDecoration: "none",
  },
  nav: { display: "flex", gap: 20, flex: 1 },
  link: {
    textDecoration: "none",
    color: "#666",
    fontSize: 14,
    fontWeight: 500,
    padding: "4px 0",
  },
  activeLink: {
    color: "#6C63FF",
    borderBottom: "2px solid #6C63FF",
  },
  right: { display: "flex", alignItems: "center", gap: 12 },
  username: { fontSize: 13, color: "#999" },
  logoutBtn: {
    background: "none",
    border: "1px solid #ddd",
    borderRadius: 6,
    padding: "6px 14px",
    fontSize: 13,
    cursor: "pointer",
    color: "#666",
  },
};
