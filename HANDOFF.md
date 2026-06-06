# UniVerse — Project Handoff & Mac Setup Guide

---

## 1. Project Overview

### What is UniVerse?

UniVerse is a **student-only university social ecosystem platform**. It combines social networking, communities, real-time messaging, a job board, and student verification into a single product — built exclusively for verified university students.

### What problem does it solve?

University students lack a dedicated digital space that is:
- **Verified** — only real students can participate (no spam, no fake accounts)
- **Campus-centric** — content is organized around universities, departments, and student communities
- **All-in-one** — instead of juggling WhatsApp groups, LinkedIn, Reddit, and bulletin boards, students get feed, messaging, jobs, and communities in one platform

### Who is it for?

University students worldwide, with strong support for Turkish universities (`.edu.tr`, `stu.*`, `ogr.*` patterns). Admins and moderators manage the platform.

### Main product idea

A gated social platform where:
1. Students register with their university email
2. Verify their identity via email OTP + student document upload
3. Once verified, they access the full platform: feed, communities, messaging, jobs, explore, notifications
4. A verified badge appears across the platform for trusted members
5. Admins manage users, verifications, reports, and moderation from a dashboard

### Core Feature Areas

| Area | Description |
|------|-------------|
| **Social Networking** | Feed, posts (text/image/short video), likes, comments, follow system |
| **Communities** | University-based groups, join/leave, community posts, member management |
| **Messaging** | 1-to-1 DM conversations, real-time via WebSocket, typing indicators |
| **Verification** | Email OTP verification + student document upload with AI/OCR validation |
| **Job Board** | Job/internship listings, applications with CV upload, employer management |
| **Admin/Moderation** | Dashboard with stats, user management, verification queue, report handling |
| **Search & Explore** | Unified search across users/communities/posts/jobs, trending content |
| **Stories** | 24-hour ephemeral stories |
| **Bookmarks** | Save posts to flat list or organized collections |
| **Notifications** | In-app notifications with real-time push via WebSocket |

---

## 2. Tech Stack

### Backend

| Technology | Purpose |
|------------|---------|
| **FastAPI** | Web framework (async, OpenAPI docs at `/docs`) |
| **SQLAlchemy 2.0** | Async ORM with `asyncpg` driver |
| **Alembic** | Database migrations |
| **PostgreSQL** | Primary database (local, Docker, or Supabase-hosted) |
| **JWT (python-jose)** | Access + refresh token authentication |
| **Passlib + bcrypt** | Password hashing |
| **WebSocket** | Real-time messaging, typing indicators, presence |
| **httpx** | HTTP client for Supabase Storage API calls |
| **Pydantic v2** | Request/response validation and settings management |
| **Python 3.11+** | Runtime (Dockerfile uses 3.12) |

### Web Frontend

| Technology | Purpose |
|------------|---------|
| **Next.js 14** | React framework with App Router |
| **React 18** | UI library |
| **TypeScript** | Type safety |
| **Tailwind CSS 3** | Utility-first styling |
| **React Query (TanStack v5)** | Server state management, caching, pagination |
| **Zustand** | Client state (auth store with token management) |
| **Axios** | HTTP client with interceptors for JWT refresh |
| **Supabase JS** | Client-side file uploads and Realtime subscriptions |
| **Lucide React** | Icon library |
| **Geist** | Font family |

### Mobile App (Expo React Native)

| Technology | Purpose |
|------------|---------|
| **Expo SDK 52** | React Native framework |
| **React Native 0.76** | Mobile UI |
| **React Navigation 7** | Navigation (bottom tabs + stack navigators) |
| **React Query (TanStack v5)** | Server state management |
| **Zustand** | Auth state with AsyncStorage persistence |
| **Axios** | HTTP client |
| **TypeScript** | Type safety |

### Database & Storage

| Technology | Purpose |
|------------|---------|
| **PostgreSQL 16** | Relational database (local or Supabase) |
| **Supabase Storage** | File storage (avatars, posts, verification docs, CVs) |
| **Supabase Realtime** | Presence broadcasting (optional) |
| **Docker Compose** | Local development orchestration |

---

## 3. Backend Features

### Project Structure

```
backend/
├── alembic/              # Database migrations
│   └── versions/         # 20 migration files
├── app/
│   ├── api/v1/
│   │   ├── api.py        # Router registry + /health endpoint
│   │   └── routes/       # 21 route modules
│   ├── core/
│   │   ├── config.py     # Settings (Pydantic BaseSettings)
│   │   ├── database.py   # Async engine + session factory
│   │   ├── dependencies.py  # Auth dependencies (get_current_user, require_admin, etc.)
│   │   ├── exceptions.py # Custom exception classes
│   │   ├── logging.py    # Structured logging setup
│   │   ├── middleware.py  # Security headers + request logging
│   │   ├── rate_limit.py # In-memory rate limiter
│   │   ├── security.py   # JWT encode/decode, password hashing
│   │   └── ws_manager.py # WebSocket connection manager
│   ├── models/           # 18 SQLAlchemy models
│   ├── repositories/     # Data access layer
│   ├── schemas/          # Pydantic request/response schemas
│   ├── services/         # Business logic layer
│   └── utils/
│       └── sanitize.py   # Input sanitization
├── uploads/              # Local file storage (when Supabase not configured)
├── .env.example          # Environment template
├── alembic.ini           # Alembic configuration
├── Dockerfile            # Python 3.12-slim container
└── requirements.txt      # Python dependencies
```

### Module Reference

#### Auth (`/api/v1/auth`)
- **Purpose**: User registration, login, token refresh, logout
- **Models**: `User`
- **Endpoints**:
  - `POST /register` — Create account (rate limited: 5/hour). Validates university email domain.
  - `POST /login` — Returns access + refresh JWT tokens (rate limited: 10/5min). Supports login by email or username.
  - `POST /refresh` — Exchange refresh token for new access token
  - `POST /logout` — Invalidate refresh token (in-memory blocklist)
