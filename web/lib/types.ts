/**
 * Shared domain types — mirror the FastAPI response shapes
 * documented in the implementation plan.
 */

export interface User {
  id: string;
  handle: string;
  name: string;
  university: string;
  verified: boolean;
  avatarUrl?: string;
  isOnline?: boolean;
}

export interface Community {
  id: string;
  slug: string;
  name: string;
  description: string;
  members: number;
  online?: number;
  emoji: string;
  /** Two color stops for the icon gradient */
  hue: [string, string];
  trending?: boolean;
  joined?: boolean;
}

export interface PostMedia {
  kind: "image";
  label: string;
  /** Optional gradient string used as a placeholder background */
  accent?: string;
}

export interface PollOption {
  label: string;
  pct: number;
}

export interface Poll {
  options: PollOption[];
  voters: number;
  closesAt: string;
}

export interface Post {
  id: string;
  author: User;
  community: { slug: string; name: string };
  /** ISO timestamp */
  createdAt: string;
  /** Pretty short form, e.g. "12m" */
  relativeTime: string;
  text: string;
  media?: PostMedia;
  poll?: Poll;
  counts: {
    likes: number;
    comments: number;
    reposts: number;
    views: number;
  };
  liked?: boolean;
  pinned?: boolean;
}

export interface TrendingTopic {
  tag: string;
  posts: number;
  hot?: boolean;
}

export interface CampusEvent {
  id: string;
  title: string;
  when: string;
  where: string;
  day: string;
  date: string;
}
