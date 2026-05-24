/**
 * Extra mock data — conversations, notifications, search, profile, settings.
 * Lives separately from `mock-data.ts` so it can be lazy-imported per page
 * if we ever care about bundle size.
 */
import type { Community, User } from "./types";
import { COMMUNITIES, CURRENT_USER } from "./mock-data";

/* ─── Conversations ─────────────────────────────────── */
export interface Conversation {
  id: string;
  name: string;
  /** Last message preview */
  last: string;
  time: string;
  unread: number;
  online?: boolean;
  typing?: boolean;
  group?: boolean;
  /** For group conversations */
  members?: number;
  university?: string;
}

export const CONVERSATIONS: Conversation[] = [
  {
    id: "diegor",
    name: "Diego Romero",
    last: "sent! also there's a study group at 8 in mitchell",
    time: "2m",
    unread: 2,
    online: true,
    university: "UC Berkeley",
  },
  {
    id: "priya",
    name: "Priya Patel",
    last: "lol fair. ok pset3 office hours then?",
    time: "14m",
    unread: 0,
    online: true,
    university: "MIT",
  },
  {
    id: "cs229-squad",
    name: "CS 229 study squad",
    last: "Maya: yes please everyone arrive on time 🙏",
    time: "34m",
    unread: 7,
    group: true,
    members: 6,
    typing: true,
  },
  {
    id: "aisha",
    name: "Aisha Khan",
    last: "omw to gates B12!",
    time: "1h",
    unread: 0,
    university: "Stanford",
  },
  {
    id: "linpark",
    name: "Lin Park",
    last: "sending over the new poster mockups in a sec",
    time: "2h",
    unread: 0,
    online: true,
    university: "KAIST",
  },
  {
    id: "foothill2",
    name: "Dorm Life — Foothill 2",
    last: "Ethan: free pizza at 10pm on the green",
    time: "4h",
    unread: 0,
    group: true,
    members: 48,
  },
  {
    id: "jonas",
    name: "Jonas Weber",
    last: "reaction 🔥 to your photo",
    time: "1d",
    unread: 0,
    university: "TU Munich",
  },
];

export interface ChatMessage {
  id: string;
  author: "me" | string;
  text?: string;
  /** A small image-like attachment */
  attachment?: { kind: "file"; label: string; meta: string } | { kind: "image"; label: string };
  status?: "delivered" | "read";
  /** Group with next message if same author */
  groupedNext?: boolean;
  reactions?: { emoji: string; count: number }[];
}

export const SAMPLE_THREAD: ChatMessage[] = [
  { id: "m1", author: "Diego", text: "Yo did you go to OH today?", groupedNext: true },
  { id: "m2", author: "Diego", text: "Lost on pset 3 q4 lol" },
  {
    id: "m3",
    author: "me",
    text:
      "i did, prof said the trick is you don't actually need to compute the full Hessian",
    groupedNext: true,
  },
  { id: "m4", author: "me", text: "i'll send you my notes one sec", status: "read" },
  {
    id: "m5",
    author: "me",
    attachment: { kind: "file", label: "pset3-notes.pdf", meta: "1.4 MB · 8 pages" },
  },
  { id: "m6", author: "Diego", text: "legend 🙏 thank u", groupedNext: true },
  {
    id: "m7",
    author: "Diego",
    text: "also there's a study group at 8 tonight in mitchell — want to come?",
  },
  {
    id: "m8",
    author: "me",
    attachment: { kind: "image", label: "screenshot · whiteboard" },
    groupedNext: true,
  },
  {
    id: "m9",
    author: "me",
    text:
      "yes! brought the whiteboard pic from sec 3 — looked like this",
    status: "delivered",
  },
  {
    id: "m10",
    author: "Diego",
    text: "perfect — see you at 8 ✌️",
    reactions: [{ emoji: "🔥", count: 2 }],
  },
];

/* ─── Notifications ─────────────────────────────────── */
export type NotificationKind =
  | "liked"
  | "liked-multi"
  | "commented"
  | "followed"
  | "mentioned"
  | "community-event"
  | "community-join"
  | "system";