- **Rules**: Registration blocks generic providers (Gmail, Yahoo, Hotmail, etc.). Passwords hashed with bcrypt.

#### Users (`/api/v1/users`)
- **Purpose**: Profile management, follow system, search, suggestions
- **Models**: `User`, `UserFollow`
- **Endpoints**:
  - `GET /me` — Full authenticated user profile with counts (posts, followers, following, communities)
  - `PATCH /me` — Update profile fields (full_name, bio, department, academic_year, profile_image_url)
  - `PATCH /me/password` — Change password (requires current password)
  - `GET /me/status` — Lightweight auth check (verification state, role)
  - `GET /me/insights` — Activity stats (posts, likes received, comments received)
  - `GET /me/notification-settings` — Notification preference toggles
  - `PATCH /me/notification-settings` — Update notification preferences
  - `GET /suggestions` — Follow suggestions (same university, verified students prioritized)
  - `GET /search?q=` — Search users by username or full name (paginated)
  - `GET /{user_id}` — Public profile view (includes is_following context)
  - `POST /{user_id}/follow` — Follow a user
  - `DELETE /{user_id}/follow` — Unfollow a user
  - `GET /{user_id}/followers` — List followers (paginated)
  - `GET /{user_id}/following` — List following (paginated)
  - `GET /{user_id}/posts` — List user's posts (paginated, optional post_type filter)
- **Rules**: All endpoints require authentication. Public profiles hide email and sensitive flags.

#### Verification (`/api/v1/verification`)
- **Purpose**: Two-step student verification: email OTP + document upload
- **Models**: `VerificationRequest`
- **Endpoints**:
  - `POST /email/send` — Send 6-digit OTP to university email (rate limited: 3/5min)
  - `POST /email/confirm` — Validate OTP, sets `email_verified=true` and `is_verified_student=true`
  - `POST /document` — Upload student document (PDF/JPG/PNG) for verification (rate limited: 5/hour)
  - `GET /document/{id}` — Download verification document (owner + admin only; signed URL or local file)
  - `GET /status` — Current verification status
  - `GET /history` — Full verification attempt history
- **Rules**: OTP codes are SHA-256 hashed in DB. Documents go through AI/OCR validation first, then admin review for suspicious results. Email verification must happen before document upload.

#### Communities (`/api/v1/communities`)
- **Purpose**: University-based groups for organizing discussions
- **Models**: `Community`, `CommunityMember`
- **Endpoints**:
  - `POST /` — Create community (requires verified student)
  - `PATCH /{id}` — Update community (admin only)
  - `DELETE /{id}` — Delete community (admin only)
  - `GET /` — List communities by university (paginated)
  - `GET /search?q=` — Search communities (paginated, optional university filter)
  - `GET /joined` — List user's joined communities
  - `GET /{id}` — Community detail with membership context
  - `POST /{id}/join` — Join community (requires verified student)
  - `POST /{id}/leave` — Leave community
  - `GET /{id}/members` — List members (paginated, requires membership)
  - `DELETE /{id}/members/{user_id}` — Remove member (admin only)
- **Rules**: Only verified students can create, join, or interact. Community creator is admin.

#### Posts (`/api/v1/communities/{id}/posts`, `/api/v1/posts/{id}`)
- **Purpose**: Content creation and browsing
- **Models**: `Post` (types: text, image, short)
- **Endpoints**:
  - `POST /communities/{id}/posts` — Create post in community (rate limited: 10/5min)
  - `GET /communities/{id}/posts` — List community posts (paginated, public)
  - `GET /shorts` — List short-form video posts (paginated)
  - `GET /posts/{id}` — Single post detail
- **Rules**: Posts require verified student. Supports text, image (with image_url), and short video (with video_url) types. Shows `liked_by_me` when authenticated.

#### Comments (`/api/v1/posts/{id}/comments`)
- **Purpose**: Threaded comments on posts
- **Models**: `Comment` (supports `parent_comment_id` for replies)
- **Endpoints**:
  - `POST /posts/{id}/comments` — Create comment (rate limited: 20/5min)
  - `GET /posts/{id}/comments` — List comments (paginated, oldest first)
- **Rules**: Requires verified student. Supports nested replies via `parent_comment_id`.

#### Likes (`/api/v1/posts/{id}/like`)
- **Purpose**: Post engagement
- **Models**: `PostLike`
- **Endpoints**:
  - `POST /posts/{id}/like` — Like a post (toggle)
  - `DELETE /posts/{id}/like` — Unlike a post
- **Rules**: One like per user per post. Creates notification for post author.

#### Saved Posts (`/api/v1/posts/{id}/save`, `/api/v1/users/me/saved-*`)
- **Purpose**: Bookmarking posts with optional collection organization
- **Models**: `SavedPost`, `SavedCollection`, `SavedCollectionItem`
- **Endpoints**:
  - `POST /posts/{id}/save` — Bookmark a post
  - `DELETE /posts/{id}/save` — Remove bookmark
  - `GET /users/me/saved-posts` — List all bookmarks (paginated)
  - `GET /users/me/saved-collections` — List collections
  - `POST /users/me/saved-collections` — Create collection
  - `GET /users/me/saved-collections/{id}` — List posts in collection
  - `POST /users/me/saved-collections/{id}/posts/{post_id}` — Add post to collection
  - `DELETE /users/me/saved-collections/{id}/posts/{post_id}` — Remove from collection

#### Messaging (`/api/v1/conversations`)
- **Purpose**: 1-to-1 direct messaging
- **Models**: `Conversation`, `ConversationParticipant`, `Message`
- **Endpoints**:
  - `POST /conversations` — Start DM (returns existing if already exists)
  - `GET /conversations` — List conversations (sorted by latest activity)
  - `POST /conversations/{id}/messages` — Send message (rate limited: 30/min)
  - `GET /conversations/{id}/messages` — List messages (paginated, ascending)
  - `POST /conversations/{id}/read` — Mark conversation read
- **Rules**: Requires verified student. Only participants can access conversation messages.

