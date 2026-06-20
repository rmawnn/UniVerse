# UniVerse Production Deployment Guide

**Domain:** `universe-network.xyz`
**Date:** 2026-06-21

---

## Domain Architecture

| Subdomain | Provider | Purpose |
|---|---|---|
| `app.universe-network.xyz` | Vercel | Frontend (Next.js) |
| `api.universe-network.xyz` | Render | Backend API (FastAPI) |
| `universe-network.xyz` | Vercel | Redirect → `app.universe-network.xyz` |
| `www.universe-network.xyz` | Vercel | Redirect → `app.universe-network.xyz` |
| `noreply@universe-network.xyz` | Resend | Transactional email sender |

---

## STEP 1 — Namecheap DNS Records

Go to **Namecheap → Domain List → universe-network.xyz → Advanced DNS**.

Delete any existing parking/redirect records, then add these:

### Core DNS Records

| Type | Host | Value | TTL | Purpose |
|---|---|---|---|---|
| `CNAME` | `app` | `cname.vercel-dns.com.` | Automatic | Frontend → Vercel |
| `CNAME` | `www` | `cname.vercel-dns.com.` | Automatic | www redirect → Vercel |
| `A` | `@` | `76.76.21.21` | Automatic | Root domain → Vercel |
| `CNAME` | `api` | *(your-service-name)*.onrender.com. | Automatic | Backend → Render |

> **Note:** Replace `(your-service-name).onrender.com` with the actual hostname Render gives you after creating the service (Step 3). It looks like `universe-api-xxxx.onrender.com`.

### Resend Email DNS Records (add after Step 5)

| Type | Host | Value | TTL | Purpose |
|---|---|---|---|---|
| `TXT` | `@` | `v=spf1 include:send.resend.com ~all` | Automatic | SPF — authorizes Resend to send |
| `CNAME` | `resend._domainkey` | *(value from Resend dashboard)* | Automatic | DKIM — email signature |
| `CNAME` | *(2nd DKIM host from Resend)* | *(2nd DKIM value from Resend)* | Automatic | DKIM record 2 |
| `CNAME` | *(3rd DKIM host from Resend)* | *(3rd DKIM value from Resend)* | Automatic | DKIM record 3 |

> **Note:** Resend gives you the exact DKIM records when you add your domain. Copy them exactly as shown.

---

## STEP 2 — Vercel Deployment (Frontend)

### 2.1 — Create Project

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import your GitHub repository
3. Set **Root Directory** to `web`
4. Framework preset: **Next.js** (auto-detected)
5. **Do not deploy yet** — set environment variables first

### 2.2 — Environment Variables

Go to **Project Settings → Environment Variables** and add:

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_API_URL` | `https://api.universe-network.xyz/api/v1` |
| `NEXT_PUBLIC_SUPABASE_URL` | Copy from `web/.env.local` → `NEXT_PUBLIC_SUPABASE_URL` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Copy from `web/.env.local` → `NEXT_PUBLIC_SUPABASE_ANON_KEY` |

> **Important:** `NEXT_PUBLIC_*` variables are inlined at build time. You must redeploy after changing them.

### 2.3 — Custom Domains

Go to **Project Settings → Domains** and add:

1. `app.universe-network.xyz` (primary)
2. `universe-network.xyz` (redirect to `app.universe-network.xyz`)
3. `www.universe-network.xyz` (redirect to `app.universe-network.xyz`)

Vercel will show a checkmark once DNS propagates (after adding the DNS records from Step 1).

### 2.4 — Build Settings (auto-detected, verify these)

| Setting | Value |
|---|---|
| Build Command | `npm run build` |
| Output Directory | `.next` |
| Install Command | `npm ci` |
| Node.js Version | 22.x |

### 2.5 — Deploy

Click **Deploy**. Vercel will build the Next.js app with the production environment variables baked in.

