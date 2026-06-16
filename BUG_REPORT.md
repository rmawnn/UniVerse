# UniVerse V2 — Full Product Verification Bug Report

**Date:** 2026-06-09  
**Tested by:** Automated API + Browser verification  
**Backend:** FastAPI @ http://localhost:8000  
**Frontend:** Next.js @ http://localhost:3000  
**Database:** Supabase PostgreSQL (session-mode pooler)  

---

## Test Summary

| Metric | Count |
|--------|-------|
| Total API tests | 80 |
| PASS | 70 |
| FAIL | 8 |
| WARN | 2 |
| Pass rate | 87.5% |

---

## CRITICAL (Blocks core functionality)

### BUG-001: Verification endpoint returns 500 — Missing DB columns

**Severity:** CRITICAL  
**Affects:** ALL new users — completely blocks onboarding  

**Page:** `/verify` (frontend), `POST /api/v1/verification/email/send` (backend)  
**Action:** Click "Send verification code" on the verification page  
**Network response:** `500 Internal Server Error`  
**Endpoint:** `POST /api/v1/verification/email/send`  

**Backend cause:**  
`asyncpg.exceptions.UndefinedColumnError: column "ocr_raw_text" of relation "verification_requests" does not exist`

The `VerificationRequest` model (`app/models/verification_request.py`) defines 11 columns that do not exist in the actual database table:
- `ocr_raw_text` (Text)
- `ocr_extracted_data` (JSONB)
- `ai_confidence` (Float)
- `ai_flags` (JSONB)
- `ai_validation_details` (JSONB)
- `reviewed_by` (UUID FK)
- `reviewed_at` (DateTime)
- `attempt_number` (Integer)
- `file_size_bytes` (Integer)
- `file_content_type` (String)
- `file_hash` (String)

The migration `a0c51331b0b0_add_document_verification_fields.py` only added `verification_method`, `document_url`, and `code_hash`. No subsequent migration was created for the remaining columns.

**Frontend cause:** Frontend correctly calls the endpoint; error is purely server-side.

**Cascade impact:**  
- `GET /api/v1/verification/status` also returns 500 (same underlying query)
- `GET /api/v1/verification/history` also returns 500 (same underlying query)
- Unverified users are redirected to `/verify` on every page → **entire app is unusable for new users**
- Communities cannot be created (requires verified user)
- Posts cannot be created (requires verified user)
- Messages cannot be sent (requires verified user)

**Reproduction steps:**
1. Register a new account at `http://localhost:3000/register`
2. Login succeeds, redirected to `/verify`
3. Enter any valid university email (e.g., `student@testuni.edu`)
4. Click "Send verification code"
5. Red error banner appears: "Failed to send verification code."
6. Try navigating to any other page (e.g., `/explore`, `/communities`) → redirected back to `/verify`

**Recommended fix:**  
Create an Alembic migration to add the 11 missing columns to the `verification_requests` table:
```bash
cd backend
alembic revision --autogenerate -m "add_missing_verification_columns"
alembic upgrade head
```

---

## HIGH (Major feature broken or degraded)

### BUG-002: WebSocket URL routing mismatch — real-time features broken

**Severity:** HIGH  
**Affects:** Real-time messaging, typing indicators, notifications, online presence  

**Page:** All pages using WebSocket (messages, notifications)  
**Action:** Frontend attempts WebSocket connection on page load  
**Network response:** `403 Forbidden` at `ws://localhost:8000/ws`  
**Endpoint:** `GET /ws` (frontend) vs `GET /api/v1/ws` (backend)  

**Frontend cause:**  
In `web/lib/hooks/useWebSocket.ts`, line 35:
```typescript
const WS_BASE = API_URL.replace(/^http/, "ws").replace(/\/api\/v1\/?$/, "");
```
This strips `/api/v1` from the base URL, producing `ws://localhost:8000`, then connects to `${WS_BASE}/ws?token=...` → `ws://localhost:8000/ws`.

**Backend cause:**  
The WebSocket route is registered at `/api/v1/ws` (via `v1_router.include_router(ws_router, tags=["WebSocket"])`), but the frontend connects to `/ws` (without the prefix).

**Verified:**
- `ws://localhost:8000/ws?token=...` → `403 Forbidden` (wrong path)
- `ws://localhost:8000/api/v1/ws?token=...` → `101 Switching Protocols` (correct path)

**Reproduction steps:**
1. Login as any verified user
2. Open browser DevTools → Network tab → filter "WS"
3. Navigate to `/messages`
4. Observe WebSocket connection attempt to `ws://localhost:8000/ws?token=...`
5. Connection fails with 403
6. Typing indicators and real-time message delivery do not work

**Recommended fix:**  
In `web/lib/hooks/useWebSocket.ts`, change the WS_BASE derivation to keep the API prefix:
```typescript
const WS_BASE = API_URL.replace(/^http/, "ws");
// Then connect to: `${WS_BASE}/ws?token=${token}`
```
Or mount the WS router at the root level in `app/main.py` instead of under `v1_router`.

---