#### Notifications (`/api/v1/notifications`)
- **Purpose**: In-app notification system
- **Models**: `Notification` (types: like, comment, follow, mention, community_invite, job_application, etc.)
- **Endpoints**:
  - `GET /notifications` — List notifications (paginated, newest first)
  - `PATCH /notifications/{id}/read` — Mark single notification read
  - `PATCH /notifications/read-all` — Mark all read
- **Rules**: Notifications created automatically by other actions (likes, comments, follows). Pushed in real-time via WebSocket.

#### Feed (`/api/v1/feed`)
- **Purpose**: Home timeline
- **Endpoints**:
  - `GET /feed` — Posts from all joined communities, newest first (paginated)
- **Rules**: Requires authentication.

#### Explore (`/api/v1/explore`)
- **Purpose**: Content discovery
- **Endpoints**:
  - `GET /explore` — Combined view: trending posts, suggested communities, suggested users
  - `GET /explore/communities` — Trending communities ranked by members + activity (paginated)

#### Search (`/api/v1/search`)
- **Purpose**: Unified cross-type search
- **Endpoints**:
  - `GET /search?q=` — Search across users, communities, posts, and jobs (6 results per type)

#### Trending (`/api/v1/trending`)
- **Purpose**: Engagement-ranked content
- **Endpoints**:
  - `GET /trending/posts` — Top posts by engagement with recency decay
  - `GET /trending/communities` — Top communities by growth + activity
  - `GET /trending/jobs` — Top jobs by interest signals

#### Stories (`/api/v1/stories`)
- **Purpose**: 24-hour ephemeral content
- **Models**: `Story`
- **Endpoints**:
  - `POST /` — Create story (expires in 24 hours)
  - `GET /` — All active stories grouped by user
  - `GET /{user_id}` — Stories for a specific user

#### Jobs (`/api/v1/jobs`)
- **Purpose**: Job/internship board with application management
- **Models**: `JobPost`, `JobApplication`, `SavedJob`
- **Endpoints**:
  - `POST /jobs` — Create job posting
  - `GET /jobs` — List active jobs (paginated, filterable by type/location/search)
  - `GET /jobs/saved` — List saved jobs
  - `GET /jobs/my-applications` — List user's applications
  - `GET /jobs/recommendations` — Personalized job suggestions
  - `GET /jobs/{id}` — Job detail
  - `DELETE /jobs/{id}` — Delete job (owner only)
  - `POST /jobs/{id}/apply` — Apply with message + optional CV URL
  - `GET /jobs/{id}/applications` — List applicants (job owner only)
  - `GET /jobs/{id}/stats` — Application statistics (job owner only)
  - `GET /jobs/{id}/activity` — Activity timeline (job owner only)
  - `PATCH /jobs/applications/{id}` — Accept/reject application (job owner only)
  - `GET /jobs/applications/{id}/cv` — Download applicant CV (redirects to signed URL)
  - `POST /jobs/{id}/save` — Save job for later
  - `DELETE /jobs/{id}/save` — Unsave job

#### Reports (`/api/v1/reports`)
- **Purpose**: Content moderation reporting
- **Models**: `Report`
- **Endpoints**:
  - `POST /reports` — Submit report (target_type: post/comment/user/community)

#### Uploads (`/api/v1/uploads`)
- **Purpose**: File upload management
- **Endpoints**:
  - `POST /image` — Upload image (JPG/PNG/WebP, max 5MB, rate limited: 15/5min)
  - `POST /video` — Upload short video (MP4/WebM, max 15MB, min 10KB)
  - `POST /avatar` — Upload avatar image (JPG/PNG/WebP, max 5MB)
  - `POST /resume` — Upload resume (PDF only, max 5MB)
  - `POST /cv` — Upload CV (PDF/DOCX, max 10MB, rate limited: 10/5min)
  - `POST /signed-url` — Generate signed upload URL for direct client-to-Supabase upload
- **Rules**: All uploads validate file extension, MIME type, and magic bytes. With Supabase: uploads to cloud buckets. Without: saves to local `uploads/` directory.

#### Admin (`/api/v1/admin`)
- **Purpose**: Platform administration and moderation
- **Endpoints**:
  - `GET /stats` — Dashboard metrics (users, posts, communities, verifications)
  - `GET /recent-activity` — Latest platform activity
  - `GET /moderation` — Moderation queue (pending verifications + reports)
  - `GET /users` — List all users (paginated, filterable by search/active/verified/role)
  - `GET /users/{id}` — User detail
  - `PATCH /users/{id}/deactivate` — Deactivate user
  - `PATCH /users/{id}/activate` — Activate user
  - `PATCH /users/{id}/role` — Change user role
  - `PATCH /users/{id}/verify` — Manually verify user
  - `GET /verifications` — List verifications (paginated, filterable by status/method/university)
  - `GET /verifications/{id}` — Verification detail
  - `PATCH /verifications/{id}/approve` — Approve verification
  - `PATCH /verifications/{id}/reject` — Reject verification (with optional reason)
  - `GET /communities` — List all communities
  - `GET /communities/{id}` — Community detail
  - `PATCH /communities/{id}/delete` — Soft-delete community
  - `PATCH /communities/{id}/restore` — Restore community
  - `GET /posts` — List all posts
  - `GET /posts/{id}` — Post detail
  - `PATCH /posts/{id}/hide` — Hide post
  - `PATCH /posts/{id}/restore` — Restore post
  - `GET /reports` — List reports (paginated, filterable)
  - `PATCH /reports/{id}/status` — Update report status
- **Rules**: All endpoints require `role=admin`. Admins cannot deactivate themselves.

#### WebSocket (`/api/v1/ws`)
- **Purpose**: Real-time event delivery
- **Endpoint**: `WS /ws?token=<JWT>`
- **Server → Client Events**:
  - `new_message` — New chat message received
  - `new_notification` — New notification
  - `typing_start` / `typing_stop` — Typing indicators
- **Client → Server Events**:
  - `typing_start` / `typing_stop` — Send typing state
