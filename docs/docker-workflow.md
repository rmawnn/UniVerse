# Docker Development Workflow

## Architecture

```
┌─────────────────────────────────────────────────────┐
│  Docker Compose                                     │
│                                                     │
│   postgres:5432 ◄── backend:8000 ◄── web:3000      │
│   (port 5433        (port 8000       (port 3000     │
│    on host)          on host)         on host)      │
└──────────────────────────┬──────────────────────────┘
                           │ http://localhost:8000
                           │
              ┌────────────┼────────────┐
              │            │            │
         Web browser   Expo mobile   Expo Android
         localhost:3000 localhost:8000 10.0.2.2:8000
```

**What runs in Docker:** PostgreSQL, FastAPI backend, Next.js web frontend.
**What runs outside:** Expo mobile app (React Native).

---

## Quick Start

### 1. Prerequisites

- Docker Desktop installed and running
- `backend/.env` file exists (copy from `backend/.env.example` if not)

### 2. Start everything

```bash
docker compose up -d
```

This starts:
- **postgres** on host port `5433` (container port 5432)
- **backend** on host port `8000` (with `--reload` for hot-reload)
- **web** on host port `3000` (with HMR via volume mount)

### 3. First-time setup (run migrations)

```bash
docker compose exec backend alembic upgrade head
```

### 4. Open in browser

- Web app: http://localhost:3000
- API docs: http://localhost:8000/docs
- API health: http://localhost:8000/api/v1/health

---

## Common Commands

### Start / stop

```bash
docker compose up -d          # start all services (detached)
docker compose down           # stop all services
docker compose down -v        # stop AND delete database volume (full reset)
```

### Logs

```bash
docker compose logs -f            # all services, follow
docker compose logs -f backend    # backend only
docker compose logs -f postgres   # postgres only
docker compose logs -f web        # web only
```

### Run migrations

```bash
docker compose exec backend alembic upgrade head          # apply all
docker compose exec backend alembic revision --autogenerate -m "description"  # create new
docker compose exec backend alembic downgrade -1          # rollback last
```

### Database access

```bash
# psql inside the container
docker compose exec postgres psql -U postgres -d universe_db

# or from host (needs psql installed locally)
psql -h localhost -p 5433 -U postgres -d universe_db
```

### Reset database completely

```bash
docker compose down -v              # removes the pgdata volume
docker compose up -d                # recreates a fresh database
docker compose exec backend alembic upgrade head   # re-run migrations
```

### Rebuild after Dockerfile changes

```bash
docker compose build               # rebuild all images
docker compose up -d --build        # rebuild and restart
```

---

## Mobile App (Not Dockerized)

The Expo mobile app runs outside Docker and connects to the dockerized backend.

### Start the mobile app

```bash
cd mobile
npx expo start
```

### How mobile connects to the backend

The mobile API client (`mobile/src/api/client.ts`) already handles this:

| Platform | Backend URL | Why |
|---|---|---|
| **Android emulator** | `http://10.0.2.2:8000` | Android emulator maps `10.0.2.2` to host machine |
| **iOS simulator** | `http://localhost:8000` | iOS simulator shares the host network |
| **Expo web** | `http://localhost:8000` | Runs in host browser |
| **Physical device** | `http://<YOUR_LAN_IP>:8000` | Must be on the same WiFi network |

For physical devices, you need to:
1. Find your LAN IP: `ipconfig` (Windows) or `ifconfig` (Mac/Linux)
2. Temporarily update `mobile/src/api/client.ts` to use that IP
3. Make sure CORS includes that IP in `backend/.env`

---

## Port Map

| Service | Container port | Host port | Reason |
|---|---|---|---|
| postgres | 5432 | **5433** | Avoids conflict with local PostgreSQL (default 5432) |
| backend | 8000 | 8000 | Mobile app expects this port |
| web | 3000 | 3000 | Standard Next.js dev port |

---

## Environment Variables

### Backend (`backend/.env`)

The backend reads from `backend/.env`. Docker-compose overrides:
- `DB_HOST=postgres` (service name, not localhost)
- `DB_PORT=5432` (container-internal port)

You do NOT need to change `backend/.env` when switching between Docker and local dev if you keep `DB_HOST=localhost` in the file — docker-compose overrides it automatically.

### Web

The web frontend uses `NEXT_PUBLIC_API_URL` which defaults to `http://localhost:8000/api/v1`. This is set in `docker-compose.yml` and works for both Docker and local dev because the browser (not the container) makes the API calls.

### Summary

| Variable | Local dev | Docker dev | Notes |
|---|---|---|---|
| `DB_HOST` | `localhost` | overridden to `postgres` | compose handles this |
| `DB_PORT` | `5432` | overridden to `5432` | internal container port |
| `NEXT_PUBLIC_API_URL` | not needed (defaults) | set in compose | browser calls localhost:8000 |

---

## What Should NOT Be Containerized

| Component | Reason |
|---|---|
| **Mobile (Expo)** | Requires native SDKs, device emulators, and Expo DevTools. Docker can't run iOS/Android simulators. EAS Build handles production builds. |
| **IDE / editor** | Obviously stays on host |
| **node_modules** (web) | Bind-mounted from host but excluded in container via anonymous volume for platform compatibility |

---

## Troubleshooting

### "port 5433 already in use"

Another process is using port 5433. Find it:
```bash
# Windows
netstat -ano | findstr :5433
# Mac/Linux
lsof -i :5433
```

### Backend can't connect to postgres

1. Check postgres is healthy: `docker compose ps`
2. Check logs: `docker compose logs postgres`
3. Make sure `backend/.env` exists and has `DB_PASSWORD` set

### Web shows network errors

The browser calls `localhost:8000`. Make sure:
1. Backend container is running: `docker compose ps`
2. CORS includes `http://localhost:3000` in `backend/.env`

### Mobile can't reach backend

1. Make sure backend is running on port 8000
2. Android emulator: verify `10.0.2.2` is used (check `mobile/src/api/client.ts`)
3. Physical device: use LAN IP and add it to `CORS_ORIGINS`
