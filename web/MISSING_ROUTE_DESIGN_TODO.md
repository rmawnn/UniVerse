# UniVerse Web — Missing Routes & Design TODO

> Generated: 2026-05-29
> Based on: ROUTE_DESIGN_AUDIT.md

---

## 1. Missing Routes

| Route | Linked From | Backend Ready? | Notes |
|---|---|---|---|
| `/bookmarks` | NavRail (line 40) | Likely (saved posts endpoints exist) | Users clicking "Bookmarks" in nav get a 404 |
| `/explore` | NavRail "Explore" links to `/communities` | Backend has trending/explore endpoints | Currently just a duplicate of Communities link |
| `/jobs` | Not linked in current nav | Backend has job listings endpoints | Lower priority unless jobs feature is planned |
| `/jobs/[id]` | Not linked | Backend has job detail endpoint | Depends on `/jobs` |
| `/admin` | Not linked | Backend has full admin routes | Admin panel for moderation, would need role check |

---

## 2. Broken / Non-Functional Routes

| Route | Issue | Fix Required |
|---|---|---|
| `/verify` | Completely static mockup — hardcoded email `maya.chen@stanford.edu`, OTP "928", timer "9:42", no button handler, no backend calls | Convert to client component, connect to verification API, accept email from auth flow |

---

## 3. Routes Needing Design Polish

| Route | Issue | Scope |
|---|---|---|
| `/settings` | 11 of 15 nav sections are disabled stubs (username, email, privacy, blocked, language, accessibility, feed prefs, communities, sessions, data export, developer) | Either implement missing sections or remove them from the nav to avoid dead UI |

---

## 4. Components with Old/Mock Data (Not Routes, but Critical)

| Component | File | Issue |
|---|---|---|
| **NavRail** | `components/layout/NavRail.tsx` | Shows "Maya Chen" / "@mayac" / "Stanford" for all users; profile link hardcoded to `/profile/mayac`; pinned communities from mock data; badge counts hardcoded |
| **TopBar** | `components/layout/TopBar.tsx` | Avatar always shows "Maya Chen"; search/notification/messages buttons have no handlers |
| **ComposeModal** | `components/post/ComposeModal.tsx` | Submit is a fake 600ms delay with no API call; community picker uses mock data; avatar uses mock user |
| **ComposerInline** | `components/post/ComposerInline.tsx` | Avatar uses mock user |
| **TrendingWidget** | `components/widgets/TrendingWidget.tsx` | Renders hardcoded trending topics |
| **SuggestedCommunities** | `components/widgets/SuggestedCommunities.tsx` | Renders mock communities; "Join" button has no handler |
| **CampusEventsWidget** | `components/widgets/CampusEventsWidget.tsx` | Renders hardcoded events |

---

## 5. Missing Next.js Infrastructure

| File | Why It Matters |
|---|---|
| `app/error.tsx` | Global error boundary — prevents white screen on unhandled errors |
| `app/(app)/error.tsx` | Authenticated section error boundary |
| `app/not-found.tsx` | Branded 404 page instead of Next.js default |
| `middleware.ts` | Edge-level auth redirect — prevents serving protected page JS to unauthenticated users |

---

## 6. Recommended Order of Completion

### Phase A: Fix Critical Mock Data (highest impact, affects every page)

**Priority: Critical — every logged-in user sees wrong data**

1. **NavRail** — Replace `CURRENT_USER` with `useAuthStore` user; replace hardcoded `/profile/mayac` with dynamic `/profile/${user.username}`; replace mock pinned communities with user's joined communities from API; replace hardcoded badge counts with real unread counts (or 0); remove or differentiate the duplicate Explore/Communities link; fix or remove `/bookmarks` link
2. **TopBar** — Replace `CURRENT_USER` with auth store user for avatar; wire search button to navigate to `/search`; wire notification/messages icons to their routes
3. **ComposeModal** — Replace mock submit with real `createPost()` mutation; replace mock community picker with user's joined communities; replace mock user with auth store user
4. **ComposerInline** — Replace mock user avatar with auth store user

### Phase B: Fix Broken Route

**Priority: Critical — page exists but doesn't work**

5. **`/verify`** — Convert to client component; accept email from registration flow or URL params; connect to verification API endpoints; implement OTP input with real submission; add resend code functionality

### Phase C: Add Infrastructure Files

**Priority: High — prevents crashes and improves UX**

6. **`app/error.tsx`** — Global error boundary with retry button
7. **`app/(app)/error.tsx`** — Authenticated error boundary
8. **`app/not-found.tsx`** — Branded 404 page
9. **`middleware.ts`** — Auth check redirecting unauthenticated users from `(app)` routes to `/login`

### Phase D: Connect Remaining Widgets

**Priority: Medium — right rail shows fake data**

10. **TrendingWidget** — Connect to trending/explore API
11. **SuggestedCommunities** — Connect to community search/recommendations API; wire Join button
12. **CampusEventsWidget** — Connect to events API or hide if no backend support

### Phase E: Add Missing Routes

**Priority: Medium to Low**

13. **`/bookmarks`** — Saved posts page (if backend supports it)
14. **`/explore`** — Dedicated explore/discover page distinct from communities list
15. **Settings sections** — Implement remaining settings sections or remove disabled stubs
16. **`/jobs`** and **`/jobs/[id]`** — Job listings (if feature is planned)
17. **`/admin`** — Admin panel (if needed for web, backend has routes)

### Phase F: Clean Up Dead Links

**Priority: Low**

18. Replace `href="#"` links with real destinations or remove them:
    - "Forgot password?" → implement or link to support
    - "Terms" / "Privacy Policy" → create pages or link to external docs
    - FooterLinks → create pages or link to external URLs
    - "Need help?" → link to support/FAQ

---

## 7. Suggested Next Prompt

For fixing the most impactful issues (Phase A + B + C), use this prompt:

```
Fix all hardcoded mock data in the UniVerse web frontend navigation and compose components.

Tasks:

1. NavRail (components/layout/NavRail.tsx):
   - Replace CURRENT_USER import with useAuthStore user
   - Profile link: /profile/${user.username} instead of /profile/mayac
   - Pinned communities: fetch from getJoinedCommunities() or user's communities
   - Badge counts: set to 0 (or wire to API if unread count endpoints exist)
   - Remove /bookmarks link (page doesn't exist)
   - Change "Explore" to link somewhere distinct or remove duplicate

2. TopBar (components/layout/TopBar.tsx):
   - Replace CURRENT_USER with useAuthStore user
   - Wire search button to router.push("/search")
   - Wire notification icon to href="/notifications"
   - Wire messages icon to href="/messages"

3. ComposeModal (components/post/ComposeModal.tsx):
   - Replace mock submit with createPost() API mutation
   - Replace mock COMMUNITIES with user's joined communities
   - Replace CURRENT_USER with auth store user

4. ComposerInline (components/post/ComposerInline.tsx):
   - Replace CURRENT_USER with auth store user

5. Add error boundaries:
   - app/error.tsx
   - app/(app)/error.tsx
   - app/not-found.tsx

6. Add middleware.ts for auth redirect

Keep all existing visual design. Do NOT redesign UI.
Ensure npm run build passes and TypeScript is clean.
```
