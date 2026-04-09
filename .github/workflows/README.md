# CI/CD Workflows

This repo uses **GitHub Actions** for continuous integration and continuous
delivery. All workflows live in `.github/workflows/`.

## Pipeline overview

```
┌─────────────────┐       ┌────────────────────────────────┐
│ push / PR to    │  ───▶ │ ci.yml                         │
│ main            │       │  ├─ backend  (pytest + PG 16)  │
└─────────────────┘       │  ├─ web      (tsc + lint + build)
                          │  └─ mobile   (tsc)             │
                          └──────────────┬─────────────────┘
                                         │  on success
                                         ▼
                          ┌────────────────────────────────┐
                          │ deploy.yml (push to main only) │
                          │  ├─ deploy-web                 │
                          │  └─ deploy-backend             │
                          └────────────────────────────────┘
```

## `ci.yml` — Continuous Integration

Runs on every push to `main` and every pull request targeting `main`. Three
jobs execute in parallel:

| Job | Purpose | Notes |
|---|---|---|
| **backend** | Runs the FastAPI test suite with `pytest` | Spins up a Postgres 16 service container, waits for health, injects DB env vars, then runs all tests under `backend/tests/`. |
| **web** | Type-checks, lints, and builds the Next.js app | Uploads the `.next` build output as an artifact for inspection / CD reuse. |
| **mobile** | Type-checks the Expo React Native app | Full native builds run on EAS separately — CI only verifies types. |

All three jobs cache their package managers (`pip`, `npm`) keyed off the
lockfile, so warm runs are fast.

## `deploy.yml` — Continuous Delivery

Triggered by the `workflow_run` event: it waits for `ci.yml` to finish
successfully on `main`, then runs the deploy jobs. The current file contains
**placeholder deploy steps** with commented-out examples for Vercel, Netlify,
Fly.io, Railway, Render, and SSH-based Docker deploys — replace the placeholder
`echo` line with whichever one matches your hosting before enabling.

## Required repository secrets

When you wire up real deployment, add the relevant secrets under
**Settings → Secrets and variables → Actions**:

| Target | Secrets |
|---|---|
| Vercel | `VERCEL_TOKEN` |
| Netlify | `NETLIFY_AUTH_TOKEN`, `NETLIFY_SITE_ID` |
| Fly.io | `FLY_API_TOKEN` |
| Railway | `RAILWAY_TOKEN` |
| Render | `RENDER_DEPLOY_HOOK` |
| SSH server | `SSH_HOST`, `SSH_USER`, `SSH_KEY` |
