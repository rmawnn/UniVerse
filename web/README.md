# UniVerse Web — Next.js implementation

The web frontend for UniVerse, built on Next.js App Router + TypeScript + Tailwind. This drop adds **all 13 page routes** (auth + main) on top of the existing App Shell + Feed.

## Quick start

```bash
pnpm install        # or npm/yarn
pnpm dev            # http://localhost:3000
```

Requires Node 18.17+. The Geist font is loaded via the `geist` package — no `next/font/google` calls needed.

## Routes

### Auth (`(auth)` group — split-screen brand layout)

| Route | Page |
|---|---|
| `/login` | Sign in |
| `/register` | Create account (step 1/3 with stepper) |
| `/verify` | Email OTP verification (step 2/3) |

### Main app (`(app)` group — NavRail + TopBar + RightRail shell)

| Route | Page |
|---|---|
| `/` | Feed (For You) |
| `/communities` | Communities explore + hero + departments |
| `/communities/[id]` | Community detail (banner, tabs, posts) |
| `/posts/[id]` | Post detail with reply thread |
| `/messages` | Inbox (sidebar + empty pane) |
| `/messages/[id]` | Active conversation |
| `/notifications` | Inbox-style with filter sidebar |
| `/search` | Tabbed results (People, Communities, Posts) |
| `/profile/[username]` | User profile (banner, stats, tabs) |
| `/settings` | Settings · Notifications tab + quiet hours |

## File map

```
next-app/
├── app/
│   ├── layout.tsx                 ★ root · Geist fonts · dark mode
│   ├── globals.css                ★ design tokens (CSS vars)
│   ├── (auth)/
│   │   ├── layout.tsx             split-screen + brand panel
│   │   ├── login/page.tsx
│   │   ├── register/page.tsx
│   │   └── verify/page.tsx
│   └── (app)/
│       ├── layout.tsx             pass-through (auth guard later)
│       ├── page.tsx               feed (existing)
│       ├── communities/{page,[id]/page}.tsx
│       ├── posts/[id]/page.tsx
│       ├── messages/{page,[id]/page}.tsx
│       ├── notifications/page.tsx
│       ├── search/page.tsx
│       ├── profile/[username]/page.tsx
│       └── settings/page.tsx
├── components/
│   ├── ui/                        Avatar · AvatarStack · Button · Card · Chip
│   │                              Field · OtpInput · PlaceholderImage
│   │                              SectionHead · Segmented · Switch
│   │                              UVMark · UniBadge
│   ├── layout/                    AppShell · NavRail · TopBar · RightRail
│   ├── post/                      PostCard · PostActions · PollWidget
│   │                              ComposerInline · FeedTabs
│   ├── community/                 CommunityCard · CommunityIcon · CommunityRow
│   ├── chat/                      MessagesSidebar · ConversationRow
│   │                              MessageBubble · TypingDots
│   ├── notifications/             NotificationRow
│   ├── profile/                   ProfileStat
│   └── widgets/                   TrendingWidget · SuggestedCommunities
│                                  CampusEventsWidget · WidgetCard · FooterLinks
└── lib/
    ├── types.ts                   API-shaped domain types
    ├── mock-data.ts               feed posts · communities · widgets
    ├── mock-data-extra.ts         conversations · notifications · search · profile
    └── utils.ts                   cn() · avatarTheme() · compactNumber()
```

## Issues fixed during this milestone

1. **Existing NavRail + PostCard links pointed at old route names** (`/c/...`, `/u/...`, `/p/...`). Updated to `/communities/...`, `/profile/...`, `/posts/...` so the new routes resolve and active-state highlighting works.
2. **`h-4.5` / `w-4.5` not in default Tailwind scale.** Extended `theme.spacing` with `"4.5": "1.125rem"` so 18px icons work without arbitrary values.
3. **`lucide-react` import — `Verified` renamed.** Switched to `BadgeCheck` (the canonical export) in Settings.
4. **MessagesSidebar was inlined inside the index page** and imported into `[id]`. Moved to its own component file so both routes can share it cleanly.
5. **PostCard had two `Avatar` imports.** De-duplicated.
6. **`NotificationRow` typed an icon as `typeof Heart`.** Replaced with `LucideIcon` so any icon component is accepted.

## Conventions

- **Server components by default.** Only `"use client"` when state genuinely requires it (NavRail, Chip, ComposerInline, FeedTabs, PostActions, Switch, Segmented, OtpInput, TopBar).
- **No bare hex values in JSX.** Token utilities (`bg-bg-2`, `text-fg-3`, `border-line-1`) or `var(--…)` only.
- **`cn()` for class composition.** Wraps `clsx + tailwind-merge` so later classes always win conflicts.
- **Mock data only.** Every page imports from `lib/mock-data.ts` or `lib/mock-data-extra.ts`. Backend integration replaces these with React Query hooks in M3.

## What's next

1. Mount `QueryClientProvider` in `app/(app)/layout.tsx`.
2. Replace `SAMPLE_POSTS` with `useInfiniteQuery(['feed','for-you'])`.
3. Add `lib/api/client.ts` (fetch wrapper + JWT refresh interceptor).
4. Add Zustand auth store + route guard in `(app)/layout.tsx`.
5. Build the `(.)new` intercepted route for the composer modal.
