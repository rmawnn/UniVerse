# Route Audit — Claude Design Frontend

Generated on 2026-05-24 after replacing the web frontend with the Claude Design output.

## Route Table

| Route | File | Status | Notes |
|---|---|---|---|
| `/login` | `app/(auth)/login/page.tsx` | Complete | Split-screen auth layout, form with fields, SSO buttons, mock data pre-filled |
| `/register` | `app/(auth)/register/page.tsx` | Complete | 3-step stepper, form fields, terms checkbox, responsive |
| `/verify` | `app/(auth)/verify/page.tsx` | Complete | OTP input, timer, resend, stepper, privacy notice |
| `/` | `app/(app)/page.tsx` | Complete | Feed with FeedTabs, ComposerInline, PostCards, right rail widgets (Trending, Suggested, Events) |
| `/communities` | `app/(app)/communities/page.tsx` | Complete | Hero banner, filter chips, joined/discover grids, department list, CommunityCards |
| `/communities/[id]` | `app/(app)/communities/[id]/page.tsx` | Complete | Banner, community header with stats, tabs, inline composer, post feed, moderators widget |
| `/posts/[id]` | `app/(app)/posts/[id]/page.tsx` | Complete | Post detail with expanded PostCard, inline reply composer, threaded replies, community widget |
| `/messages` | `app/(app)/messages/page.tsx` | Complete | Sidebar with conversation list, empty state pane, responsive grid layout |
| `/messages/[id]` | `app/(app)/messages/[id]/page.tsx` | Complete | Full chat UI with message bubbles, typing indicator, composer with attachments, sidebar |
| `/notifications` | `app/(app)/notifications/page.tsx` | Complete | Filter sidebar, grouped notifications (Today/This Week), quiet hours toggle, activity widget |
| `/search` | `app/(app)/search/page.tsx` | Complete | Large search box, tab filters with counts, People/Communities/Posts results, filter toggles |
| `/profile/[username]` | `app/(app)/profile/[username]/page.tsx` | Complete | Banner, avatar, bio, stats grid, tabs, posts feed, communities sidebar, mutual friends widget |
| `/settings` | `app/(app)/settings/page.tsx` | Complete | Sidebar nav with groups, notification settings, quiet hours, email frequency, danger zone |

## Summary

- **Total required routes**: 13 (3 auth + 10 main)
- **Complete**: 13
- **Missing**: 0
- **Broken**: 0

All routes render full mock UI with rich components, responsive design, and dark theme.

## Layout Structure

- `app/layout.tsx` — Root layout with Geist font, dark mode
- `app/(auth)/layout.tsx` — Split-screen auth shell (brand panel + form panel)
- `app/(app)/layout.tsx` — App group with ComposeProvider (future auth guard)

## Component Library

| Component | Path | Purpose |
|---|---|---|
| AppShell | `components/layout/AppShell.tsx` | Main layout with NavRail + TopBar + RightRail |
| NavRail | `components/layout/NavRail.tsx` | Left sidebar navigation |
| TopBar | `components/layout/TopBar.tsx` | Breadcrumb + title header bar |
| RightRail | `components/layout/RightRail.tsx` | Right sidebar widget container |
| PostCard | `components/post/PostCard.tsx` | Post display with actions |
| ComposerInline | `components/post/ComposerInline.tsx` | Inline post composer |
| ComposeModal | `components/post/ComposeModal.tsx` | Modal post composer |
| ComposeFab | `components/post/ComposeFab.tsx` | Floating action button for compose |
| CommunityCard | `components/community/CommunityCard.tsx` | Community preview card |
| CommunityIcon | `components/community/CommunityIcon.tsx` | Gradient community icon |
| Avatar | `components/ui/Avatar.tsx` | User avatar with initials |
| Button | `components/ui/Button.tsx` | Button variants |
| Card | `components/ui/Card.tsx` | Container card |
| Field | `components/ui/Field.tsx` | Form input field |
| Switch | `components/ui/Switch.tsx` | Toggle switch |
| Segmented | `components/ui/Segmented.tsx` | Segmented control |
| TrendingWidget | `components/widgets/TrendingWidget.tsx` | Trending topics sidebar |
| SuggestedCommunities | `components/widgets/SuggestedCommunities.tsx` | Community suggestions |
| CampusEventsWidget | `components/widgets/CampusEventsWidget.tsx` | Campus events sidebar |