- **Rules**: Authenticated via JWT query parameter. Verifies user exists and is active. Presence broadcast via Supabase Realtime when configured.

---

## 4. Web Features

### Route Structure

The web app uses Next.js App Router with two route groups:

```
web/app/
├── (auth)/                    # Public pages (no auth required)
│   ├── login/page.tsx         # Login form
│   ├── register/page.tsx      # Registration form
│   └── verify/page.tsx        # Email + document verification flow
├── (app)/                     # Protected pages (wrapped in AuthGuard)
│   ├── page.tsx               # Home feed
│   ├── explore/page.tsx       # Explore/discover content
│   ├── search/page.tsx        # Unified search
│   ├── communities/page.tsx   # Community listing
│   ├── communities/[id]/page.tsx  # Community detail
│   ├── posts/[id]/page.tsx    # Post detail with comments
│   ├── profile/[username]/page.tsx  # User profile
│   ├── messages/page.tsx      # Conversation list sidebar
│   ├── messages/[id]/page.tsx # Chat thread
│   ├── notifications/page.tsx # Notifications list
│   ├── jobs/page.tsx          # Job board
│   ├── jobs/[id]/page.tsx     # Job detail
│   ├── bookmarks/page.tsx     # Saved posts & collections
│   ├── settings/page.tsx      # User settings
│   └── admin/page.tsx         # Admin dashboard
├── error.tsx                  # Global error boundary
└── not-found.tsx              # 404 page
```

### Key Components

```
web/components/
├── layout/
│   ├── AppShell.tsx           # Main app shell (sidebar + content + right rail)
│   ├── NavRail.tsx            # Left sidebar navigation
│   ├── TopBar.tsx             # Top navigation bar
│   └── RightRail.tsx          # Right sidebar (trending, suggestions)
├── post/
│   ├── FeedPostCard.tsx       # Post card for feed
│   ├── PostCard.tsx           # Full post card (detail view)
│   ├── PostActions.tsx        # Like, comment, share, save buttons
│   ├── ComposeModal.tsx       # Create new post modal
│   ├── ComposerInline.tsx     # Inline composer
│   ├── ComposeFab.tsx         # Floating compose button
│   ├── ComposeProvider.tsx    # Compose state context
│   ├── FeedTabs.tsx           # Feed category tabs
│   ├── PollWidget.tsx         # Poll display
│   ├── PostMenu.tsx           # Post overflow menu (edit, delete, report)
│   └── ReportModal.tsx        # Report submission modal
├── community/
│   ├── CommunityCard.tsx      # Community card
│   ├── CommunityIcon.tsx      # Community avatar
│   ├── CommunityRow.tsx       # Community list row
│   └── CreateCommunityModal.tsx  # Create community form
├── chat/
│   ├── MessagesSidebar.tsx    # Conversation list with search
│   ├── ConversationRow.tsx    # Conversation list item
│   ├── MessageBubble.tsx      # Chat message bubble
│   ├── NewConversationModal.tsx  # Start new DM
│   └── TypingDots.tsx         # Typing indicator animation
├── jobs/
│   ├── JobCard.tsx            # Job listing card
│   └── JobApplyModal.tsx      # Application form with CV upload
├── notifications/
│   └── NotificationRow.tsx    # Notification list item
├── profile/
│   └── ProfileStat.tsx        # Profile stat counter
├── widgets/
│   ├── TrendingWidget.tsx     # Trending posts widget
│   ├── SuggestedCommunities.tsx  # Community suggestions
│   ├── CampusEventsWidget.tsx # Campus events sidebar
│   ├── FooterLinks.tsx        # Footer navigation
│   └── WidgetCard.tsx         # Widget container
└── ui/                        # Design system primitives
    ├── Avatar.tsx, AvatarStack.tsx
    ├── Button.tsx, Card.tsx, Chip.tsx
    ├── Field.tsx              # Form input with label/icon/hint
    ├── Modal.tsx              # Accessible modal dialog
    ├── OtpInput.tsx           # 6-digit OTP input
    ├── Segmented.tsx          # Segmented control tabs
    ├── Switch.tsx             # Toggle switch
    ├── SectionHead.tsx        # Section header
    ├── UniBadge.tsx           # Verified student badge
    ├── UVMark.tsx             # UniVerse logo mark
    └── PlaceholderImage.tsx   # Image placeholder
```

### State Management & API Layer

```
web/lib/
├── api/
│   ├── client.ts              # Axios instance with JWT interceptor + refresh
│   ├── auth.ts                # Login, register, refresh, logout, getMe
│   ├── feed.ts                # Home feed
│   ├── posts.ts               # Post CRUD, likes, comments
│   ├── communities.ts         # Community CRUD, membership
│   ├── conversations.ts       # Messaging API
│   ├── notifications.ts       # Notification list + mark read
│   ├── users.ts               # Profile, follow, search
│   ├── jobs.ts                # Job CRUD, applications, CV upload
│   ├── settings.ts            # User settings
│   └── admin.ts               # Admin APIs
├── stores/
│   └── auth-store.ts          # Zustand store: token, user, login, logout, refresh
├── hooks/
│   ├── useDebouncedValue.ts   # Reusable debounce hook (300ms default)
│   └── useSupabaseRealtime.ts # Supabase Realtime subscription hook
├── providers/
│   └── AuthGuard.tsx          # Route protection: token → email_verified → render
├── supabase.ts                # Supabase client initialization
└── utils.ts                   # cn() utility (clsx + tailwind-merge)
```

### Feature Status by Page

