# TODO for Claude Design — Next Iteration

## Missing Pages

None — all 13 required routes are present and render mock UI.

## Pages Needing Enhancement

### `/bookmarks`
- **Status**: Not yet a page — NavRail links to `/bookmarks` but no route exists
- **Action**: Create `app/(app)/bookmarks/page.tsx` with saved posts list

### `/explore`
- **Status**: No dedicated explore/discover page — communities page doubles as explore
- **Action**: Consider adding a dedicated explore page with trending posts, communities, and jobs

### `/jobs`
- **Status**: No jobs listing or detail pages
- **Action**: Create `app/(app)/jobs/page.tsx` (listings) and `app/(app)/jobs/[id]/page.tsx` (detail)

### `/admin`
- **Status**: No admin dashboard
- **Action**: Create admin pages for platform management (lower priority — admin users only)

## Components Needing Better Design

### Feed Tabs
- Currently static — need active state toggle for "For You" / "Following" / "Trending"
- Consider adding animation on tab switch

### Post Composer
- Modal composer (`ComposeModal`) should support community selection dropdown
- Image upload preview area needed
- Poll creation UI needed (PollWidget exists for display only)

### Community Detail
- Pinned posts section
- Member list / search
- Community rules panel

### Profile Page
- Media grid tab content (currently shows Posts only)
- Replies tab, Likes tab, Communities tab — all need distinct content

### Messages
- Group chat UI variant
- Image/file preview in chat
- Message reactions
- Read receipts indicator

## Mobile Responsiveness Issues

### NavRail
- On mobile (< 640px), the NavRail collapses to icon-only but could benefit from a bottom tab bar pattern instead
- No hamburger menu or drawer for mobile

### Community Detail Banner
- Banner + header overlap looks tight on small screens
- CTA buttons could stack on mobile

### Search Page
- Filter tabs wrap awkwardly on narrow screens
- Right rail filters should collapse to a dropdown on mobile

### Messages
- Sidebar + chat pane grid needs mobile-first approach (show sidebar by default, push to chat on select)

### Settings
- Sidebar nav should be collapsible or use a sheet/drawer on mobile

## Routes Needing Future Backend Integration

| Route | Backend Endpoint(s) Needed |
|---|---|
| `/login` | `POST /auth/login` |
| `/register` | `POST /auth/register` |
| `/verify` | `POST /auth/verify` |
| `/` | `GET /feed` (paginated, with tab filter) |
| `/communities` | `GET /communities`, `GET /explore/communities` |
| `/communities/[id]` | `GET /communities/:id`, `GET /communities/:id/posts` |
| `/posts/[id]` | `GET /posts/:id`, `GET /posts/:id/comments` |
| `/messages` | `GET /conversations` (WebSocket for real-time) |
| `/messages/[id]` | `GET /conversations/:id/messages` (WebSocket) |
| `/notifications` | `GET /notifications` (WebSocket for real-time) |
| `/search` | `GET /search?q=...` |
| `/profile/[username]` | `GET /users/:username` |
| `/settings` | `GET /users/me/settings`, `PATCH /users/me/settings` |

## General Notes

- All pages currently use mock data from `lib/mock-data.ts` and `lib/mock-data-extra.ts`
- Dark theme only — no light mode variant designed yet
- Design system uses CSS custom properties in `globals.css` for easy theming
- Tailwind config maps to CSS variables for consistent token usage
- `geist` font is used for both sans and mono typography
- `lucide-react` for all icons
- `clsx` + `tailwind-merge` for className composition
