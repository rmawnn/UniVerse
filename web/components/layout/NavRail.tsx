"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  Bookmark,
  Briefcase,
  Compass,
  Hash,
  Home,
  MessageCircle,
  Plus,
  Settings,
  ShieldAlert,
  User,
} from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { CommunityIcon } from "@/components/community/CommunityIcon";
import { UVMark } from "@/components/ui/UVMark";
import { COMMUNITIES, CURRENT_USER } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import { useCompose } from "@/components/post/ComposeProvider";
import { ShieldCheck } from "lucide-react";

type NavItem = {
  href: string;
  icon: typeof Home;
  label: string;
  badge?: number;
};

const NAV_ITEMS: readonly NavItem[] = [
  { href: "/", icon: Home, label: "Home" },
  { href: "/explore", icon: Compass, label: "Explore" },
  { href: "/communities", icon: Hash, label: "Communities" },
  { href: "/bookmarks", icon: Bookmark, label: "Bookmarks" },
  { href: "/messages", icon: MessageCircle, label: "Messages", badge: 4 },
  { href: "/notifications", icon: Bell, label: "Notifications", badge: 12 },
  { href: "/jobs", icon: Briefcase, label: "Jobs" },
  { href: "/profile/mayac", icon: User, label: "Profile" },
];

const ADMIN_ITEM: NavItem = {
  href: "/admin",
  icon: ShieldAlert,
  label: "Admin",
};

const PINNED = COMMUNITIES.filter((c) => c.joined).slice(0, 4);

export function NavRail() {
  const pathname = usePathname();
  const { open } = useCompose();

  return (
    <aside
      className={cn(
        "z-10 hidden h-full flex-col gap-1 border-r border-line-1 bg-bg-1 px-3.5 py-[18px] md:flex",
        // Icon-only on tablet, full on desktop
        "w-[72px] lg:w-[248px]",
      )}
    >
      {/* Brand */}
      <Link
        href="/"
        className="mb-4 flex items-center gap-2.5 px-2 pt-1.5 pb-2"
      >
        <UVMark size={32} />
        <span className="hidden lg:block">
          <span className="block text-base font-bold leading-tight tracking-tighter">
            UniVerse
          </span>
          <span className="block font-mono text-[10.5px] uppercase tracking-[0.06em] text-fg-3">
            Stanford
          </span>
        </span>
      </Link>

      {/* Compose CTA */}
      <Button
        className="mb-2.5 hidden lg:inline-flex"
        icon={<Plus className="h-4.5 w-4.5" strokeWidth={2.5} />}
        onClick={() => open()}
      >
        New post
      </Button>
      <button
        onClick={() => open()}
        className="mb-2.5 flex h-11 w-11 shrink-0 items-center justify-center self-center rounded-xl bg-acc-gradient text-white shadow-acc lg:hidden"
        aria-label="New post"
      >
        <Plus className="h-5 w-5" strokeWidth={2.5} />
      </button>

      {/* Primary nav */}
      <nav className="flex flex-col gap-0.5">
        {NAV_ITEMS.map((it) => (
          <NavLink key={it.href} item={it} active={isActive(pathname, it.href)} />
        ))}
      </nav>

      {/* Pinned communities */}
      <div className="mt-4 hidden lg:block">
        <div className="flex items-center justify-between px-2 pb-1.5 font-mono text-[10.5px] uppercase tracking-[0.08em] text-fg-3">
          <span>Pinned</span>
          <span>{PINNED.length}</span>
        </div>
        <div className="flex flex-col gap-0.5">
          {PINNED.map((c) => (
            <Link
              key={c.id}
              href={`/communities/${c.slug}`}
              className="flex h-9 items-center gap-2.5 rounded-md px-2 text-[13px] text-fg-2 hover:bg-bg-2"
            >
              <CommunityIcon community={c} size={22} />
              <span className="truncate">#{c.slug}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Staff section */}
      <div className="mt-4">
        <div className="hidden px-2 pb-1.5 font-mono text-[10.5px] uppercase tracking-[0.08em] text-fg-3 lg:block">
          Staff
        </div>
        <NavLink item={ADMIN_ITEM} active={isActive(pathname, ADMIN_ITEM.href)} />
      </div>

      {/* User card pinned to bottom */}
      <div className="mt-auto hidden items-center gap-2.5 rounded-md border border-line-1 bg-bg-2 p-2 lg:flex">
        <Link href="/profile/mayac" className="flex min-w-0 flex-1 items-center gap-2.5">
          <Avatar name={CURRENT_USER.name} size={36} online />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1 text-[13px] font-semibold">
              <span className="truncate">{CURRENT_USER.name}</span>
              <ShieldCheck className="h-3 w-3 shrink-0 text-verified" />
            </div>
            <div className="text-[11px] text-fg-3">@{CURRENT_USER.handle}</div>
          </div>
        </Link>
        <Link
          href="/settings"
          className="flex h-8 w-8 items-center justify-center rounded-md text-fg-3 hover:bg-bg-3 hover:text-fg-1"
          aria-label="Settings"
        >
          <Settings className="h-4 w-4" />
        </Link>
      </div>
    </aside>
  );
}

function NavLink({
  item,
  active,
}: {
  item: NavItem;
  active: boolean;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative flex h-10 items-center justify-center gap-3 rounded-md text-[14px] font-medium transition-colors",
        "lg:justify-start lg:px-3",
        active
          ? "bg-bg-3 text-fg-1 font-semibold"
          : "text-fg-2 hover:bg-bg-2 hover:text-fg-1",
      )}
    >
      <Icon
        className="h-5 w-5 shrink-0"
        strokeWidth={active ? 2.25 : 1.85}
        fill={active ? "currentColor" : "none"}
      />
      <span className="hidden lg:block lg:flex-1">{item.label}</span>
      {item.badge !== undefined && (
        <span
          className={cn(
            "ml-auto flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[10.5px] font-bold text-white",
            "absolute right-1 top-1 lg:relative lg:right-auto lg:top-auto",
            active ? "bg-acc-gradient" : "bg-bg-4",
          )}
        >
          {item.badge}
        </span>
      )}
      {active && (
        <span
          className="absolute -left-3.5 top-2 bottom-2 w-[3px] rounded-r bg-acc-gradient lg:block hidden"
          aria-hidden="true"
        />
      )}
    </Link>
  );
}

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}