| Page | Status | Notes |
|------|--------|-------|
| Login | ✅ Complete | Email or username login, error handling |
| Register | ✅ Complete | University email validation, blocked domain warning |
| Verify | ✅ Complete | Sequential: email OTP → document upload → result states |
| Home Feed | ✅ Complete | Posts from joined communities, infinite scroll |
| Explore | ✅ Complete | Trending posts, suggested communities & users |
| Search | ✅ Complete | Unified search across users/communities/posts/jobs |
| Communities | ✅ Complete | List, detail, create, join/leave, member management |
| Post Detail | ✅ Complete | Full post view with comments, likes, sharing |
| Profile | ✅ Complete | User profile, posts tab, follow/unfollow, verified badge |
| Messages | ✅ Complete | Conversation list with search, chat thread, typing indicators |
| Notifications | ✅ Complete | List with mark read, real-time updates |
| Jobs | ✅ Complete | Job board, detail, apply with CV, employer management |
| Bookmarks | ✅ Complete | Saved posts, collections |
| Settings | ✅ Complete | Profile editing, password change, notification preferences |
| Admin | ✅ Complete | Stats dashboard, user management, verification queue, reports |

---

## 5. Mobile App Status

### Architecture

```
mobile/src/
├── api/                       # API client modules
│   ├── client.ts              # Axios instance
│   ├── auth.ts                # Auth endpoints
│   ├── feed.ts                # Feed endpoints
│   ├── posts.ts               # Posts endpoints
│   ├── communities.ts         # Communities endpoints
│   ├── messaging.ts           # Messaging endpoints
│   ├── notifications.ts       # Notification endpoints
│   ├── users.ts               # User endpoints
│   ├── verification.ts        # Verification endpoints
│   └── index.ts               # Barrel export
├── store/
│   └── authStore.ts           # Zustand with AsyncStorage persistence
├── navigation/
│   ├── RootNavigator.tsx      # Auth state routing
│   ├── AuthStack.tsx          # Login + Register screens
│   ├── MainTabs.tsx           # Bottom tab navigator (6 tabs)
│   └── types.ts               # Navigation type definitions
├── screens/
│   ├── auth/
│   │   ├── LoginScreen.tsx
│   │   └── RegisterScreen.tsx
│   └── main/
│       ├── FeedScreen.tsx
│       ├── PostDetailScreen.tsx
│       ├── CommunitiesListScreen.tsx
│       ├── CommunityDetailScreen.tsx
│       ├── CreatePostScreen.tsx
│       ├── SearchScreen.tsx
│       ├── NotificationsScreen.tsx
│       ├── ConversationsScreen.tsx
│       ├── ChatScreen.tsx
│       ├── MyProfileScreen.tsx
│       ├── UserProfileScreen.tsx
│       └── VerificationScreen.tsx
├── components/
│   ├── common/
│   │   ├── ErrorBanner.tsx
│   │   └── SkeletonLoader.tsx
│   ├── post/
│   │   └── PostCard.tsx
│   └── messaging/
│       └── MessageBubble.tsx
├── types/
│   └── api.ts                 # TypeScript API types
└── utils/
    └── config.ts              # API_URL configuration
```

### Feature Status

| Feature | Status | Notes |
|---------|--------|-------|
| Auth (Login/Register) | ✅ Complete | Token persistence with AsyncStorage |
| Feed | ✅ Complete | Home timeline with post cards |
| Post Detail | ✅ Complete | Full post view with comments |
| Communities | ✅ Complete | List + detail + create post |
| Search | ✅ Complete | User/community search |
| Notifications | ✅ Complete | List with unread badge on tab |
| Messaging | ✅ Complete | Conversation list + chat screen |
| Profile | ✅ Complete | My profile + other user profiles |
| Verification | ✅ Complete | Email + document verification |
| Create Post | ✅ Complete | Post creation screen |

### Web-Only Features (not on mobile)

- Admin dashboard
- Job board & applications
- Stories
- Bookmarks/collections
- Settings page
- Explore page (combined view)

### Tab Navigation (6 tabs)

1. **Feed** — Home timeline → Post Detail → User Profile → Community Detail
2. **Communities** — List → Detail → Create Post → Post Detail → User Profile
3. **Search** — Search → User Profile → Community Detail
4. **Alerts** — Notifications (with unread badge) → Post Detail → User Profile
5. **Messages** — Conversations list → Chat
6. **Profile** — My Profile → Verification → User Profile

---

## 6. Database / Migrations

### Alembic Migration System

The project uses **Alembic** for database schema versioning. Migrations are stored in `backend/alembic/versions/` as individual Python files.

**Current migration chain (20 migrations):**

```
13034b4c8b76  Create users and universities tables
    ↓
dfcdc4d59a9f  Add all remaining tables (posts, comments, likes, communities, etc.)
    ↓
a1b2c3d4e5f6  Add is_deleted to communities
    ↓
b2c3d4e5f6a7  Add actor_id to notifications
    ↓
c3d4e5f6a7b8  Add last_read_at to conversation_participants
    ↓
d4e5f6a7b8c9  Add rejection_reason to verification
    ↓
c4702c91ac3d  Add user_follows table
    ↓
6c2230c54c4c  Add stories table
    ↓
6e1eadab2ae5  Add parent_comment_id to comments
    ↓
6eeaf4bc9d17  Add saved_posts table
    ↓
243b1bddcfc9  Add post_type and video_url to posts
    ↓
a7b8c9d0e1f2  Add saved_collections tables
    ↓
44451e8e37ed  Add job_posts and job_applications tables
    ↓
2b9ac721a970  Add saved_jobs table
    ↓
97aa02549ab1  Add status to job_applications
    ↓
2fae1cf69df0  Add notification_preferences to users
    ↓
a0c51331b0b0  Add document_verification_fields
    ↓
51bceebde41e  Add reports table
    ↓
e5f6a7b8c9d0  Add cv_url to job_applications
    ↓
f6a7b8c9d0e1  Add email_verified to users (latest)
```

### Running Migrations

```bash
# Apply all pending migrations
cd backend
alembic upgrade head

# Check current revision
alembic current

# Show migration history
alembic history

# Rollback one step
alembic downgrade -1

# Generate a new migration (after model changes)
alembic revision --autogenerate -m "description_of_change"
```

### How the Database URL Works

The app builds the connection URL automatically from individual environment variables:

```python
# In app/core/config.py
DATABASE_URL = f"postgresql+asyncpg://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
```

