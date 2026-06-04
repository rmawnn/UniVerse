# UniVerse Web Frontend — Route & Design Audit

> Generated: 2026-05-29
> Scope: All routes, navigation links, design consistency, backend integration
> Status: AUDIT ONLY — no code changes made

---

## Route Status Table

| Route | File Path | Exists? | Design Status | Backend Status | Issues | Priority |
|---|---|---|---|---|---|---|
| `/login` | `app/(auth)/login/page.tsx` | Yes | Complete | Integrated | Placeholder `you@stanford.edu`; "Forgot password?" is `href="#"` | Low |
| `/register` | `app/(auth)/register/page.tsx` | Yes | Complete | Integrated | Placeholders "Maya", "Chen", "mayac", `you@stanford.edu`; Terms/Privacy are `href="#"` | Low |
| `/verify` | `app/(auth)/verify/page.tsx` | Yes | Broken | Mock only | Hardcoded `maya.chen@stanford.edu`, OTP "928", timer "9:42"; button has no handler; completely non-functional | Critical |
| `/` (feed) | `app/(app)/page.tsx` | Yes | Complete | Integrated | None | — |
| `/communities` | `app/(app)/communities/page.tsx` | Yes | Complete | Integrated | None | — |
| `/communities/[id]` | `app/(app)/communities/[id]/page.tsx` | Yes | Complete | Integrated | None | — |
| `/posts/[id]` | `app/(app)/posts/[id]/page.tsx` | Yes | Complete | Integrated | None | — |
| `/messages` | `app/(app)/messages/page.tsx` | Yes | Complete | Integrated | None | — |
| `/messages/[id]` | `app/(app)/messages/[id]/page.tsx` | Yes | Complete | Integrated | None | — |
| `/notifications` | `app/(app)/notifications/page.tsx` | Yes | Complete | Integrated | None | — |
| `/search` | `app/(app)/search/page.tsx` | Yes | Complete | Integrated | None | — |
| `/profile/[username]` | `app/(app)/profile/[username]/page.tsx` | Yes | Complete | Integrated | None | — |
| `/settings` | `app/(app)/settings/page.tsx` | Yes | Needs polish | Integrated | 11 of 15 settings sections are disabled stubs (username, email, privacy, blocked, etc.) | Medium |
| `/bookmarks` | — | **No** | Missing | — | NavRail links here (line 40) but no page exists; users get 404 | High |
| `/explore` | — | **No** | Missing | — | NavRail "Explore" just links to `/communities` as duplicate; no standalone explore page | Medium |
| `/jobs` | — | **No** | Missing | — | No page exists, not linked in current nav | Low |
| `/jobs/[id]` | — | **No** | Missing | — | No page exists | Low |
| `/admin` | — | **No** | Missing | — | No page exists; backend has admin routes | Low |

---

## Navigation Components Status

| Component | File Path | Design Status | Backend Status | Issues | Priority |
|---|---|---|---|---|---|
| NavRail | `components/layout/NavRail.tsx` | Complete | **Mock only** | Hardcoded "Maya Chen" / "@mayac" / "Stanford"; profile link hardcoded to `/profile/mayac`; pinned communities from mock data; badge counts hardcoded (Messages=4, Notifications=12); `/bookmarks` link broken; "Explore" duplicates "Communities" | **Critical** |
| TopBar | `components/layout/TopBar.tsx` | Complete | **Mock only** | Avatar uses `CURRENT_USER.name` (always "Maya Chen"); search button has no handler; notification/messages buttons have no onClick or href | **Critical** |
| AppShell | `components/layout/AppShell.tsx` | Complete | Not needed | Container only — no issues | — |
| RightRail | `components/layout/RightRail.tsx` | Complete | Not needed | Container only — no issues | — |

---

## Widget Components Status

| Widget | File Path | Design Status | Backend Status | Issues | Priority |
|---|---|---|---|---|---|
| TrendingWidget | `components/widgets/TrendingWidget.tsx` | Complete | Mock only | Renders hardcoded `TRENDING` array | Medium |
| SuggestedCommunities | `components/widgets/SuggestedCommunities.tsx` | Complete | Mock only | Renders mock data; "Join" button has no onClick | Medium |
| CampusEventsWidget | `components/widgets/CampusEventsWidget.tsx` | Complete | Mock only | Renders hardcoded `CAMPUS_EVENTS` | Medium |
| FooterLinks | `components/widgets/FooterLinks.tsx` | Complete | Not needed | All 8 links use `href="#"` | Low |
| WidgetCard | `components/widgets/WidgetCard.tsx` | Complete | Not needed | Shared wrapper — no issues | — |

---

## Compose Components Status