### BUG-003: "Forgot password?" is a dead link — no backend implementation

**Severity:** HIGH  
**Affects:** Any user who forgets their password  

**Page:** `/login`  
**Action:** Click "Forgot password?" link  
**Network response:** N/A (no request made)  
**Endpoint:** None exists  

**Frontend cause:**  
In `web/app/(auth)/login/page.tsx`, line 109:
```tsx
<Link href="#" className="font-medium text-brand-blue hover:underline">
    Forgot password?
</Link>
```
The link points to `#` — it does nothing.

**Backend cause:**  
No password reset / forgot password endpoint exists anywhere in the backend (`app/api/v1/routes/auth.py` only has `/register`, `/login`, `/refresh`, `/logout`).

**Reproduction steps:**
1. Go to `http://localhost:3000/login`
2. Click "Forgot password?"
3. Nothing happens — page scrolls to top

**Recommended fix:**  
Either implement a full password reset flow (send reset email, confirm token, set new password) or remove the "Forgot password?" link until it's implemented to avoid confusing users.

---

## MEDIUM (Feature partially broken or inconsistent)

### BUG-004: `/trending` root path returns 404 — sub-routes work fine

**Severity:** MEDIUM  
**Affects:** Any frontend component that calls `/api/v1/trending` directly  

**Page:** Trending content section  
**Action:** `GET /api/v1/trending`  
**Network response:** `404 Not Found`  
**Endpoint:** `GET /trending`  

**Backend cause:**  
The trending router (`app/api/v1/routes/trending.py`) only defines sub-routes:
- `GET /trending/posts` (works, returns `[]` or data)
- `GET /trending/communities` (works, returns data)
- `GET /trending/jobs` (works, returns data)

There is no root `/trending` endpoint. If the frontend expects a combined trending response at `/trending`, it gets 404.

**Frontend cause:**  
If the frontend hits `/trending` expecting a combined response, the route doesn't exist.

**Verified:**
- `GET /api/v1/trending` → `404 Not Found`
- `GET /api/v1/trending/posts` → `200 OK` (empty array or data)
- `GET /api/v1/trending/communities` → `200 OK` (3 items)
- `GET /api/v1/trending/jobs` → `200 OK` (1 item)

**Reproduction steps:**
1. `curl http://localhost:8000/api/v1/trending` → 404
2. `curl http://localhost:8000/api/v1/trending/posts` → 200

**Recommended fix:**  
Either add a combined `/trending` root endpoint or update the frontend to use the individual sub-routes.

---

### BUG-005: Admin panel not testable — no known admin credentials

**Severity:** MEDIUM  
**Affects:** Admin dashboard testing coverage  

**Page:** `/admin`  
**Action:** Login as admin to test admin features  
**Network response:** N/A  
**Endpoint:** All `/api/v1/admin/*` endpoints  

**Details:**  
The admin user exists in the DB (`arman` / `armanbahosh@gmail.com` / role=admin) but the password is unknown to automated testing. All admin endpoints return `403` for non-admin users (correct behavior). Admin access control is verified as working.

The following admin endpoints could NOT be tested for functional correctness:
- `GET /admin/stats` — Dashboard stats
- `GET /admin/recent-activity` — Recent activity
- `GET /admin/moderation` — Moderation queue
- `GET /admin/users` — User management
- `GET /admin/verifications` — Verification management
- `GET /admin/reports` — Report management
- `GET /admin/communities` — Community management
- `GET /admin/posts` — Post management
- `PATCH /admin/verifications/{id}/approve` — Approve verification
- `PATCH /admin/verifications/{id}/reject` — Reject verification
- `PATCH /admin/users/{id}/role` — Change user role
- `PATCH /admin/users/{id}/deactivate` — Deactivate user

**Note:** Admin access control (403 for non-admin) is confirmed working correctly.

**Reproduction steps:**
1. Try logging in with `arman` / any test password → `401 Unauthorized`
2. All admin endpoints correctly return 403 for non-admin users

**Recommended fix:**  
Provide test admin credentials or create a seed script that sets a known admin password for development environments.

---

### ~~BUG-006~~ RETRACTED: Follow/unfollow response is correct

**Status:** FALSE POSITIVE — initial test checked wrong field name (`following` vs `is_following`)

**Actual response:**
- `POST /users/{id}/follow` → `200 OK`, `{"followers_count": 1, "following_count": 0, "is_following": true}`
- `DELETE /users/{id}/follow` → `200 OK`, `{"followers_count": 0, "following_count": 0, "is_following": false}`

Follow/unfollow works correctly. No fix needed.

---

## LOW (Minor issues, cosmetic, or edge cases)

### BUG-007: Logout returns 204 No Content (no response body)

**Severity:** LOW  
**Affects:** Frontend logout handling  

**Page:** Any page with logout functionality  
**Action:** Logout  
**Network response:** `204 No Content`  
**Endpoint:** `POST /api/v1/auth/logout`  

