# UniVerse Demo Script

Step-by-step walkthrough for presenting UniVerse in a live demo.

**Setup:** Run the seed script first so the app has realistic data.

```bash
docker compose exec backend python -m scripts.seed_demo
```

---

## Demo Flow (8-10 minutes)

### 1. Registration (1 min)

1. Open http://localhost:3000
2. Click **Register**
3. Fill in: name, email, username, password
4. Show validation (short password, duplicate email)
5. Submit — redirected to feed

> "UniVerse is a social platform built for university students. Let's create an account."

### 2. Student Verification (1 min)

1. Go to **Profile**
2. Show the unverified badge
3. Navigate to verification flow
4. Enter university email (e.g., `newuser@stanford.edu`)
5. Enter the 6-digit code
6. Show the verified badge appears

> "Students verify their university email to unlock community features. This ensures every user is a real student."

### 3. Explore Communities (1 min)

1. Click **Explore** in the sidebar
2. Show trending communities ranked by activity
3. Point out member counts and descriptions
4. Show the empty state if no communities exist (unlikely with seed data)

> "The Explore page surfaces trending communities. Ranking considers both member count and recent posting activity."

### 4. Join a Community (30 sec)

1. Click **Join** on "CS Study Group"
2. Show the button changes to "Joined" badge
3. Click into the community detail page
4. Show members list, posts, and the post composer

> "One click to join. You immediately see the community's posts and members."

### 5. Create a Post with Image (1 min)

1. Click the compose button (FAB or inline composer)
2. Write a post: "Just deployed our project! Here's a screenshot."
3. Add an image URL
4. Show the image preview
5. Submit — post appears at the top of the feed

> "Posts support text and images. The feed is ranked by engagement, not just chronology."

### 6. Like and Comment (1 min)

1. Like a post — show the heart fills instantly (optimistic update)
2. Unlike it — show it reverts instantly
3. Click into a post to see the detail view
4. Write a comment: "Great work!"
5. Submit — comment appears immediately

> "Likes use optimistic updates — the UI responds instantly while the server catches up. No loading spinners for common actions."

### 7. Real-Time Messaging (1.5 min)

1. Open a second browser tab, log in as a different demo user (e.g., bob@stanford.edu / Demo1234!)
2. In the first tab (Alice), go to **Messages**
3. Show existing conversations from seed data
4. Open the conversation with Bob
5. Send a message from Alice
6. Switch to Bob's tab — message appears in real-time (no refresh)
7. Reply from Bob — switch back to Alice's tab, message is there

> "Messaging is real-time over WebSocket. Messages appear instantly on both sides without refreshing."

### 8. Notifications (1 min)

1. Show the notification badge in the sidebar (should have unread count from seed data)
2. Click **Notifications**
3. Show actor avatars, action text, and timestamps
4. Show the unread indicator (purple left border + dot)
5. Click **Mark all as read** — all notifications clear
6. Click a notification — navigates to the relevant post

> "Notifications are deduplicated — if someone likes your post twice, you don't get spammed. They also update in real-time via WebSocket."

### 9. Search (30 sec)

1. Click **Search** in the sidebar
2. Type a query — results appear as you type
3. Switch between Users and Communities tabs
4. Click a result — navigates to profile or community

> "Search works across users and communities with instant results."

### 10. Wrap Up (30 sec)

1. Show the responsive layout — resize the browser to mobile width
2. Show the sidebar collapses into a hamburger menu
3. Mention the React Native mobile app shares the same API

> "The web app is fully responsive, and we have a React Native mobile app sharing the same backend."

---

## Key Technical Points to Mention

- **Engagement-ranked feed** — posts scored by `(likes * 2) + comments - (age_hours / 6)`
- **Optimistic updates** — likes, comments update instantly; rollback on failure
- **WebSocket + polling fallback** — real-time when connected, automatic polling if WS drops
- **Layered backend architecture** — Routes → Services → Repositories, fully async
- **Skeleton loading states** — no spinners, content shape appears immediately
- **Notification deduplication** — same (user, actor, type, reference) won't create duplicates

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| App shows empty feed | Run the seed script: `docker compose exec backend python -m scripts.seed_demo` |
| Can't log in | Check the backend is running: `docker compose ps` |
| WebSocket not connecting | Check browser console; WS falls back to polling automatically |
| Database errors | Run migrations: `docker compose exec backend alembic upgrade head` |

---

## Short Pitch

**UniVerse** is a social platform purpose-built for university students. It solves the fragmentation problem on campus — instead of juggling GroupMe for clubs, Discord for study groups, and Instagram for events, UniVerse puts communities, messaging, and a smart content feed in one place.

What makes it different:
- **Verified identity** — every user proves they're a real student via university email
- **Smart feed** — posts ranked by engagement, not just recency
- **Real-time** — WebSocket messaging with instant notifications
- **Campus-scoped** — communities belong to universities, so content stays relevant

Built with FastAPI, Next.js, React Native, and PostgreSQL.

---

## Screenshots to Capture

For the portfolio, capture these screens at **1280x800** (desktop) and **375x812** (mobile):

1. **Feed** — with several posts showing likes, comments, and an image post
2. **Explore** — trending communities grid with join buttons
3. **Community Detail** — header with members, posts list, compose area
4. **Chat** — conversation with alternating message bubbles
5. **Notifications** — mix of unread (purple border) and read notifications
6. **Profile** — user header, communities chips, post history
7. **Search** — results showing user avatars and community cards
8. **Registration** — clean form with validation