- `DB_PASSWORD` is automatically percent-encoded (special characters like `!@#$` work safely)
- No need to manually URL-encode your password
- The `+asyncpg` dialect tells SQLAlchemy to use the async PostgreSQL driver

### SSL Handling

The app auto-detects when to use SSL:

```python
# In app/core/database.py
if DB_HOST != "localhost" and not DB_HOST.startswith("127."):
    # Remote host (Supabase) → enable SSL
    ssl_context = ssl.create_default_context()
    ssl_context.check_hostname = False
    ssl_context.verify_mode = ssl.CERT_NONE  # Supabase uses self-signed certs
```

- **Local PostgreSQL**: No SSL (localhost or 127.x.x.x)
- **Supabase/Remote**: SSL enabled automatically with `CERT_NONE` (Supabase self-signed)

### Example `.env` Configurations

#### A) Local Docker PostgreSQL

```env
DB_USER=postgres
DB_PASSWORD=postgres
DB_HOST=localhost
DB_PORT=5433
DB_NAME=universe_db

SECRET_KEY=generate-a-random-64-char-string-here

# Leave empty for local filesystem uploads
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

> **Note:** The Docker Compose maps port `5433` on host to `5432` in the container to avoid conflicts with a locally installed PostgreSQL.

#### B) Supabase PostgreSQL

```env
DB_USER=postgres
DB_PASSWORD=your-supabase-database-password
DB_HOST=db.abcdefghijkl.supabase.co
DB_PORT=5432
DB_NAME=postgres

SECRET_KEY=generate-a-random-64-char-string-here

