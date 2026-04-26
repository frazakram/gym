# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Session Starters
When I say "new feature", always:
1. Read this CLAUDE.md first
2. Follow Critical Code Patterns
3. Check Known Bugs before starting
4. Use csrfFetch never plain fetch

## Workflow Preferences
- After making code changes, DO NOT run build verification, npm run build, or npm run lint.
- Root `.py` files (`app.py`, `agent.py`, `database.py`) are a legacy Streamlit prototype — do not modify.

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

- **`app/`** — Next.js App Router pages: `dashboard/`, `login/`, `onboarding/`, `coach/`, `demo/`, `admin/`. All API routes live in `app/api/`.
- **`app/api/`** — 40+ endpoints: `auth/`, `routine/`, `routines/`, `diet/`, `coach/`, `coaches/`, `body/`, `gym/`, `profile/`, `analytics/`, `billing/`, `measurements/`, `notes/`, `heatmap/`, `streak/`, `completions/`, `day-completions/`, `admin/`.
- **`components/views/`** — One view component per dashboard section (`HomeView`, `WorkoutView`, `DietView`, `RoutineView`, `CoachView`, `AnalyticsView`, `MeasurementsView`, `ProfileView`). Rendered by `DashboardClient.tsx`.
- **`lib/`** — Core logic (see below).
- **`types/index.ts`** — Shared TypeScript interfaces.
- **`e2e/`** — Playwright test specs.

### Key lib files

- `db.ts` — PostgreSQL via Neon serverless. Full schema + all DB queries. Connection resolves across `POSTGRES_URL`, `DATABASE_URL`, and several namespaced variants.
- `auth.ts` — JWT sessions (jose). `getSession()`, `createSession()`, `setSessionCookie()`, `deleteSession()`. Tokens expire in 7 days, stored as `httpOnly` cookie.
- `csrf.ts` / `useCsrf.ts` — CSRF token management. `csrfFetch` is the client-side fetch wrapper.
- `ai-agent.ts` / `openai-routine.ts` — LangChain-based workout routine generators (Anthropic Claude and OpenAI GPT-4 respectively). These have duplicate prompt-building logic — edit both when changing prompts.
- `diet-agent.ts` — AI diet plan generation.
- `fieldEncryption.ts` — AES-256-GCM field-level encryption. `encryptDet()` for fields used in WHERE lookups (email/username), `encryptRnd()` for others. No-op passthrough when `DB_ENCRYPTION_KEY` is unset.
- `prompt-safety.ts` — `sanitizeUntrustedText()` strips zero-width chars, null bytes, normalizes, and length-limits. `escapeForPrompt()` prevents prompt injection. **Call these before inserting any user input into AI prompts.**
- `historical-context.ts` — Builds historical workout/diet context for AI prompt enrichment.
- `redis.ts` — Upstash Redis helpers: `redisGetJson`, `redisSetJson`. Optional — code must work when Redis is absent.
- `rate-limit.ts` — Per-user rate limiting (requires Redis).
- `validations.ts` — Zod schemas for all API input validation.
- `demo-data.ts` — Mock data for demo/offline mode.
- `coach.ts` — Coach credential logic. **Known bug: credentials hardcoded here, must move to env vars.**
- `youtube.ts` / `youtube-verify.ts` — YouTube exercise video integration.
- `email.ts` — Transactional email via nodemailer (SMTP).
- `routine-postprocess.ts` / `setsReps.ts` — Post-processing and normalization for AI-generated routines.

### Key patterns

- **Path alias**: `@/*` maps to `web-app/*` root.
- **Auth flow**: JWT cookie via `lib/auth.ts`. Google OAuth optional. `ALLOW_MOCK_AUTH=true` enables mock auth for local dev without a DB.
- **Dashboard architecture**: `DashboardClient.tsx` is a tab controller — it imports and renders the `components/views/*` files. Do NOT add logic directly to `DashboardClient.tsx`; extract to a view or hook.
- **AI providers**: Anthropic and OpenAI both supported; provider chosen at the API route level.
- **Database**: Schema defined inline in `lib/db.ts`. `initializeDatabase()` is idempotent and must be called at the start of every API route.
- **Payments**: Razorpay (Indian market, INR) for premium subscriptions.
- **Field encryption**: Optional. When `DB_ENCRYPTION_KEY` is set, sensitive fields are encrypted at rest. `isEncrypted()` guards decrypt calls.

### Environment setup

Create `web-app/.env.local` for local dev. See `web-app/ENV_SETUP.md` for full details.

**Required**: `JWT_SECRET`, `POSTGRES_URL` (or `DATABASE_URL`)
**Optional**: `GOOGLE_CLIENT_ID/SECRET`, `RAZORPAY_*`, `UPSTASH_REDIS_*`, `SMTP_*`, `ADMIN_USER_IDS`, `DB_ENCRYPTION_KEY` (64-char hex), `DB_SSL_DISABLED`, `DB_SSL_MODE`, `ALLOW_MOCK_AUTH`

## Next.js version note

This project uses Next.js 16, which has breaking changes from earlier versions. Read guides in `node_modules/next/dist/docs/` before making changes to Next.js-specific code.

## Known Bugs (Do Not Repeat)
- `next.config.ts` is empty — needs CSP/security headers before production.
- `ai-agent.ts` and `openai-routine.ts` have duplicate prompt-building logic — fix in both when editing either.
- Coach credentials are hardcoded in `lib/coach.ts` — must move to env vars.
- Analytics premium check runs AFTER the DB query in `app/api/analytics/route.ts` — should be BEFORE.
- Login page uses plain `fetch` instead of `csrfFetch` — inconsistent with rest of app.

## High-Traffic Files (Summary)
- `DashboardClient.tsx` — Tab controller for the main dashboard. DO NOT add logic here; extract to `components/views/` or hooks first.
- `lib/db.ts` — All DB queries and schema live here.
- `app/api/` — 40+ routes, all follow the Critical Code Patterns below.

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

### Before inserting user text into AI prompts:
```ts
import { sanitizeUntrustedText, escapeForPrompt } from '@/lib/prompt-safety';
const safe = escapeForPrompt(sanitizeUntrustedText(userInput));
```

### Redis caching:
```ts
const cacheKey = `feature:${session.userId}`;
const cached = await redisGetJson<YourType>(cacheKey);
if (cached) return NextResponse.json(cached);
// fetch from DB...
await redisSetJson(cacheKey, data, 60);
```