| Component | File Path | Design Status | Backend Status | Issues | Priority |
|---|---|---|---|---|---|
| ComposeModal | `components/post/ComposeModal.tsx` | Complete | **Mock only** | Uses `CURRENT_USER` for avatar; community picker uses mock `COMMUNITIES`; submit fakes 600ms delay with no API call; TODO comment says "replace with React Query mutation in M3" | **High** |
| ComposerInline | `components/post/ComposerInline.tsx` | Complete | **Mock only** | Uses `CURRENT_USER` for avatar; "Post" button has no submit handler; delegates to ComposeModal | **High** |

---

## Missing Next.js Infrastructure Files

| File | Level | Impact |
|---|---|---|
| `error.tsx` | None exist at any level | Unhandled errors show raw Next.js error page — no recovery UI |
| `loading.tsx` | None exist at any level | No route-level Suspense boundaries (pages handle loading internally) |
| `not-found.tsx` | None exist at any level | Missing routes show default Next.js 404 — no branded page |
| `middleware.ts` | Root level | No edge-level auth protection; all auth is client-side via AuthGuard |

---

## Broken & Dead Links

### Broken Links (point to non-existent routes)

| Link | Source File | Line | Severity |
|---|---|---|---|
| `/bookmarks` | `NavRail.tsx` | 40 | **High** — primary nav item |
| `/profile/mayac` | `NavRail.tsx` | 41 | **High** — hardcoded mock user, should use real user |

### Dead Links (href="#")

| Link Text | Source File | Line |
|---|---|---|
| "Forgot password?" | `login/page.tsx` | 101 |
| "Need help?" | `(auth)/layout.tsx` | 75 |
| "Terms" | `register/page.tsx` | 190 |
| "Privacy Policy" | `register/page.tsx` | 194 |
| "About" | `FooterLinks.tsx` | 19 |
| "Terms" | `FooterLinks.tsx` | 19 |
| "Privacy" | `FooterLinks.tsx` | 19 |
| "Cookies" | `FooterLinks.tsx` | 19 |
| "Accessibility" | `FooterLinks.tsx` | 19 |
| "Verification" | `FooterLinks.tsx` | 19 |
| "Help" | `FooterLinks.tsx` | 19 |
| "Status" | `FooterLinks.tsx` | 19 |

---

## Hardcoded Mock Data Locations

| File | What's Hardcoded | Line(s) |
|---|---|---|
| `NavRail.tsx` | User name "Maya Chen", handle "@mayac", university "Stanford", profile link `/profile/mayac`, pinned communities, badge counts 4 and 12 | 22, 41, 44, 69, 107, 119-125, 38-39 |
| `TopBar.tsx` | Avatar name from `CURRENT_USER` ("Maya Chen") | 5, 75 |
| `ComposeModal.tsx` | User name/avatar from `CURRENT_USER`, community list from mock `COMMUNITIES` | 19, 34, 45-48 |
| `ComposerInline.tsx` | Avatar from `CURRENT_USER` | 9, 48 |
| `TrendingWidget.tsx` | Trending topics from `TRENDING` | import |
| `SuggestedCommunities.tsx` | Communities from `SUGGESTED_COMMUNITIES` | import |
| `CampusEventsWidget.tsx` | Events from `CAMPUS_EVENTS` | import |
| `verify/page.tsx` | Email `maya.chen@stanford.edu`, OTP "928", timer "9:42" | 72, 77, 82 |
| `login/page.tsx` | Placeholder `you@stanford.edu` | 62 |
| `register/page.tsx` | Placeholders "Maya", "Chen", "mayac", `you@stanford.edu` | 121, 129, 139, 149 |

---

## Design System Compliance

All existing pages consistently use the UniVerse dark design system tokens from `globals.css`:

- Backgrounds: `bg-bg-1`, `bg-bg-2`, `bg-bg-3`, `bg-bg-4`
- Text: `text-fg-1`, `text-fg-2`, `text-fg-3`, `text-fg-4`
- Borders: `border-line-1`, `border-line-2`, `border-line-3`
- Accents: `bg-acc-gradient`, `text-brand-purple`, `text-brand-blue`, `shadow-acc`
- Semantic: `text-danger`, `text-success`, `text-verified`
- Forced dark: `color-scheme: dark` on `:root`

No page uses old/basic design. All pages that exist are styled with the current design system.

---

## Summary Statistics

| Metric | Count |
|---|---|
| Total routes found (existing) | 15 |
| Routes fully complete (design + backend) | 11 |
| Routes needing design polish | 1 (`/settings`) |
| Routes broken/non-functional | 1 (`/verify`) |
| Routes missing entirely | 5 (`/bookmarks`, `/explore`, `/jobs`, `/jobs/[id]`, `/admin`) |
| Routes still mock-only | 0 pages (but 7 components remain mock) |
| Navigation links to missing pages | 2 (`/bookmarks`, `/profile/mayac`) |
| Dead `href="#"` links | 12 |
| Components with hardcoded mock user data | 4 (NavRail, TopBar, ComposeModal, ComposerInline) |
| Widgets with mock data (no API) | 3 (Trending, Suggested, Events) |