SUPABASE_URL=https://abcdefghijkl.supabase.co
SUPABASE_ANON_KEY=eyJ...your-anon-key...
SUPABASE_SERVICE_ROLE_KEY=eyJ...your-service-role-key...
```

> **Important:** Use the **direct connection** (port `5432`), NOT the pooler (port `6543`). The app uses `asyncpg` which manages its own connection pool.

---

## 7. Mac Setup Guide

### Prerequisites

| Requirement | Install Command |
|-------------|-----------------|
| **Git** | `xcode-select --install` (comes with Xcode CLI tools) |
| **Homebrew** | `/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"` |
| **Node.js 18+** | `brew install node` |
| **Python 3.11+** | `brew install python@3.12` |
| **PostgreSQL 16** (optional) | `brew install postgresql@16` |
| **Docker** (alternative to local PG) | Download [Docker Desktop for Mac](https://www.docker.com/products/docker-desktop/) |

### Step 1: Clone the Project

```bash
git clone https://github.com/rmawnn/UniVerse.git
cd UniVerse
```

### Step 2: Start the Database

**Option A — Docker (recommended):**

```bash
docker compose up postgres -d
```

This starts PostgreSQL on port `5433`.

**Option B — Local PostgreSQL:**

```bash
brew services start postgresql@16
createdb universe_db
```

### Step 3: Backend Setup

```bash
cd backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create .env from template
cp .env.example .env
```

**Edit `backend/.env`:**

```env
# If using Docker Compose:
DB_PORT=5433

# If using local PostgreSQL:
DB_PORT=5432

# Generate a secure secret key:
SECRET_KEY=<paste output of: python3 -c "import secrets; print(secrets.token_hex(32))">
```

```bash
# Run database migrations
alembic upgrade head

# Start the backend server
uvicorn app.main:app --reload --port 8000
```

**Verify:** Open [http://localhost:8000/api/v1/health](http://localhost:8000/api/v1/health) — should return `{"status": "ok"}`

**API docs:** Open [http://localhost:8000/docs](http://localhost:8000/docs) for interactive Swagger UI

### Step 4: Web Frontend Setup

Open a new terminal:

```bash
cd web

# Install dependencies
npm install

# Create .env from template
cp .env.example .env.local
```

The default `NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1` should work.

```bash
# Start development server
npm run dev
```

**Verify:** Open [http://localhost:3000](http://localhost:3000) — should show the login page.

### Step 5: Mobile App Setup (Optional)

Open a new terminal:

```bash
cd mobile

# Install dependencies
npm install

# Start Expo
npx expo start
```

- Press `i` for iOS Simulator
- Press `a` for Android Emulator
- Scan QR code with Expo Go on a physical device

**Configure API URL:**

Edit `mobile/src/utils/config.ts`:

```typescript
// For iOS Simulator:
export const API_URL = "http://localhost:8000/api/v1";

// For Android Emulator:
export const API_URL = "http://10.0.2.2:8000/api/v1";

// For physical device on same network:
export const API_URL = "http://YOUR_MAC_IP:8000/api/v1";
```

### Step 6: Docker Compose (Full Stack)

To run everything in Docker:

```bash
# From project root
docker compose up --build
```

This starts:
- **PostgreSQL** on port `5433`
- **Backend** on port `8000`
- **Web** on port `3000`

---

## 8. Supabase Setup on Mac

### Step 1: Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and create an account
2. Click "New Project"
3. Choose an organization, name it (e.g., "universe"), set a strong database password
4. Wait for the project to provision

### Step 2: Get Connection Details

In your Supabase dashboard:

1. Go to **Settings → Database**
2. Under "Connection string", find the **Direct connection** details:
   - Host: `db.<project-ref>.supabase.co`
   - Port: `5432`
   - Database: `postgres`
   - User: `postgres`
   - Password: (the one you set when creating the project)

3. Go to **Settings → API** and copy:
   - **Project URL**: `https://<project-ref>.supabase.co`
   - **anon / public key**: `eyJ...`
   - **service_role key**: `eyJ...`

### Step 3: Configure Backend

Edit `backend/.env`:

```env
DB_USER=postgres
DB_PASSWORD=your-supabase-database-password
DB_HOST=db.abcdefghijkl.supabase.co
DB_PORT=5432
DB_NAME=postgres

SUPABASE_URL=https://abcdefghijkl.supabase.co
SUPABASE_ANON_KEY=eyJ...your-anon-key...
SUPABASE_SERVICE_ROLE_KEY=eyJ...your-service-role-key...
```

### Step 4: Configure Web Frontend

Edit `web/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
NEXT_PUBLIC_SUPABASE_URL=https://abcdefghijkl.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...your-anon-key...
```

### Step 5: Run Migrations and Start

```bash
cd backend
source venv/bin/activate
alembic upgrade head
uvicorn app.main:app --reload
```

The backend logs should show:

```
Starting UniVerse v0.1.0 [development]
Supabase integration active: Storage + Realtime
```

### Step 6: Create Storage Buckets

The app auto-creates these buckets on startup:
- `avatars` — User profile images
- `posts` — Post images and videos
- `verification-docs` — Student verification documents
- `attachments` — General attachments
- `resumes` — CV/resume files

### Security Notes

- ⚠️ **Never commit** `.env` files to Git
- ⚠️ The `service_role` key has **full database access** — keep it server-side only
- ✅ The `anon` key is safe for the browser (protected by Row Level Security)
- ✅ `DATABASE_URL` is built from individual `DB_*` fields — no need to paste a raw URL

---

## 9. Common Problems / Fixes

### Backend cannot connect to database

**Symptom:** `Connection refused` or `could not connect to server`

**Fixes:**
- Check PostgreSQL is running: `docker compose ps` or `brew services list`
- Verify `DB_HOST` and `DB_PORT` in `.env` match your setup
- Docker uses port `5433` on host → set `DB_PORT=5433`
- Local PostgreSQL uses port `5432` → set `DB_PORT=5432`
- Check password: `psql -U postgres -h localhost -p 5433` should connect

### Alembic migration fails

**Symptom:** `Can't locate revision` or `Target database is not up to date`

**Fixes:**
```bash
# Check current state
alembic current

# If corrupted, stamp to a known good revision
alembic stamp head

# If there's a conflict, check the revision chain
alembic history --verbose
```

### Port already in use

**Symptom:** `Address already in use: 8000` or `Port 3000 is already in use`

**Fixes:**
```bash
# Find what's using the port
lsof -i :8000
lsof -i :3000

# Kill the process
kill -9 <PID>

# Or use a different port
uvicorn app.main:app --reload --port 8001
npm run dev -- --port 3001
```

### Frontend API network error

**Symptom:** `Network Error` or `ERR_CONNECTION_REFUSED` in browser console

**Fixes:**
- Verify backend is running on port 8000
- Check `NEXT_PUBLIC_API_URL` in `web/.env.local` is `http://localhost:8000/api/v1`
- Check CORS: backend `.env` should include `http://localhost:3000` in `CORS_ORIGINS`
- Clear browser cache / hard reload

### WebSocket connection error

**Symptom:** Chat messages don't appear in real-time, typing indicators don't work

**Fixes:**
- WebSocket connects to `ws://localhost:8000/api/v1/ws?token=<JWT>`
- Check the browser's Network tab → WS tab for connection status
- If `4001 Authentication failed`: the JWT may be expired — log out and log back in
- Ensure the backend is not behind a proxy that strips WebSocket upgrade headers

### Hydration warning from browser extensions

**Symptom:** `Warning: Extra attributes from the server: class, style` in console

**Fix:** This is caused by browser extensions (password managers, dark mode, etc.) injecting attributes. It's harmless — not a code bug. Ignore or disable extensions on localhost.

### Expo cannot reach backend

**Symptom:** Mobile app shows network error or loading spinner forever

**Fixes:**
- **iOS Simulator**: Use `http://localhost:8000/api/v1`
- **Android Emulator**: Use `http://10.0.2.2:8000/api/v1` (Android maps `10.0.2.2` to host `localhost`)
- **Physical device**: Use your Mac's local IP: `http://192.168.x.x:8000/api/v1`
  - Find your IP: `ifconfig | grep "inet " | grep -v 127.0.0.1`
- Ensure backend `CORS_ORIGINS` includes `http://localhost:19006` and `http://localhost:8081`

### Mac permission / venv issues

**Symptom:** `Permission denied` or `externally-managed-environment`

**Fixes:**
```bash
# Always use venv — never install globally
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# If venv/bin/activate: Permission denied
chmod +x venv/bin/activate

# If Python not found
brew install python@3.12
echo 'export PATH="/opt/homebrew/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
```

### SWC lockfile warning during build

**Symptom:** `Found lockfile missing swc dependencies, patching... Failed to patch lockfile`

**Fix:** This is a cosmetic warning — the build still succeeds. It's a known Next.js issue with lockfile patching. You can safely ignore it.

---

## 10. Run Checklist

### Backend ✅

- [ ] Python 3.11+ installed: `python3 --version`
- [ ] Virtual environment activated: `source venv/bin/activate`
- [ ] Dependencies installed: `pip install -r requirements.txt`
- [ ] `.env` file configured with database credentials and SECRET_KEY
- [ ] Database running (Docker or local PostgreSQL)
- [ ] Migrations applied: `alembic upgrade head`
- [ ] Server starts: `uvicorn app.main:app --reload`
- [ ] Health check works: `curl http://localhost:8000/api/v1/health` → `{"status":"ok"}`
- [ ] Registration works: POST to `/api/v1/auth/register` with university email
- [ ] Login works: POST to `/api/v1/auth/login` returns JWT tokens
- [ ] API docs load: `http://localhost:8000/docs`

### Web ✅

- [ ] Node.js 18+ installed: `node --version`
- [ ] Dependencies installed: `npm install`
- [ ] `.env.local` exists with `NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1`
- [ ] Dev server starts: `npm run dev`
- [ ] Login page loads: `http://localhost:3000/login`
- [ ] Can register and login
- [ ] Feed loads after login
- [ ] Build passes: `npm run build`

### Mobile ✅

- [ ] Expo CLI installed: `npx expo --version`
- [ ] Dependencies installed: `npm install`
- [ ] API URL configured in `src/utils/config.ts`
- [ ] Expo starts: `npx expo start`
- [ ] App connects to backend (login works)

### Database ✅

- [ ] PostgreSQL running and accessible
- [ ] `universe_db` database exists (or `postgres` for Supabase)
- [ ] All migrations applied: `alembic current` shows latest revision
- [ ] Tables exist: `universities`, `users`, `posts`, `communities`, etc.

---

## 11. Project Status

### ✅ Complete

| Feature | Backend | Web | Mobile |
|---------|---------|-----|--------|
| Auth (register/login/logout/refresh) | ✅ | ✅ | ✅ |
| JWT with refresh token rotation | ✅ | ✅ | ✅ |
| University email validation | ✅ | ✅ | — |
| Email OTP verification | ✅ | ✅ | ✅ |
| Document verification + AI/OCR | ✅ | ✅ | ✅ |
| AuthGuard (gate unverified users) | ✅ | ✅ | ✅ |
| User profiles (view/edit) | ✅ | ✅ | ✅ |
| Follow/unfollow system | ✅ | ✅ | — |
| Home feed | ✅ | ✅ | ✅ |
| Communities (CRUD + membership) | ✅ | ✅ | ✅ |
| Posts (text/image/short) | ✅ | ✅ | ✅ |
| Comments (with replies) | ✅ | ✅ | ✅ |
| Likes | ✅ | ✅ | ✅ |
| Real-time messaging (WebSocket) | ✅ | ✅ | ✅ |
| Typing indicators | ✅ | ✅ | — |
| Conversation search | ✅ | ✅ | — |
| Notifications (with real-time push) | ✅ | ✅ | ✅ |
| Unified search | ✅ | ✅ | ✅ |
| Explore / trending | ✅ | ✅ | — |
| Job board (CRUD + search) | ✅ | ✅ | — |
| Job applications with CV upload | ✅ | ✅ | — |
| Bookmarks / saved collections | ✅ | ✅ | — |
| Stories (24h ephemeral) | ✅ | ✅ | — |
| Reports / moderation | ✅ | ✅ | — |
| Admin dashboard | ✅ | ✅ | — |
| Verification queue (admin) | ✅ | ✅ | — |
| File uploads (Supabase Storage) | ✅ | ✅ | — |
| Rate limiting | ✅ | — | — |
| Security headers middleware | ✅ | — | — |
| Docker Compose (full stack) | ✅ | ✅ | — |

### ⚠️ Partially Complete / Needs Polish

| Area | Notes |
|------|-------|
| **Shorts/Reels** | Backend model and listing endpoint exist. Web has basic support. No dedicated viewer UI (vertical scroll/swipe). |
| **Stories** | Backend fully functional. Web renders them but UI could be more polished (no full-screen viewer). |
| **Push notifications** | In-app only (WebSocket). No native push (FCM/APNs) for mobile — requires Expo push notification setup. |
| **Password reset** | No "forgot password" flow. Users must contact admin to reset. |
| **Email delivery** | Verification codes are logged to console (no real email provider configured). Need to integrate SendGrid/Resend/SMTP for production. |
| **Image optimization** | No server-side resize or compression. Images stored as-is. |
| **Mobile feature parity** | Jobs, bookmarks, stories, admin, settings, explore are web-only. |

### 🔮 Future Work

| Feature | Description |
|---------|-------------|
| **Forgot password flow** | Email-based password reset with tokenized link |
| **Real email delivery** | Integrate SendGrid, Resend, or AWS SES for OTP emails |
| **Native push notifications** | FCM (Android) + APNs (iOS) via Expo Push |
| **Group chats** | Extend messaging to support multi-participant conversations |
| **Post editing/deletion** | Allow users to edit or delete their own posts |
| **Infinite scroll everywhere** | Some pages use pagination buttons instead of infinite scroll |
| **Image CDN / optimization** | Resize, compress, serve via CDN (Cloudflare Images, imgproxy) |
| **Full-text search** | PostgreSQL `tsvector` / `tsquery` for better search relevance |
| **Rate limiting (Redis)** | Current rate limiter is in-memory — resets on restart. Use Redis for persistence. |
| **CI/CD pipeline** | GitHub Actions for lint, typecheck, tests, and deploy |
| **E2E tests** | Playwright or Cypress for web, Detox for mobile |
| **i18n / localization** | Multi-language support (Turkish, English, etc.) |
| **Dark mode** | Theme switching (CSS variables are partially set up) |
| **OAuth / SSO** | Google, Microsoft login for university accounts |
| **Analytics** | PostHog, Mixpanel, or Plausible for product analytics |
| **Content moderation AI** | Auto-detect inappropriate text/images before posting |
| **Recommendation engine** | ML-based feed ranking and job suggestions |

---

## 12. Quick Reference

### Key URLs (Development)

| Service | URL |
|---------|-----|
| Web app | http://localhost:3000 |
| Backend API | http://localhost:8000/api/v1 |
| API docs (Swagger) | http://localhost:8000/docs |
| API docs (ReDoc) | http://localhost:8000/redoc |
| Health check | http://localhost:8000/api/v1/health |
| WebSocket | ws://localhost:8000/api/v1/ws?token=JWT |

### Project Repository

```
https://github.com/rmawnn/UniVerse.git
```

### Generate a Secret Key

```bash
python3 -c "import secrets; print(secrets.token_hex(32))"
```

### Common Commands

```bash
# Backend
cd backend && source venv/bin/activate
uvicorn app.main:app --reload                    # Start server
alembic upgrade head                             # Apply migrations
alembic revision --autogenerate -m "desc"        # Create migration
pytest                                           # Run tests

# Web
cd web
npm run dev                                      # Dev server
npm run build                                    # Production build
npm run lint                                     # Lint check
npm run typecheck                                # TypeScript check

# Mobile
cd mobile
npx expo start                                   # Start Expo
npx expo start --ios                             # iOS only
npx expo start --android                         # Android only

# Docker
docker compose up --build                        # Full stack
docker compose up postgres -d                    # DB only
docker compose down                              # Stop all
docker compose logs -f backend                   # Backend logs
```
