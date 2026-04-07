# CLAUDE.md
## Session Starters
When I say "new feature", always:
1. Read this CLAUDE.md first
2. Follow Critical Code Patterns
3. Check Known Bugs before starting
4. Use csrfFetch never plain fetch
## Workflow Preferences
- After making code changes, DO NOT run build verification, npm run build, or npm run lint
- DO NOT run tests unless explicitly asked
- DO NOT run npm run dev to verify
- Make the changes and STOP — I will verify myself

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

GymBro AI — an AI-powered fitness platform with personalized workout routines, diet plans, coach booking, body/gym photo analysis, and subscription billing. The production app lives in `web-app/`; the root-level Python files (`app.py`, `agent.py`, `database.py`) are a legacy Streamlit prototype.

## Commands

All commands run from `web-app/`:

```bash
cd web-app

# Development
npm run dev          # Start Next.js dev server (localhost:3000)
npm run build        # Production build
npm run start        # Start production server
npm run lint         # ESLint

# E2E tests (Playwright, chromium only)
npx playwright test              # Run all tests
npx playwright test e2e/foo.spec.ts  # Run a single test file
npx playwright test --ui         # Interactive test UI
```

## Architecture

### Dual-app monorepo

| Directory | Stack | Status |
|-----------|-------|--------|
| `web-app/` | Next.js 16 + React 19 + TypeScript + Tailwind 4 | **Production** (Vercel) |
| `gym-ui/` | Next.js (minimal) | Legacy/archived |
| Root `.py` files | Streamlit + SQLite | Legacy prototype |

### web-app structure

- **`app/`** — Next.js App Router. Pages and `app/api/` routes (40+ API endpoints covering auth, profiles, routines, diet, coach, billing, body/gym analysis, admin, analytics).
- **`lib/`** — Core logic:
  - `db.ts` — PostgreSQL connection (Vercel Postgres / Neon serverless), full schema definitions, all DB queries.
  - `ai-agent.ts` / `openai-routine.ts` — LangChain-based AI routine generators (Anthropic Claude or OpenAI GPT-4).
  - `diet-agent.ts` — AI diet plan generation.
  - `auth.ts` — JWT session management (jose).
  - `csrf.ts` — CSRF token protection.
  - `redis.ts` — Optional Upstash Redis caching.
  - `rate-limit.ts` — Per-user rate limiting (requires Redis).
  - `validations.ts` — Zod schemas for input validation.
  - `demo-data.ts` — Mock data for demo/offline mode.
- **`components/`** — React components. `DashboardClient.tsx` is the main dashboard (large file). `Sidebar.tsx` and `BottomNav.tsx` handle navigation.
- **`types/index.ts`** — Shared TypeScript interfaces.
- **`e2e/`** — Playwright test specs.

### Key patterns

- **Path alias**: `@/*` maps to `web-app/*` root (e.g., `@/lib/db`, `@/components/Sidebar`).
- **Auth flow**: JWT tokens via `lib/auth.ts`, Google OAuth optional. `ALLOW_MOCK_AUTH=true` enables mock auth for local dev without a database.
- **AI providers**: Both Anthropic and OpenAI are supported; provider selection happens at the API route level.
- **Database**: PostgreSQL with multiple connection string patterns supported (`POSTGRES_URL`, `DATABASE_URL`, etc.). Schema is defined inline in `lib/db.ts`.
- **Payments**: Razorpay integration for premium subscriptions (Indian market, INR).

### Environment setup

Create `web-app/.env.local` for local dev. See `web-app/ENV_SETUP.md` for full details.

**Required**: `JWT_SECRET`, `POSTGRES_URL` (or `DATABASE_URL`)
**Optional**: `GOOGLE_CLIENT_ID/SECRET`, `RAZORPAY_*`, `UPSTASH_REDIS_*`, `SMTP_*`, `ADMIN_USER_IDS`

## Next.js version note

This project uses Next.js 16 which has breaking changes from earlier versions. Read guides in `node_modules/next/dist/docs/` before making changes to Next.js-specific code. Heed deprecation notices.
## Known Bugs (Do Not Repeat)
- `next.config.ts` is empty — needs CSP/security headers before production
- `ai-agent.ts` and `openai-routine.ts` have duplicate prompt-building logic — fix in both when editing either
- Coach credentials are hardcoded in `lib/coach.ts` — must move to env vars
- Analytics premium check runs AFTER the DB query in `app/api/analytics/route.ts` — should be BEFORE
## High-Traffic Files (Summary)
- `DashboardClient.tsx` — Main dashboard UI. Contains workout display, diet tabs, 
  coach section. DO NOT add logic here, extract to hooks first.
- `lib/db.ts` — All DB queries live here. Schema at top of file.
- `app/api/` — 40+ routes, all follow the Critical Code Patterns above.
- Login page uses plain `fetch` instead of `csrfFetch` — inconsistent with rest of app

## Critical Code Patterns (Always Follow)

### Every API route must start with:
```ts
export const runtime = "nodejs";

const session = await getSession();
if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
await initializeDatabase();
```

### Client-side fetching — ALWAYS csrfFetch:
```ts
import { csrfFetch } from '@/lib/useCsrf'
// Never use plain fetch() for authenticated requests
```

### Input validation:
```ts
const parsed = safeParseWithError(YourSchema, await request.json().catch(() => ({})));
if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 });
```

### Redis caching:
```ts
const cacheKey = `feature:${session.userId}`;
const cached = await redisGetJson<YourType>(cacheKey);
if (cached) return NextResponse.json(cached);
// fetch from DB...
await redisSetJson(cacheKey, data, 60);
```