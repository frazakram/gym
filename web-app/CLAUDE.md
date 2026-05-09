# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Gym Bro** is an AI-powered fitness app: personalized workout routines, diet plans, body composition analysis, gym equipment detection, personal coach booking, and premium analytics. Deployed on Vercel, targeting the Indian market (Razorpay/INR payments).

## Workflow Preferences

- After making code changes, **DO NOT** run build verification, `npm run build`, or `npm run lint`. The user verifies manually.
- When I say "new feature", always: read this file first, follow Critical Code Patterns, check Known Bugs, use `csrfFetch` (never plain `fetch`).

## Commands

All commands run from `web-app/`:

```bash
# Development
npm run dev          # Start Next.js dev server (localhost:3000)
npm run build        # Production build
npm run start        # Start production server
npm run lint         # ESLint

# E2E tests (Playwright, chromium only)
npx playwright test                    # Run all tests
npx playwright test e2e/foo.spec.ts    # Run a single test file
npx playwright test --ui               # Interactive test UI
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) + React 19 + TypeScript |
| Styling | Tailwind CSS 4 + Framer Motion + glassmorphism design system |
| Database | PostgreSQL via Neon serverless (`@neondatabase/serverless`) |
| Auth | JWT sessions via `jose`, optional Google OAuth |
| AI | LangChain.js with Anthropic Claude + OpenAI GPT-4 |
| Payments | Razorpay (INR, Indian market) |
| Caching | Upstash Redis (optional, graceful degradation) |
| Email | Nodemailer (SMTP) |
| Validation | Zod v4 |
| E2E Tests | Playwright (Chromium only) |
| Deployment | Vercel (serverless) |
| PWA | Service worker + manifest for offline support |

**Next.js 16 note**: This version has breaking changes from earlier versions. Read guides in `node_modules/next/dist/docs/` before making changes to Next.js-specific code.

## Architecture

### Monorepo layout (parent directory)

| Directory | Stack | Status |
|-----------|-------|--------|
| `web-app/` (this dir) | Next.js 16 + React 19 + TypeScript + Tailwind 4 | **Production** |
| `gym-ui/` | Next.js (minimal) | Legacy/archived — ignore |
| Root `.py` files | Streamlit + SQLite | Legacy prototype — do not modify |

### Directory structure

```
web-app/
├── app/                          # Next.js App Router
│   ├── layout.tsx                # Root layout (providers, global CSS)
│   ├── page.tsx                  # Landing page / redirect
│   ├── dashboard/page.tsx        # Main dashboard (renders DashboardClient)
│   ├── login/page.tsx            # Login/register
│   ├── onboarding/page.tsx       # Profile setup wizard
│   ├── demo/page.tsx             # Demo mode (no auth)
│   ├── explore/page.tsx          # Browse/explore
│   ├── coach/                    # Coach application + portal pages
│   ├── admin/                    # Admin dashboard + coach approvals/bookings
│   ├── privacy/ & terms/         # Legal pages
│   └── api/                      # 47+ API route handlers (see API Routes below)
├── components/
│   ├── views/                    # Dashboard tab views (one per section)
│   ├── ui/                       # Reusable UI primitives (cards, modals, loaders, etc.)
│   └── *.tsx                     # Shared components (nav, sidebar, exercise card, etc.)
├── lib/                          # Core business logic (see Key Lib Files below)
├── hooks/                        # Custom React hooks (useLocation)
├── types/index.ts                # All shared TypeScript interfaces
├── e2e/                          # Playwright specs (auth, diet, profile, routine, workout)
└── public/                       # Static assets, PWA manifest, service worker
```

### Dashboard architecture

`DashboardClient.tsx` is a **tab controller** — it imports and renders view components from `components/views/`:
- `HomeView` — Dashboard overview with streak, heatmap, quick actions
- `WorkoutView` — Active workout tracking with exercise completion
- `DietView` — AI diet plan display and generation
- `RoutineView` — Workout routine display and management
- `CoachView` — Personal coach booking interface
- `AnalyticsView` — Premium workout analytics dashboard
- `MeasurementsView` — Body measurements tracking
- `ProfileView` — User profile editing
- `CommunitiesView` — Community management

**Rule**: Do NOT add logic directly to `DashboardClient.tsx`. Always extract to a view component in `components/views/` or a custom hook.

### API routes (`app/api/`)

47+ endpoints organized by domain:

| Category | Routes | Purpose |
|----------|--------|---------|
| Auth | `auth/login`, `register`, `logout`, `google/*` | JWT + Google OAuth |
| Profile | `profile` | User profile CRUD |
| Routines | `routine/generate`, `routines`, `routines/[id]`, `routines/reset` | AI workout generation + CRUD |
| Completions | `completions`, `day-completions` | Exercise tracking |
| Diet | `diet`, `diet/generate`, `diet/save` | AI diet planning |
| Coach | `coach/*`, `coaches/*` | Coach profiles, booking, applications |
| Billing | `billing/status`, `billing/subscription/create`, `billing/webhook` | Razorpay subscriptions |
| Analytics | `analytics` | Premium workout analytics |
| Body | `body/analyze` | AI body composition analysis |
| Gym | `gym/analyze` | AI gym equipment detection |
| Misc | `heatmap`, `streak`, `measurements`, `notes/improve`, `csrf`, `xp`, `user-location`, `communities/*`, `admin/*` | Various features |

### Data flow for AI features

1. Client calls API route (e.g., `POST /api/routine/generate`) with user preferences
2. Route validates input with Zod, checks auth/premium status
3. `historical-context.ts` builds context from past workouts/diets
4. `prompt-safety.ts` sanitizes all user input before prompt insertion
5. `ai-agent.ts` (Anthropic) or `openai-routine.ts` (OpenAI) generates via LangChain
6. `routine-postprocess.ts` + `setsReps.ts` normalize the AI output
7. Result cached in Redis (if available) and returned

## Key Lib Files

| File | Purpose | Notes |
|------|---------|-------|
| `db.ts` | PostgreSQL schema + ALL queries | 1000+ lines. Schema defined inline. `initializeDatabase()` is idempotent, must be called at start of every API route. Connection resolves across `POSTGRES_URL`, `DATABASE_URL`, and namespaced variants. |
| `auth.ts` | JWT sessions | `getSession()`, `createSession()`, `setSessionCookie()`, `deleteSession()`. Tokens expire in 7 days, stored as `httpOnly` cookie. |
| `csrf.ts` / `useCsrf.ts` | CSRF protection | `csrfFetch` is the client-side fetch wrapper. **Always use this instead of plain `fetch()`.** |
| `ai-agent.ts` | Routine gen (Anthropic Claude) | LangChain-based. **Shares duplicate prompt logic with `openai-routine.ts` — edit both when changing prompts.** |
| `openai-routine.ts` | Routine gen (OpenAI GPT-4) | LangChain-based. **Duplicate of `ai-agent.ts` prompts — edit both.** |
| `diet-agent.ts` | AI diet plan generation | Separate prompt pipeline for nutrition plans. |
| `fieldEncryption.ts` | AES-256-GCM encryption | `encryptDet()` for WHERE-clause fields (email/username), `encryptRnd()` for others. No-op when `DB_ENCRYPTION_KEY` unset. `isEncrypted()` guards decrypt calls. |
| `prompt-safety.ts` | Prompt injection prevention | `sanitizeUntrustedText()` strips zero-width chars, null bytes, normalizes, length-limits. `escapeForPrompt()` wraps for safe insertion. **Call both before any user input enters AI prompts.** |
| `historical-context.ts` | AI context builder | Builds historical workout/diet context for prompt enrichment. |
| `redis.ts` | Upstash Redis helpers | `redisGetJson`, `redisSetJson`. **Optional — all code must work when Redis is absent.** |
| `rate-limit.ts` | Per-user rate limiting | Requires Redis to function. |
| `validations.ts` | Zod schemas | All API input validation schemas live here. |
| `demo-data.ts` | Mock data | For demo/offline mode. |
| `coach.ts` | Coach credentials | **Bug: credentials hardcoded, must move to env vars.** |
| `youtube.ts` / `youtube-verify.ts` | Exercise videos | YouTube video search + validation for exercise tutorials. |
| `email.ts` | Transactional email | Nodemailer via SMTP config. |
| `routine-postprocess.ts` / `setsReps.ts` | AI output normalization | Post-processing for AI-generated routines. |
| `image-utils.ts` | Image processing | Compression and processing utilities. |
| `toast.ts` | Toast notifications | Client-side toast helpers. |

## Key TypeScript Types (`types/index.ts`)

Core interfaces you'll encounter frequently:
- `User`, `Profile`, `Session` — Auth/user data
- `Exercise`, `DayRoutine`, `WeeklyRoutine`, `SavedRoutine` — Workout structures
- `Meal`, `DailyDiet`, `WeeklyDiet` — Nutrition structures
- `ExerciseCompletion`, `CompletionStats` — Tracking
- `PremiumStatus` — Billing state (trial/subscription)
- `Coach`, `CoachBooking` — Coach system
- `GymPhoto`, `GymEquipmentAnalysis` — Equipment detection
- `BodyPhoto`, `BodyCompositionAnalysis` — Body analysis
- `Analytics*` types — Analytics data structures

## Critical Code Patterns (Always Follow)

### Every API route must start with:
```ts
export const runtime = "nodejs";

const session = await getSession();
if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
await initializeDatabase();
```

### Client-side fetching — ALWAYS use csrfFetch:
```ts
import { csrfFetch } from '@/lib/useCsrf';
// Never use plain fetch() for authenticated requests
```

### Input validation (Zod):
```ts
import { safeParseWithError } from '@/lib/validations';
const parsed = safeParseWithError(YourSchema, await request.json().catch(() => ({})));
if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 });
```

### Before inserting user text into AI prompts:
```ts
import { sanitizeUntrustedText, escapeForPrompt } from '@/lib/prompt-safety';
const safe = escapeForPrompt(sanitizeUntrustedText(userInput));
```

### Redis caching pattern:
```ts
import { redisGetJson, redisSetJson } from '@/lib/redis';
const cacheKey = `feature:${session.userId}`;
const cached = await redisGetJson<YourType>(cacheKey);
if (cached) return NextResponse.json(cached);
// ...fetch from DB...
await redisSetJson(cacheKey, data, 60); // TTL in seconds
```

### Path alias:
```ts
import { something } from '@/lib/something'; // @/* maps to web-app/* root
```

## Design System

- **Tailwind CSS v4** with PostCSS plugin (`@tailwindcss/postcss`)
- CSS custom properties for theming defined in `app/globals.css`
- Color tokens: navy, primary (blue), cyan, coral, gold, accent variants
- Dark mode support via `:root` / `.dark` class variants
- Glassmorphism effects used extensively (backdrop-blur, semi-transparent backgrounds)
- Animations via Framer Motion (`framer-motion`)
- Icons via `lucide-react`
- Toasts via `sonner`

## Environment Variables

Create `.env.local` for local dev. See `ENV_SETUP.md` for full details.

**Required**: `JWT_SECRET`, `POSTGRES_URL` (or `DATABASE_URL`)

**Optional**:
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — Google OAuth
- `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` / `RAZORPAY_PLAN_ID_ANALYTICS_MONTHLY` / `RAZORPAY_WEBHOOK_SECRET` — Payments
- `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` — Redis caching
- `SMTP_HOST` / `SMTP_PORT` / `SMTP_SECURE` / `SMTP_USER` / `SMTP_PASS` / `SMTP_FROM` — Email
- `ADMIN_USER_IDS` / `ADMIN_USER_ID` / `ADMIN_USERNAMES` — Admin access
- `DB_ENCRYPTION_KEY` — 64-char hex for field-level encryption
- `DB_SSL_DISABLED` / `DB_SSL_MODE` — Database SSL config
- `ALLOW_MOCK_AUTH` — Mock auth for local dev without DB
- `OPENAI_BASE_URL` / `OPENAI_MODEL` / `OPENAI_TIMEOUT_MS` / `OPENAI_PROXY` / `OPENAI_RETRY_ATTEMPTS` — OpenAI overrides

## Known Bugs (Do Not Repeat)

1. `next.config.ts` is empty — needs CSP/security headers before production.
2. `ai-agent.ts` and `openai-routine.ts` have duplicate prompt-building logic — fix in both when editing either.
3. Coach credentials are hardcoded in `lib/coach.ts` — must move to env vars.
4. Analytics premium check runs AFTER the DB query in `app/api/analytics/route.ts` — should be BEFORE.
5. Login page uses plain `fetch` instead of `csrfFetch` — inconsistent with rest of app.

## High-Traffic Files

- **`DashboardClient.tsx`** — Tab controller. Do NOT add logic here; extract to `components/views/` or hooks.
- **`lib/db.ts`** — All DB queries and schema. Largest file in the codebase.
- **`app/api/`** — 47+ routes, all must follow Critical Code Patterns above.
- **`types/index.ts`** — All shared interfaces. Update here when adding new data shapes.
- **`lib/validations.ts`** — All Zod schemas. Add new schemas here when creating API routes.
