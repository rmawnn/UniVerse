import type {
  CampusEvent,
  Community,
  Post,
  TrendingTopic,
  User,
} from "./types";

/* ─── Users ─────────────────────────────────────────── */
export const CURRENT_USER: User = {
  id: "u_maya",
  handle: "mayac",
  name: "Maya Chen",
  university: "Stanford",
  verified: true,
  isOnline: true,
};

const USERS: Record<string, User> = {
  maya: CURRENT_USER,
  diego: {
    id: "u_diego",
    handle: "diegor",
    name: "Diego Romero",
    university: "UC Berkeley",
    verified: true,
    isOnline: true,
  },
  priya: {
    id: "u_priya",
    handle: "priya.codes",
    name: "Priya Patel",
    university: "MIT",
    verified: true,
  },
  jonas: {
    id: "u_jonas",
    handle: "jw",
    name: "Jonas Weber",
    university: "TU Munich",
    verified: true,
  },
  lin: {
    id: "u_lin",
    handle: "linpark",
    name: "Lin Park",
    university: "KAIST",
    verified: true,
    isOnline: true,
  },
};

/* ─── Communities ───────────────────────────────────── */
export const COMMUNITIES: Community[] = [
  {
    id: "c_cs229",
    slug: "cs-229",
    name: "CS 229",
    description: "Machine Learning · Stanford CS",
    members: 4217,
    online: 412,
    emoji: "🧠",
    hue: ["#9B6CFF", "#5C8FFF"],
    joined: true,
    trending: true,
  },
  {
    id: "c_dorm",
    slug: "dorm-life",
    name: "Dorm Life",
    description: "Campus housing",
    members: 12800,
    online: 1102,
    emoji: "🛏",
    hue: ["#FF8DA1", "#FF6FB1"],
    joined: true,
  },
  {
    id: "c_startup",
    slug: "startup-club",
    name: "Startup Club",
    description: "Founders & builders",
    members: 2104,
    online: 213,
    emoji: "🚀",
    hue: ["#5AE0B6", "#34A8FF"],
    trending: true,
  },
  {
    id: "c_eats",
    slug: "late-night-eats",
    name: "Late-night eats",
    description: "2am food drops",
    members: 5612,
    online: 522,
    emoji: "🍜",
    hue: ["#FFB547", "#FF6A6A"],
    joined: true,
  },
  {
    id: "c_climbing",
    slug: "climbing",
    name: "Climbing crew",
    description: "Boulder & sport",
    members: 780,
    online: 64,
    emoji: "🧗",
    hue: ["#7CC7FF", "#5C8FFF"],
  },
  {
    id: "c_design",
    slug: "design",
    name: "Design @ Stanford",
    description: "Visual & product",
    members: 1604,
    online: 154,
    emoji: "🎨",
    hue: ["#C7A0FF", "#7CC7FF"],
  },
];

/* ─── Posts ─────────────────────────────────────────── */
export const SAMPLE_POSTS: Post[] = [
  {
    id: "p1",
    author: USERS.maya,
    community: { slug: "cs-229", name: "cs-229" },
    createdAt: "2026-05-22T09:12:00Z",
    relativeTime: "12m",
    text:
      "Office hours this week moved to Thursday 4pm in Gates B12 ✏️ For the problem set: hint, you don't actually need to compute the full Hessian. Save yourself an afternoon.",
    counts: { likes: 142, comments: 28, reposts: 7, views: 2400 },
    pinned: true,
  },
  {
    id: "p2",
    author: USERS.diego,
    community: { slug: "dorm-life", name: "dorm-life" },
    createdAt: "2026-05-22T08:50:00Z",
    relativeTime: "34m",
    text:
      "Foothill 2 is finally getting AC. Two years of summer suffering, lifted in a single email.",
    media: {
      kind: "image",
      label: "photo · email screenshot",
      accent: "linear-gradient(135deg, #2A1F4A, #1A1530)",
    },
    counts: { likes: 891, comments: 134, reposts: 42, views: 18200 },
    liked: true,
  },
  {
    id: "p3",
    author: USERS.priya,
    community: { slug: "startup-club", name: "startup-club" },
    createdAt: "2026-05-22T08:24:00Z",
    relativeTime: "1h",
    text:
      'Hot take: most "AI for X" projects at hackathons are basically a system prompt and a Tailwind UI. Real moat is whether you can keep the lights on past Sunday demo.',
    poll: {
      options: [
        { label: "Spicy but true", pct: 64 },
        { label: "Disagree, distribution wins", pct: 24 },
        { label: "Just here for the swag", pct: 12 },
      ],
      voters: 1240,
      closesAt: "2026-05-22T12:24:00Z",
    },
    counts: { likes: 432, comments: 89, reposts: 21, views: 9100 },
  },
  {
    id: "p4",
    author: USERS.jonas,
    community: { slug: "late-night-eats", name: "late-night-eats" },
    createdAt: "2026-05-22T07:30:00Z",
    relativeTime: "2h",
    text:
      "Where is everyone going for late food after the library closes at midnight? Asking for a chemistry major in crisis.",
    counts: { likes: 76, comments: 41, reposts: 2, views: 1820 },
  },
  {
    id: "p5",
    author: USERS.lin,
    community: { slug: "design", name: "design" },
    createdAt: "2026-05-22T06:00:00Z",
    relativeTime: "3h",
    text:
      "Posters for the spring exhibition are up at the SoM. Drop by if you're around — yes, there will be free coffee.",
    media: {
      kind: "image",
      label: "poster mockup",
      accent: "linear-gradient(135deg, #3a2a1a, #1f1a14)",
    },
    counts: { likes: 218, comments: 31, reposts: 9, views: 4400 },
  },
];

/* ─── Widgets ───────────────────────────────────────── */
export const TRENDING: TrendingTopic[] = [
  { tag: "#thesis-deadline", posts: 312, hot: true },
  { tag: "#cs-229-pset3", posts: 184 },
  { tag: "#farm-formal", posts: 96 },
  { tag: "#tree-tour", posts: 72 },
];

export const SUGGESTED_COMMUNITIES = COMMUNITIES.filter((c) => !c.joined).slice(
  0,
  3
);

export const CAMPUS_EVENTS: CampusEvent[] = [
  {
    id: "e1",
    day: "TUE",
    date: "14",
    title: "CS 229 study session",
    when: "8:00 PM",
    where: "Mitchell 105",
  },
  {
    id: "e2",
    day: "FRI",
    date: "17",
    title: "Scaling laws — guest lecture",
    when: "4:30 PM",
    where: "Gates B01",
  },
  {
    id: "e3",
    day: "SAT",
    date: "18",
    title: "Spring exhibition opening",
    when: "7:00 PM",
    where: "SoM Gallery",
  },
];

export const ONLINE_FRIENDS: Array<{ user: User; status: string }> = [
  { user: USERS.diego, status: "in #cs-229" },
  { user: USERS.priya, status: "in #startup-club" },
  { user: USERS.lin, status: "in #design" },
];