**Details:**  
The logout endpoint returns `204 No Content` which is a valid HTTP response for a successful action with no body. However, if the frontend expects a `200 OK` with a body (e.g., `{"message": "Logged out"}`), it may mishandle the response. This is by design in the route definition (`status_code=204`) but worth documenting.

**Reproduction steps:**
1. Login as any user
2. `POST /api/v1/auth/logout` with `{"refresh_token": "..."}`
3. Response: `204 No Content` (empty body)

**Recommended fix:**  
No fix needed if the frontend correctly handles 204. If issues arise, standardize on 200 with a body.

---

### BUG-008: "SSO (Shibboleth)" and "Google" login buttons are non-functional

**Severity:** LOW  
**Affects:** Login page UI  

**Page:** `/login`  
**Action:** Click "SSO (Shibboleth)" or "Google" buttons  
**Network response:** N/A  

**Details:**  
The login page displays "or continue with" followed by "SSO (Shibboleth)" and "Google" buttons. No SSO or Google OAuth backend integration exists. These buttons are presumably placeholders for future features.

**Reproduction steps:**
1. Go to `http://localhost:3000/login`
2. Observe "SSO (Shibboleth)" and "Google" buttons below the login form
3. Clicking either does nothing or shows an error

**Recommended fix:**  
Either implement the OAuth flows or hide these buttons until they're functional, to avoid confusing users.

---

## Features Verified as Working (70/80 tests passed)

### AUTH (7/7 PASS)
- [x] Register new user (201)
- [x] Login with email (200)
- [x] Login with username (200)
- [x] Wrong password rejected (401)
- [x] Token refresh (200)
- [x] Logout (204)
- [x] Duplicate registration rejected (409)

### PROFILE (6/6 PASS)
- [x] Get my profile (200)
- [x] Get my status (200)
- [x] Edit profile name + bio (200)
- [x] Get user insights (200)
- [x] Get notification settings (200)
- [x] Change password (200)

### FOLLOW/UNFOLLOW (6/6 PASS — but see BUG-006 re: null field)
- [x] Follow user (200)
- [x] View other user's profile (200)
- [x] List followers (200)
- [x] List following (200)
- [x] Unfollow user (200)
- [x] Get follow suggestions (200)

### FEED (2/2 PASS)
- [x] Home feed for verified user (200)
- [x] Home feed for normal user (200)

### JOBS (12/12 PASS)
- [x] Create job (201)
- [x] List jobs (200)
- [x] Get single job (200)
- [x] Save job (200)
- [x] List saved jobs (200)
- [x] Unsave job (200)
- [x] Apply to job (201)
- [x] List job applications as owner (200)
- [x] Get job stats (200)
- [x] List my applications (200)
- [x] Job recommendations (200)
- [x] Job search with query (200)

### NOTIFICATIONS (3/3 PASS)
- [x] List notifications (200)
- [x] Mark single notification read (200)
- [x] Mark all notifications read (200)

### SEARCH (4/4 PASS)
- [x] Unified search (200) — users, communities, posts, jobs
- [x] User search (200)
- [x] Community search (200)
- [x] Unauthenticated search rejected (401)

### EXPLORE (3/3 PASS)
- [x] Explore page authenticated (200)
- [x] Explore page unauthenticated (200)
- [x] Explore communities (200)

### UPLOADS (7/7 PASS)
- [x] Image upload without file (422)
- [x] Avatar upload without file (422)
- [x] Resume upload without file (422)
- [x] CV upload without file (422)
- [x] Invalid file type rejected (400)
- [x] Real PNG image upload (200)
- [x] Avatar PNG upload (200)

### SAVED COLLECTIONS (3/3 PASS)
- [x] Create collection (201)
- [x] List collections (200)
- [x] Get collection posts (200)

### STORIES (1/1 PASS)
- [x] List stories feed (200)

### SHORTS (1/1 PASS)
- [x] List shorts (200)

### ACCESS CONTROL (8/8 PASS)
- [x] Non-admin blocked from admin stats (403)
- [x] Non-verified blocked from creating communities (403)
- [x] Non-verified blocked from posting (403)
- [x] 6 protected endpoints return 401 for unauthenticated requests
- [x] Invalid UUID returns 422
- [x] Non-existent resource returns 404

---

## Summary by Severity

| Severity | Count | Impact |
|----------|-------|--------|
| CRITICAL | 1 | Blocks ALL new user onboarding — verification completely broken |
| HIGH | 2 | WebSocket real-time features broken; Forgot password dead link |
| MEDIUM | 2 | Trending root 404; Admin untestable |
| LOW | 2 | Logout 204 body; SSO/Google placeholder buttons |
| **Total** | **7** | |

## Priority Fix Order
1. **BUG-001** (CRITICAL) — Create Alembic migration for missing verification_requests columns
2. **BUG-002** (HIGH) — Fix WebSocket URL in frontend or move WS route to root
3. **BUG-003** (HIGH) — Implement forgot password or remove dead link
4. **BUG-004** (MEDIUM) — Add combined /trending endpoint or fix frontend calls
5. **BUG-005** (MEDIUM) — Create admin test seed script
6. **BUG-007/008** (LOW) — Minor cleanup
