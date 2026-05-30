/**
 * Mock data for the admin moderation dashboard. Mirrors the shapes the
 * FastAPI admin endpoints will return.
 */

export interface AdminStat {
  key: string;
  label: string;
  value: string;
  delta: string;
  /** Positive trend (green) vs. attention-needed (amber/red). */
  tone: "up" | "flat" | "warn";
}

export const ADMIN_STATS: AdminStat[] = [
  { key: "users", label: "Verified students", value: "12,408", delta: "+312 this week", tone: "up" },
  { key: "reports", label: "Open reports", value: "23", delta: "+6 today", tone: "warn" },
  { key: "verifications", label: "Pending verifications", value: "47", delta: "18 over 24h SLA", tone: "warn" },
  { key: "communities", label: "Active communities", value: "312", delta: "+4 this week", tone: "up" },
];

export type ReportReason =
  | "Spam"
  | "Harassment"
  | "Off-topic"
  | "Misinformation"
  | "NSFW";

export interface FlaggedPost {
  id: string;
  author: string;
  university: string;
  community: string;
  excerpt: string;
  reason: ReportReason;
  reports: number;
  time: string;
}

export const FLAGGED_POSTS: FlaggedPost[] = [
  {
    id: "f1",
    author: "anon_429",
    university: "Stanford",
    community: "dorm-life",
    excerpt:
      "Selling discounted meal-plan swipes, DM me — bulk rates available, fast turnaround…",
    reason: "Spam",
    reports: 12,
    time: "8m",
  },
  {
    id: "f2",
    author: "throwaway_x",
    university: "MIT",
    community: "cs-229",
    excerpt:
      "Posting full PS3 solutions here since the deadline already passed for some sections.",
    reason: "Misinformation",
    reports: 7,
    time: "26m",
  },
  {
    id: "f3",
    author: "grumpy_grad",
    university: "UC Berkeley",
    community: "startup-club",
    excerpt:
      "Repeated personal attacks toward another member across three threads in this community.",
    reason: "Harassment",
    reports: 9,
    time: "1h",
  },
  {
    id: "f4",
    author: "promo_bot22",
    university: "Stanford",
    community: "late-night-eats",
    excerpt: "🔥 FREE crypto for students!! Link in bio, limited spots remaining 🔥",
    reason: "Spam",
    reports: 21,
    time: "2h",
  },
];

export interface VerificationRequest {
  id: string;
  name: string;
  email: string;
  university: string;
  submitted: string;
  method: "SSO" | ".edu email" | "ID document";
}

export const VERIFICATION_QUEUE: VerificationRequest[] = [
  { id: "v1", name: "Sofia Lee", email: "s.lee@stanford.edu", university: "Stanford", submitted: "12m", method: ".edu email" },
  { id: "v2", name: "Marcus Hill", email: "mhill@berkeley.edu", university: "UC Berkeley", submitted: "44m", method: "SSO" },
  { id: "v3", name: "Yuki Tanaka", email: "ytanaka@mit.edu", university: "MIT", submitted: "1h", method: "ID document" },
  { id: "v4", name: "Ade Okafor", email: "a.okafor@stanford.edu", university: "Stanford", submitted: "3h", method: ".edu email" },
];

export interface AdminActivity {
  id: string;
  actor: string;
  action: string;
  time: string;
}

export const ADMIN_ACTIVITY: AdminActivity[] = [
  { id: "a1", actor: "You", action: "removed a flagged post in #dorm-life", time: "4m" },
  { id: "a2", actor: "Mod · Jonas", action: "approved 6 verification requests", time: "31m" },
  { id: "a3", actor: "System", action: "auto-hid a post at 20+ reports", time: "1h" },
  { id: "a4", actor: "Mod · Priya", action: "warned @throwaway_x for misinformation", time: "2h" },
];
