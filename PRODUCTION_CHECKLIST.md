# UniVerse Production Deployment Checklist

## Security Checklist

- [ ] Set a strong random `SECRET_KEY` (64+ chars) — never use the dev placeholder
- [ ] Set `ENVIRONMENT=production` and `DEBUG=false`
- [ ] Configure `CORS_ORIGINS` to exact production domain(s) only
- [ ] Verify `.env` is in `.gitignore` and not committed to git
- [ ] Set strong `DB_PASSWORD` (not the dev default)
- [ ] Review rate limit thresholds for production traffic levels
- [ ] Enable HTTPS (TLS termination at load balancer or reverse proxy)
- [ ] Set `Strict-Transport-Security` header (auto-enabled in production mode)
- [ ] API docs are auto-disabled in production (`/docs`, `/redoc`, `/openapi.json`)
- [ ] Verify Supabase Storage buckets have correct public/private settings
- [ ] Verify `SUPABASE_SERVICE_ROLE_KEY` is only in backend `.env` (never exposed to frontend)
- [ ] Frontend only has `SUPABASE_ANON_KEY` (safe for browser exposure)
- [ ] Token blocklist is in-memory — consider Redis for multi-instance deployments

## Database Checklist

- [ ] Run `alembic upgrade head` against production database
- [ ] Verify SSL connection to Supabase PostgreSQL works
- [ ] Set `DATABASE_POOL_SIZE` appropriate for your plan (Supabase free: 60 max connections)
- [ ] Enable connection pooling via Supabase pooler if needed (port 6543)
- [ ] Create database backups schedule via Supabase dashboard

## Infrastructure Checklist

- [ ] Configure reverse proxy (nginx/Caddy) with TLS
- [ ] Set up health check monitoring on `/api/v1/health`
- [ ] Configure log aggregation (structured JSON logs from FastAPI)
- [ ] Set up error reporting service (Sentry or similar)
- [ ] Configure container orchestration (Docker Compose production override)
- [ ] Set resource limits on Docker containers (memory, CPU)

## Scalability Checklist

- [ ] Verify Supabase Realtime channel limits for expected user count
- [ ] Configure multiple FastAPI workers (`--workers 4` in production compose)
- [ ] Consider Redis for rate limiting and token blocklist (multi-instance)
- [ ] Consider CDN for static assets and public Storage files
- [ ] Monitor database query performance and add indexes as needed
- [ ] Review React Query `staleTime`/`gcTime` for production traffic patterns

## Pre-Launch

- [ ] Test full auth flow (register → verify → login → refresh → logout)
- [ ] Test file upload flow (avatar, post image, verification document)
- [ ] Test messaging flow (send, receive, typing indicators)
- [ ] Test rate limits are enforced (login, verification, messaging)
- [ ] Test error pages render correctly (404, 500)
- [ ] Run `npm run build` with production env vars
- [ ] Load test critical endpoints (login, feed, messaging)
