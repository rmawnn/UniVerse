"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, ChevronDown, LogOut, MessageCircle, Moon, Search, Settings, Sun, User } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { useAuthStore } from "@/lib/stores/auth-store";
import { useThemeStore } from "@/lib/stores/theme-store";

interface TopBarProps {
  breadcrumb?: string;
  title?: string;
  action?: React.ReactNode;
}

/**
 * Sticky top bar that lives inside the main column. Houses the global
 * search trigger, notif/messages quick-access, and the user menu.
 */
export function TopBar({ breadcrumb, title, action }: TopBarProps) {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const theme = useThemeStore((s) => s.theme);
  const toggleTheme = useThemeStore((s) => s.toggle);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  const displayName = user?.full_name ?? "User";
  const profileHref = user ? `/profile/${user.username}` : "/settings";

  return (
    <div
      className="sticky top-0 z-[5] flex h-16 items-center gap-4 border-b border-line-1 px-7"
      style={{
        background: "var(--topbar-bg)",
        backdropFilter: "blur(20px) saturate(180%)",
        WebkitBackdropFilter: "blur(20px) saturate(180%)",
      }}
    >
      {/* Search trigger — navigates to /search */}
      <button
        className="flex h-10 w-full max-w-[380px] items-center gap-2.5 rounded-xl border border-line-2 bg-bg-2 px-3.5 text-[14px] text-fg-3 hover:bg-bg-3"
        aria-label="Open search"
        type="button"
        onClick={() => router.push("/search")}
      >
        <Search className="h-4 w-4" />
        <span className="flex-1 text-left">Search students, communities, posts…</span>
        <span className="rounded-[5px] border border-line-2 px-1.5 py-0.5 font-mono text-[11px] text-fg-4">
          ⌘K
        </span>
      </button>

      {/* Page title slot */}
      <div className="hidden min-w-0 flex-1 lg:block">
        {breadcrumb && (
          <div className="font-mono text-[11px] uppercase tracking-[0.04em] text-fg-3">
            {breadcrumb}
          </div>
        )}
        {title && (
          <div className="truncate text-[16px] font-semibold tracking-tightish">
            {title}
          </div>
        )}
      </div>

      {/* Right cluster */}
      <div className="ml-auto flex items-center gap-2.5">
        {action}
        <Link
          href="/notifications"
          className="relative flex h-[38px] w-[38px] items-center justify-center rounded-[10px] border border-line-1 bg-bg-2 text-fg-2 hover:text-fg-1"
          aria-label="Notifications"
        >
          <Bell className="h-4.5 w-4.5" />
          <span className="absolute right-[7px] top-[6px] h-[7px] w-[7px] rounded-full bg-danger shadow-[0_0_0_2px_var(--bg-2)]" />
        </Link>
        <Link
          href="/messages"
          className="hidden h-[38px] w-[38px] items-center justify-center rounded-[10px] border border-line-1 bg-bg-2 text-fg-2 hover:text-fg-1 md:flex"
          aria-label="Messages"
        >
          <MessageCircle className="h-4.5 w-4.5" />
        </Link>
        <button
          onClick={toggleTheme}
          className="flex h-[38px] w-[38px] items-center justify-center rounded-[10px] border border-line-1 bg-bg-2 text-fg-2 hover:text-fg-1 transition-colors"
          aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          title={theme === "dark" ? "Light mode" : "Dark mode"}
        >
          {theme === "dark" ? (
            <Sun className="h-4.5 w-4.5" />
          ) : (
            <Moon className="h-4.5 w-4.5" />
          )}
        </button>
        <div className="hidden h-6 w-px bg-line-2 md:block" />
        {/* User menu */}
        <div className="relative" ref={menuRef}>
          <button
            className="flex items-center gap-2 rounded-full border border-line-1 bg-bg-2 py-1 pl-1 pr-2.5 hover:bg-bg-3"
            aria-label="Account menu"
            onClick={() => setMenuOpen((v) => !v)}
          >
            <Avatar name={displayName} src={user?.profile_image_url} size={30} />
            <ChevronDown className="h-3.5 w-3.5 text-fg-3" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-full mt-2 w-52 overflow-hidden rounded-lg border border-line-1 bg-bg-2 shadow-2xl">
              <div className="border-b border-line-1 px-3.5 py-3">
                <div className="text-[13px] font-semibold">{displayName}</div>
                <div className="text-[11.5px] text-fg-3">@{user?.username ?? "user"}</div>
              </div>
              <div className="py-1">
                <MenuLink href={profileHref} icon={<User className="h-4 w-4" />} onClick={() => setMenuOpen(false)}>
                  Profile
                </MenuLink>
                <MenuLink href="/settings" icon={<Settings className="h-4 w-4" />} onClick={() => setMenuOpen(false)}>
                  Settings
                </MenuLink>
                <button
                  onClick={() => { setMenuOpen(false); logout(); }}
                  className="flex w-full items-center gap-2.5 px-3.5 py-2 text-[13px] text-danger hover:bg-bg-3"
                >
                  <LogOut className="h-4 w-4" /> Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MenuLink({
  href,
  icon,
  children,
  onClick,
}: {
  href: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="flex items-center gap-2.5 px-3.5 py-2 text-[13px] text-fg-2 hover:bg-bg-3 hover:text-fg-1"
    >
      {icon}
      {children}
    </Link>
  );
}