**SSL:** Automatic (Vercel provisions Let's Encrypt certificates for all custom domains).

---

## STEP 3 — Render Deployment (Backend)

### 3.1 — Create Web Service

1. Go to [dashboard.render.com/new/web-service](https://dashboard.render.com/new/web-service)
2. Connect your GitHub repository
3. Set **Root Directory** to `backend`
4. **Environment:** Python 3
5. **Region:** Choose the closest to your Supabase region (Asia Pacific if using `ap-northeast-1`)

### 3.2 — Build & Start Commands

| Setting | Value |
|---|---|
| Build Command | `pip install -r requirements.txt && python -m alembic upgrade head` |
| Start Command | `uvicorn app.main:app --host 0.0.0.0 --port $PORT --workers 4` |
| Health Check Path | `/api/v1/health` |

### 3.3 — Environment Variables

Go to **Environment** tab and add each variable.

> **Copy all values from `backend/.env`** — it has every variable ready. The list below shows the variable names and which ones contain secrets:

```
ENVIRONMENT=production
DEBUG=False
SECRET_KEY=                         ← copy from backend/.env
DB_USER=                            ← copy from backend/.env
DB_PASSWORD=                        ← copy from backend/.env (secret)
DB_HOST=                            ← copy from backend/.env
DB_PORT=5432
DB_NAME=postgres
DATABASE_POOL_SIZE=5
DATABASE_MAX_OVERFLOW=10
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7
SUPABASE_URL=                       ← copy from backend/.env
SUPABASE_ANON_KEY=                  ← copy from backend/.env
SUPABASE_SERVICE_ROLE_KEY=          ← copy from backend/.env (secret)
LLM_PROVIDER=gemini
GOOGLE_AI_API_KEY=                  ← copy from backend/.env (secret)
EMAIL_PROVIDER=resend
EMAIL_FROM=UniVerse <noreply@universe-network.xyz>
RESEND_API_KEY=                     ← copy from backend/.env (secret)
FRONTEND_URL=https://app.universe-network.xyz
CORS_ORIGINS=["http://localhost:3000","https://app.universe-network.xyz","https://universe-network.xyz","https://www.universe-network.xyz"]
```

### 3.4 — Custom Domain

1. Go to **Settings → Custom Domains**
2. Add `api.universe-network.xyz`
3. Render will show you a CNAME target (e.g., `universe-api-xxxx.onrender.com`)
4. Use that value in the Namecheap DNS record from Step 1

**SSL:** Automatic (Render provisions certificates for custom domains).

### 3.5 — Deploy

Click **Manual Deploy → Deploy latest commit**.

After the first deploy, verify the health check:
```
curl https://api.universe-network.xyz/api/v1/health
# Expected: {"status":"ok"}
```

---

## STEP 4 — Supabase (Already Configured)

Your Supabase project is already connected and migrations are at head. No changes needed.

Verify in the Supabase dashboard:
1. **Settings → API** — confirm URL and keys match the env vars above
2. **Database → Tables** — confirm tables exist (users, posts, communities, etc.)
3. **Storage → Buckets** — confirm buckets exist (avatars, posts, verification-docs, attachments, resumes)

---

## STEP 5 — Resend Domain Verification

### 5.1 — Add Domain

1. Go to [resend.com/domains](https://resend.com/domains)
2. Click **Add Domain**
3. Enter: `universe-network.xyz`
4. Resend will show you DNS records to add

### 5.2 — Add DNS Records

Resend will give you records like these (exact values from their dashboard):

| Type | Host | Value |
|---|---|---|
| `TXT` | `@` | `v=spf1 include:send.resend.com ~all` |
| `CNAME` | `resend._domainkey` | *(copy from Resend)* |
| `CNAME` | *(2nd host)* | *(copy from Resend)* |
| `CNAME` | *(3rd host)* | *(copy from Resend)* |

Add these to Namecheap under **Advanced DNS** (see Step 1 table).

### 5.3 — Verify

1. After adding DNS records, click **Verify** in the Resend dashboard
2. DNS propagation can take up to 48 hours (usually 5-30 minutes)
3. Once verified, Resend shows a green checkmark

### 5.4 — Production EMAIL_FROM

The backend is already configured to use:

```
EMAIL_FROM=UniVerse <noreply@universe-network.xyz>
```

This will work once the domain is verified in Resend.

---

## STEP 6 — Post-Deployment Verification

After all services are deployed and DNS has propagated:

### 6.1 — Health Checks

```bash
# Backend health
curl https://api.universe-network.xyz/api/v1/health
# Expected: {"status":"ok"}

# Frontend loads
curl -I https://app.universe-network.xyz
# Expected: HTTP/2 200

# Root redirect
curl -I https://universe-network.xyz
# Expected: 308 redirect to https://app.universe-network.xyz

# www redirect
curl -I https://www.universe-network.xyz
# Expected: 308 redirect to https://app.universe-network.xyz
```

### 6.2 — Feature Verification

1. Open `https://app.universe-network.xyz`
2. Register a new account
3. Verify email (check inbox for code from `noreply@universe-network.xyz`)
4. Login
5. Visit feed page
6. Visit communities
7. Try the AI demo page
8. Visit admin panel (if admin user)

### 6.3 — SSL Verification

Both Vercel and Render provision SSL certificates automatically. Verify:
- `https://app.universe-network.xyz` shows padlock
- `https://api.universe-network.xyz` shows padlock
- No mixed content warnings in browser console

---

## Repository Changes Made

| File | Change |
|---|---|
| `backend/.env` | Set `EMAIL_FROM` to `noreply@universe-network.xyz`, `FRONTEND_URL` to `app.universe-network.xyz`, `CORS_ORIGINS` with all production domains |
| `backend/.env.example` | Updated with production domain examples |
| `web/.env.example` | Updated API URL example to `api.universe-network.xyz` |

---

## Deployment Order (Step-by-Step Checklist)

Follow this exact order:

```
[ ] 1. Push all code changes to GitHub (main branch)
[ ] 2. Create Render web service (Step 3)
       → Copy the Render hostname (e.g., universe-api-xxxx.onrender.com)
[ ] 3. Add DNS records in Namecheap (Step 1)
       → Use the Render hostname for the api CNAME
[ ] 4. Create Vercel project (Step 2)
       → Set environment variables
       → Add custom domains
[ ] 5. Add domain in Resend (Step 5)
       → Add DKIM/SPF DNS records to Namecheap
       → Wait for verification
[ ] 6. Deploy on Render (build + start)
       → Verify health check: GET /api/v1/health
[ ] 7. Deploy on Vercel (trigger build)
       → Verify frontend loads at app.universe-network.xyz
[ ] 8. Wait for DNS propagation (5-30 minutes)
[ ] 9. Run post-deployment verification (Step 6)
[ ] 10. Test email verification flow end-to-end
```

---

## Troubleshooting

| Symptom | Likely Cause | Fix |
|---|---|---|
| Frontend shows "Network error" | Backend CORS doesn't include frontend URL | Check `CORS_ORIGINS` on Render |
| 502 Bad Gateway on api subdomain | Render service not running | Check Render logs, verify start command |
| "Failed to send verification code" (actual error now shown) | Resend domain not verified | Complete Step 5 |
| SSL certificate pending | DNS not propagated | Wait up to 30 minutes |
| Login works but verify doesn't | Frontend built with wrong `NEXT_PUBLIC_API_URL` | Redeploy on Vercel after fixing env var |
| Emails not received | `EMAIL_FROM` domain not verified in Resend | Complete Resend domain verification |