export interface Notification {
  id: string;
  actor: string;
  actor2?: string;
  kind: NotificationKind;
  line: string;
  preview?: string;
  time: string;
  unread?: boolean;
  withReply?: boolean;
  withFollow?: boolean;
}

export const NOTIFICATIONS_TODAY: Notification[] = [
  {
    id: "n1",
    actor: "Diego Romero",
    kind: "liked",
    line: `liked your post "Office hours moved to Thursday 4pm in Gates B12…"`,
    time: "2m",
    unread: true,
  },
  {
    id: "n2",
    actor: "Priya Patel",
    kind: "commented",
    line: "replied to your post",
    preview: '"Same question — does this also affect section 4?"',
    time: "12m",
    unread: true,
    withReply: true,
  },
  {
    id: "n3",
    actor: "cs-229",
    kind: "community-event",
    line: "new event in your community",
    preview: "Study session tonight at 8 PM in Mitchell 105 — 14 going",
    time: "34m",
    unread: true,
  },
  {
    id: "n4",
    actor: "Lin Park",
    actor2: "and 4 others",
    kind: "liked-multi",
    line: `liked your post "Posters for the spring exhibition…"`,
    time: "1h",
  },
];

export const NOTIFICATIONS_WEEK: Notification[] = [
  {
    id: "n5",
    actor: "Aisha Khan",
    kind: "followed",
    line: "started following you · CS · Stanford '26",
    time: "Yesterday",
    withFollow: true,
  },
  {
    id: "n6",
    actor: "UniVerse",
    kind: "system",
    line: "Your weekly digest is ready: 12 new posts in 6 of your communities",
    time: "Yesterday",
  },
  {
    id: "n7",
    actor: "Jonas Weber",
    kind: "mentioned",
    line: "mentioned you in #cs-229",
    preview: '"@mayac take a look at the dataloader fix"',
    time: "2d",
  },
];

/* ─── Search ────────────────────────────────────────── */
export const SEARCH_PEOPLE: Array<{ user: User; sub: string; followers: string }> = [
  {
    user: {
      id: "u_ng",
      handle: "andrewng",
      name: "Prof. Andrew Ng",
      university: "Stanford",
      verified: true,
    },
    sub: "Course staff · CS 229",
    followers: "48k",
  },
  {
    user: {
      id: "u_marcus",
      handle: "marcuslee",
      name: "Marcus Lee",
      university: "Stanford",
      verified: false,
    },
    sub: "CS · ML reading group",
    followers: "412",
  },
  {
    user: {
      id: "u_diego",
      handle: "diegor",
      name: "Diego Romero",
      university: "UC Berkeley",
      verified: true,
    },
    sub: "EE · ML & systems",
    followers: "1.2k",
  },
];

export const RECENT_SEARCHES = [
  "#cs-229 pset",
  "farm formal",
  "startup club",
  "linear algebra",
  "@diegor",
  "climbing wall hours",
];

/* ─── Profile ───────────────────────────────────────── */
export interface UserProfile {
  user: User & { pronouns?: string; bio?: string; website?: string; location?: string; joined?: string; };
  stats: { posts: number; followers: number; following: number; communities: number; karma: number };
  communities: Community[];
}

export const PROFILE_MAYA: UserProfile = {
  user: {
    ...CURRENT_USER,
    pronouns: "she/her",
    bio:
      "CS @ Stanford '26 · TA for CS 229 · building tiny tools, climbing taller rocks. Always down for coffee at Coupa.",
    website: "maya.dev",
    location: "Palo Alto, CA",
    joined: "September 2024",
  },
  stats: {
    posts: 184,
    followers: 2418,
    following: 312,
    communities: 8,
    karma: 14200,
  },
  communities: COMMUNITIES.slice(0, 5),
};

/* ─── Departments (community explore) ───────────────── */
export const DEPARTMENTS = [
  { dep: "Computer Science", count: 18, sample: ["cs-229", "cs-107", "cs-cogs"] },
  { dep: "Mechanical Engineering", count: 12, sample: ["me-101", "me-coffee", "me-makers"] },
  { dep: "Symbolic Systems", count: 8, sample: ["sym-sys", "sym-readings"] },
  { dep: "Human Biology", count: 7, sample: ["hum-bio", "pre-med-25"] },
];
