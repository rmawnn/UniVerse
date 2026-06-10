# ──────────────────────────────────────────────────────────────
# UniVerse Web — Production Dockerfile
#
# Multi-stage build for Next.js 14 with standalone output.
# Final image is ~150 MB (node:22-alpine + standalone bundle).
#
# Build args (set via docker-compose or --build-arg):
#   NEXT_PUBLIC_API_URL         — Backend API base URL
#   NEXT_PUBLIC_SUPABASE_URL    — Supabase project URL
#   NEXT_PUBLIC_SUPABASE_ANON_KEY — Supabase anon key
# ──────────────────────────────────────────────────────────────

# ── Stage 1: Install dependencies ────────────────────────────
FROM node:22-alpine AS deps

WORKDIR /app

# Install dependencies needed for native modules (if any)
RUN apk add --no-cache libc6-compat

# Copy lockfile first for layer caching
COPY package.json package-lock.json ./

# Clean install from lockfile (deterministic)
RUN npm ci

# ── Stage 2: Build the application ───────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

# Copy installed node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy source code
COPY . .

# Next.js collects telemetry by default — disable it
ENV NEXT_TELEMETRY_DISABLED=1

# Build-time environment variables (NEXT_PUBLIC_* are inlined at build time)
ARG NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
ARG NEXT_PUBLIC_SUPABASE_URL=
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY=

ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY

# Build Next.js in production mode (triggers standalone output)
ENV NODE_ENV=production
RUN npm run build

# Ensure public directory exists (some projects don't have one)
RUN mkdir -p public

# ── Stage 3: Production runner ───────────────────────────────
FROM node:22-alpine AS runner

WORKDIR /app

# Production hardening
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Run as non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy only what the standalone server needs:

# 1. Public assets (favicons, static files, etc.)
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# 2. Static build output (JS/CSS chunks, prerendered pages)
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# 3. Standalone server bundle (includes minimal node_modules)
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# The standalone output produces a self-contained server.js
CMD ["node", "server.js"]
