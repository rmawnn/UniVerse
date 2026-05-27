import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Standard Tailwind class composer — `cn("p-2", cond && "bg-red")`. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const AVATAR_PALETTES: Array<[string, string]> = [
  ["#9B6CFF", "#5C8FFF"],
  ["#FF8DA1", "#FF6FB1"],
  ["#5AE0B6", "#34A8FF"],
  ["#FFB547", "#FF6A6A"],
  ["#9DCBFF", "#7AA0FF"],
  ["#C7A0FF", "#7CC7FF"],
  ["#FFD371", "#FF8E72"],
  ["#5FE2C4", "#5DB2FF"],
  ["#FF8BD0", "#A06CFF"],
];

function hashStr(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/** Stable gradient + initials derived from a person's name. */
export function avatarTheme(name: string) {
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0])
    .join("")
    .toUpperCase();
  const palette = AVATAR_PALETTES[hashStr(name) % AVATAR_PALETTES.length];
  return { initials: initials || "·", from: palette[0], to: palette[1] };
}

/** Format large counts: 1240 → "1.2k", 12_408 → "12.4k". */
export function compactNumber(n: number) {
  if (n < 1_000) return String(n);
  if (n < 1_000_000) return `${(n / 1_000).toFixed(n < 10_000 ? 1 : 0)}k`;
  return `${(n / 1_000_000).toFixed(1)}m`;
}

/** Human-readable relative time from an ISO date string. */
export function formatRelativeTime(iso: string): string {
  const now = Date.now();
  const then = new Date(iso).getTime();
  const diff = Math.max(0, now - then);
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return "just now";
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d`;
  const weeks = Math.floor(days / 7);
  if (weeks < 4) return `${weeks}w`;
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}
