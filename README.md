# UniVerse

A university social platform that connects students through communities, real-time messaging, and a ranked content feed — built for campus life.

## What It Does

UniVerse solves the fragmentation problem on college campuses: students use dozens of apps for study groups, club announcements, event coordination, and peer messaging. UniVerse puts it all in one place with university-verified identity, so every interaction is authentic and campus-relevant.

**Key capabilities:**
- Student verification via university email
- Community-based content with engagement-ranked feeds
- Real-time messaging over WebSocket (with polling fallback)
- Like, comment, and notification system with deduplication
- Image posts and explore/discovery for trending communities
- Responsive web app + React Native mobile app

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend API | FastAPI (Python 3.12), async SQLAlchemy 2.0 |
| Database | PostgreSQL 16 |
| Web Frontend | Next.js 16 (App Router), React 19, TypeScript |
| Mobile | React Native (Expo), React Navigation v7 |
| State Management | TanStack React Query (server), Zustand (client) |
| Real-time | WebSocket (native FastAPI) |
| Auth | JWT (access + refresh tokens), bcrypt |
| Infrastructure | Docker Compose, Alembic migrations |

## Architecture

```
┌─────────────┐   ┌──────────────┐
│   Next.js    │   │ React Native │
│   Web App    │   │  Mobile App  │
└──────┬───────┘   └──────┬───────┘
       │     HTTP / WS    │
       └────────┬─────────┘
                │
       ┌────────▼────────┐
       │   FastAPI        │
       │   ┌────────────┐ │
       │   │ Routes     │ │
       │   │ Services   │ │
       │   │ Repos      │ │
       │   └────────────┘ │
       └────────┬─────────┘
                │
       ┌────────▼────────┐
       │  PostgreSQL 16   │
       └─────────────────┘
```

**Backend** follows a layered architecture: **Routes** (request handling) → **Services** (business logic) → **Repositories** (data access). All database operations are async. WebSocket connections are managed by an in-memory connection manager that maps user IDs to active sockets.

**Frontend** uses React Query for server state with optimistic updates (likes update instantly, roll back on failure). Zustand stores auth state. WebSocket provides real-time push for messages and notifications, with reduced-interval polling as fallback.

**Feed ranking** scores posts by engagement: `score = (likes × 2) + comments − (age_hours / 6)`. Explore page ranks communities by: `score = member_count + (recent_posts_7d × 2)`.

## Features

- **Auth & Verification** — Register, login, verify student email with 6-digit code
- **Communities** — Create, join, leave, edit, delete (soft delete), manage members
- **Posts** — Text and image posts, likes with optimistic updates, comments with infinite scroll
- **Feed** — Engagement-ranked home feed from joined communities
- **Explore** — Discover trending communities across your university
- **Messaging** — Real-time 1:1 conversations via WebSocket
- **Notifications** — Like, comment, message, and follow notifications with deduplication
- **Profiles** — Public profiles with post history and community memberships
- **Search** — Search users and communities with instant results

## Getting Started

### Prerequisites

- Docker & Docker Compose
- (Optional) Node.js 20+ and Python 3.12+ for local development

### Quick Start (Docker)

```bash
# Clone the repository
git clone https://github.com/rmawnn/UniVerse.git
cd UniVerse

# Copy environment template
cp backend/.env.example backend/.env

# Start all services
docker compose up --build

# Run database migrations (in another terminal)
docker compose exec backend alembic upgrade head

# (Optional) Seed demo data
docker compose exec backend python -m scripts.seed_demo
```

The app will be available at:
- **Web:** http://localhost:3000
- **API:** http://localhost:8000/api/v1
- **API Docs:** http://localhost:8000/docs

### Local Development

**Backend:**
```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # or .venv\Scripts\activate on Windows
pip install -r requirements.txt

# Start PostgreSQL locally and update backend/.env with your credentials
alembic upgrade head
uvicorn app.main:app --reload
```

**Web:**
```bash
cd web
npm install
npm run dev
```

**Mobile:**
```bash
cd mobile
npm install
npx expo start
```

### Demo Accounts

After running the seed script, these accounts are available (password: `Demo1234!`):

| Email | Role |
|-------|------|
| alice@stanford.edu | CS Study Group admin |
| bob@stanford.edu | Startup Hub admin |
| carol@stanford.edu | ML Research admin |
| dave@mit.edu | Cross-university user |
| eve@stanford.edu | Photography Club admin |

## Project Structure

```
UniVerse/
├── backend/                # FastAPI backend
│   ├── app/
│   │   ├── api/v1/routes/  # REST + WebSocket endpoints
│   │   ├── core/           # Config, database, security, WS manager
│   │   ├── models/         # SQLAlchemy ORM models
│   │   ├── repositories/   # Data access layer
│   │   ├── schemas/        # Pydantic request/response schemas
│   │   └── services/       # Business logic
│   ├── alembic/            # Database migrations
│   └── scripts/            # Seed data, utilities
├── web/                    # Next.js web frontend
│   └── src/
│       ├── api/            # API client functions
│       ├── app/            # Pages (App Router)
│       ├── components/     # React components
│       ├── hooks/          # Custom hooks (WebSocket, infinite scroll)
│       └── store/          # Zustand auth store
├── mobile/                 # React Native (Expo) mobile app
│   └── src/
│       ├── screens/        # Screen components
│       ├── navigation/     # React Navigation setup
│       └── api/            # API client functions
└── docker-compose.yml      # Full-stack orchestration
```

## Screenshots

<!-- Add screenshots here -->

| Screen | Description |
|--------|-------------|
| Feed | Engagement-ranked posts from joined communities |
| Explore | Trending communities with join actions |
| Community | Community detail with posts and member management |
| Chat | Real-time 1:1 messaging with WebSocket |
| Notifications | Activity feed with actor avatars and read states |
| Profile | User profile with posts and community memberships |
| Search | User and community search with instant results |

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /auth/register | Create account |
| POST | /auth/login | Get JWT tokens |
| POST | /verification/send | Send verification email |
| POST | /verification/confirm | Confirm 6-digit code |
| GET | /feed | Ranked home feed |
| GET | /explore/communities | Trending communities |
| GET/POST | /communities | List/create communities |
| POST | /communities/:id/join | Join community |
| GET/POST | /posts | List/create posts |
| POST | /posts/:id/like | Toggle like |
| GET/POST | /posts/:id/comments | List/create comments |
| GET/POST | /conversations | List/start conversations |
| GET/POST | /conversations/:id/messages | Chat messages |
| GET/PATCH | /notifications | List/mark-read |
| WS | /ws | Real-time events |

Full interactive docs available at `/docs` when the server is running.

## License

This project was built as a university capstone project.
