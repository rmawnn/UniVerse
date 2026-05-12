"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuthStore } from "@/store/auth-store";
import { useUnreadCount } from "@/hooks/use-unread-count";

const NAV_ITEMS = [
  { href: "/feed", label: "Feed", icon: "🏠" },
  { href: "/shorts", label: "Shorts", icon: "🎬" },
  { href: "/explore", label: "Explore", icon: "🧭" },
  { href: "/communities", label: "Communities", icon: "👥" },
  { href: "/search", label: "Search", icon: "🔍" },
  { href: "/saved", label: "Saved", icon: "🔖" },
  { href: "/messages", label: "Messages", icon: "✉️" },
  {
    href: "/notifications",
    label: "Notifications",
    icon: "🔔",
    badgeKey: "notifications" as const,
  },
  { href: "/profile", label: "Profile", icon: "👤" },
];

export default function Sidebar({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const unread = useUnreadCount();

  const isActive = (href: string) => {
    if (href === "/profile") {
      return pathname === "/profile"; // not /profile/[userId]
    }
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <>
      <div
        className={`sidebar-backdrop ${open ? "open" : ""}`}
        onClick={onClose}
      />
      <aside className={`sidebar ${open ? "open" : ""}`}>
        <div style={styles.logoBox}>
          <Link href="/feed" style={styles.logo} onClick={onClose}>
            UniVerse
          </Link>
        </div>

        <nav className="sidebar-content" style={styles.nav}>
          {NAV_ITEMS.map((item) => {
            const active = isActive(item.href);
            const showBadge = item.badgeKey === "notifications" && unread > 0;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                style={{
                  ...styles.link,
                  ...(active ? styles.activeLink : {}),
                }}
              >
                <span style={styles.icon}>{item.icon}</span>
                <span style={{ flex: 1 }}>{item.label}</span>
                {showBadge && (
                  <span style={styles.badge}>
                    {unread > 99 ? "99+" : unread}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {user && (
          <div style={styles.footer}>
            <div style={styles.userBox}>
              <div style={styles.avatar}>
                {user.full_name.charAt(0).toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={styles.userName}>{user.full_name}</div>
                <div style={styles.userHandle}>@{user.username}</div>
              </div>
            </div>
            <button onClick={logout} style={styles.logoutBtn}>
              Log out
            </button>
          </div>
        )}
      </aside>
    </>
  );
}

const styles: Record<string, React.CSSProperties> = {
  logoBox: { padding: "0 20px 20px", borderBottom: "1px solid #f0f0f0" },
  logo: {
    fontWeight: 700,
    fontSize: 22,
    color: "#6C63FF",
    textDecoration: "none",
  },
  nav: {
    display: "flex",
    flexDirection: "column",
    gap: 2,
    paddingTop: 16,
  },
  link: {
    display: "flex",
    alignItems: "center",
    padding: "10px 14px",
    borderRadius: 8,
    textDecoration: "none",
    color: "#555",
    fontSize: 14,
    fontWeight: 500,
  },
  activeLink: { background: "#f0efff", color: "#6C63FF" },
  icon: { marginRight: 12, fontSize: 16, width: 20, textAlign: "center" },
  badge: {
    background: "#e0245e",
    color: "#fff",
    borderRadius: 10,
    padding: "1px 8px",
    fontSize: 11,
    fontWeight: 600,
    minWidth: 20,
    textAlign: "center",
  },
  footer: { padding: "12px 16px", borderTop: "1px solid #f0f0f0" },
  userBox: {
    display: "flex",
    alignItems: "center",
    marginBottom: 10,
    gap: 10,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: "50%",
    background: "#6C63FF",
    color: "#fff",
    fontSize: 14,
    fontWeight: 700,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  userName: {
    fontSize: 13,
    fontWeight: 600,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  userHandle: { fontSize: 12, color: "#999" },
  logoutBtn: {
    background: "none",
    border: "1px solid #ddd",
    borderRadius: 6,
    padding: "6px 10px",
    fontSize: 12,
    cursor: "pointer",
    color: "#666",
    width: "100%",
  },
};
