export const runtime = "nodejs";

import { withCors } from "@/lib/corsMiddleware";
import { NextRequest, NextResponse } from 'next/server';
import { generateRoutine } from '@/lib/ai-agent';
import { getSession } from '@/lib/auth';
import { generateRoutineOpenAI } from '@/lib/openai-routine';
import { buildHistoricalContext, formatHistoricalContextForPrompt } from '@/lib/historical-context';
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit';
import { initializeDatabase } from '@/lib/db';
import { RoutineGenerateSchema, safeParseWithError } from '@/lib/validations';
import { requireCsrf } from '@/lib/csrf';
import {
  hashCacheKey,
  getCachedAIResponse,
  setCachedAIResponse,
  AI_CACHE_TTL
} from '@/lib/redis';

// Allow up to 60s for AI generation on Vercel
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return withCors(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }));
    }

    // CSRF validation for state-changing request
    const csrfError = await requireCsrf(request, session.userId);
    if (csrfError) return csrfError;

    // Ensure DB schema exists before we try to fetch an existing routine by week.
    await initializeDatabase();

    // Rate limit AI generation to protect credits (no-op if Redis not configured)
    {
      const burst = await rateLimit({
        key: `rl:routine_generate:minute:${session.userId}`,
        limit: RATE_LIMITS.routinePerMinute(),
        windowSeconds: 60,
      });
      if (!burst.allowed) {
        return withCors(NextResponse.json(
          { error: `Too many requests. Try again in ${burst.retryAfterSeconds}s.` },
          {
            status: 429,
            headers: {
              'Retry-After': String(burst.retryAfterSeconds),
              'X-RateLimit-Limit': String(burst.limit),
              'X-RateLimit-Remaining': String(burst.remaining),
            },
          }
        ));
      }

      const rl = await rateLimit({
        key: `rl:routine_generate:hour:${session.userId}`,
        limit: RATE_LIMITS.routinePerHour(),
        windowSeconds: 60 * 60,
      });
      if (!rl.allowed) {
        return withCors(NextResponse.json(
          { error: `Too many routine generations. Try again in ${rl.retryAfterSeconds}s.` },
          {
            status: 429,
            headers: {
              'Retry-After': String(rl.retryAfterSeconds),
              'X-RateLimit-Limit': String(rl.limit),
              'X-RateLimit-Remaining': String(rl.remaining),
            },
          }
        ));
      }
    }

    // Validate input with Zod
    const rawBody = await request.json().catch(() => ({}));
    const parsed = safeParseWithError(RoutineGenerateSchema, rawBody);
    
    if (!parsed.success) {
      return withCors(NextResponse.json(
        { error: parsed.error },
        { status: 400 }
      ));
    }

    const body = parsed.data;
    const {
      age,
      weight,
      height,
      height_unit,
      height_ft,
      height_in,
      gender,
      goal,
      level,
      tenure,
      goal_weight,
      goal_duration,
      session_duration,
      notes,
      model_provider,
      api_key,
      apiKey, // backward/alt client name
      stream,
      restDays,
      is_next_week,
      week_number,
    } = body;

    const provider = model_provider;
    const keyFromClientRaw = (typeof api_key === 'string' ? api_key : typeof apiKey === 'string' ? apiKey : '');
    const keyFromClient = keyFromClientRaw
      .normalize('NFKC')
      .replace(/[\u200B-\u200D\uFEFF]/g, '')
      .trim();
    const hasServerKey =
      provider === 'Anthropic'
        ? Boolean(process.env.ANTHROPIC_API_KEY)
        : provider === 'OpenAI'
          ? Boolean(process.env.OPENAI_API_KEY)
          : false;

    // Only require a client key if we don't have a server-side key for the selected provider
    if (!keyFromClient && !hasServerKey) {
      return withCors(NextResponse.json(
        { error: `${provider} API key is required (enter it in the UI, or set it in server env)` },
        { status: 400 }
      ));
    }

    const ftInToCm = (ft: number, inches: number) => ft * 30.48 + inches * 2.54;
    const normalizedHeight =
      (height_unit === 'ftin' && typeof height_ft === 'number' && typeof height_in === 'number')
        ? ftInToCm(height_ft, Math.max(0, Math.min(11.9, height_in)))
        : height;

    // Fetch profile + selected gym — needed for restDays fallback + equipment/body analysis
    const { getProfile, getUserGym } = await import('@/lib/db');
    const [userProfile, userGym] = await Promise.all([
      getProfile(session.userId),
      getUserGym(session.userId),
    ]);
    const equipmentAnalysis = userProfile?.gym_equipment_analysis || null;
    const bodyAnalysis = userProfile?.body_composition_analysis || null;

    // Build gym equipment context from selected gym (overrides photo-based analysis if available)
    let gymEquipmentContext: string | undefined;
    if (userGym && userGym.equipment.length > 0) {
      gymEquipmentContext = `The user trains at ${userGym.gymName}. Available equipment: ${userGym.equipment.join(', ')}. Only suggest exercises that can be performed with this equipment. Do not suggest exercises requiring equipment not in this list.`;
    }

    // Build historical context for progressive routines
    let historicalContextStr: string | undefined;
    let historicalContext: Awaited<ReturnType<typeof buildHistoricalContext>> = null;
    try {
      historicalContext = await buildHistoricalContext(session.userId);
      if (historicalContext) {
        historicalContextStr = formatHistoricalContextForPrompt(historicalContext);
      }
    } catch (error) {
      console.warn('Failed to build historical context:', error);
      // Continue without historical context
    }

    // When generating next week, prepend a rich goal-specific progression directive
    if (is_next_week) {
      const prevWeek = (week_number ?? 1) - 1;
      const nextWeek = week_number ?? 2;
      const goalProgressionMap: Record<string, string> = {
        'Fat loss':       'Keep exercise count the same or add one compound movement. Reduce rest periods by 5–10 s on circuits/supersets. Add or extend a cardio finisher (HIIT, bike sprints, rowing). Maintain or slightly increase weights — do NOT reduce load.',
        'Muscle gain':    'Increase weight by 2.5–5 % on compound lifts. Add 1–2 reps to isolation work. Consider adding one extra set to a lagging muscle group. Push 1–2 reps closer to failure (RIR 1–2). Introduce a drop-set or rest-pause set on one exercise.',
        'Strength':       'Add weight to all primary lifts (squat, bench, deadlift, OHP) — even 2.5 kg is progress. Keep rep schemes identical or reduce reps by 1 and add weight. Accessory work: increase load or add one rep.',
        'Recomposition':  'Balanced increase: +2.5 % on compound lifts, +1 rep on isolation. Introduce supersets or giant sets to increase density. Alternate exercise variations for novel stimulus while keeping same muscle targets.',
        'Endurance':      'Increase total work time by 5–10 %. Reduce rest between sets by 10–15 s. Add one circuit round or extend steady-state cardio segments by 5 min. Progressively move towards continuous effort rather than interval breaks.',
        'General fitness':'Rotate at least two exercise variations for novel stimulus. Add 1 set to exercises the user performed well. Introduce one new movement pattern per session for variety and continued adaptation.',
      };
      const goalKey = goal as string;
      const goalGuidance = goalProgressionMap[goalKey] ?? 'Apply moderate progressive overload: slightly increase weight or reps on key exercises and introduce one fresh movement variation per session.';

      const nextWeekHeader = `\n\n${'━'.repeat(51)}\n🗓️  NEXT WEEK PROGRESSION DIRECTIVE — Week ${prevWeek} ➜ Week ${nextWeek}\n${'━'.repeat(51)}\n\nThis is a CONTINUATION routine, NOT a fresh start. You are building Week ${nextWeek} directly on top of Week ${prevWeek}.\n\nUSER GOAL: ${goal} (this must drive every progression decision below)\n\nGOAL-SPECIFIC PROGRESSION for "${goal}":\n→ ${goalGuidance}\n\nMANDATORY RULES:\n• Keep the SAME workout split structure as last week (e.g., Push/Pull/Legs) unless historical data shows a need to change.\n• Every training day must have AT LEAST ONE meaningful change from last week (weight ↑, reps ↑, sets ↑, harder variation, shorter rest).\n• Exercises the user excelled at → apply progressive overload (see above).\n• Exercises the user struggled with → keep or regress, add detailed form cues in tutorial_points.\n• Include the week number in day names: e.g., "Monday - Push (Chest, Shoulders, Triceps)".\n• Rest days stay on the same days as last week unless preferred_rest_days says otherwise.\n${'━'.repeat(51)}\n\n`;

      historicalContextStr = nextWeekHeader + (historicalContextStr ?? '');
    }

    // Helper to convert null to undefined (Zod nullable vs TypeScript optional)
    const nullToUndefined = <T>(val: T | null | undefined): T | undefined =>
      val === null ? undefined : val;

    const input = {
      age,
      weight,
      height: normalizedHeight,
      gender,
      goal,
      level,
      tenure,
      goal_weight: nullToUndefined(goal_weight),
      goal_duration: nullToUndefined(goal_duration),
      session_duration: typeof session_duration === 'number' ? session_duration : undefined,
      notes: nullToUndefined(notes),
      model_provider,
      apiKey: keyFromClient || undefined,
      model: typeof body.model === 'string' ? body.model : undefined,
      // Use explicit request restDays first; fall back to profile's saved preference
      restDays: restDays && restDays.length > 0
        ? restDays
        : (userProfile?.preferred_rest_days && userProfile.preferred_rest_days.length > 0
            ? userProfile.preferred_rest_days
            : undefined),
      isNextWeek: is_next_week ?? false,
      weekNumber: week_number,
    };

    // Use profile session_duration if not provided in request
    if (!input.session_duration && userProfile?.session_duration) {
      input.session_duration = userProfile.session_duration;
    }

    // ========== BUILD CACHE KEY (shared between streaming and non-streaming) ==========
    // Hash all fields that affect AI output so identical inputs return identical routines.
    // Different week / different rest days / different completion bucket => different key => fresh generation.
    const { createHash } = await import('crypto');
    const shortHash = (s: string) => createHash('sha256').update(s).digest('hex').slice(0, 16);

    // Coarsen historical context to a stable bucket. The full struggling/excelling lists still
    // enter the prompt on a cache miss, but they should NOT bust the cache every time the user
    // toggles a single exercise — that defeats the entire point of caching. We bucket using the
    // same thresholds the prompt itself uses (<50% deload, 50-79% maintain, >=80% overload).
    let historicalBucket: string | null = null;
    if (historicalContext) {
      const pct = historicalContext.completionPercentage;
      const bucket = pct >= 80 ? 'high' : pct < 50 ? 'low' : 'mid';
      historicalBucket = `${historicalContext.weekNumber}:${bucket}`;
    }

    const cacheInputs = {
      userId: session.userId,
      age: input.age,
      weight: input.weight,
      height: input.height,
      gender: input.gender,
      goal: input.goal,
      level: input.level,
      tenure: input.tenure,
      goal_weight: input.goal_weight ?? null,
      goal_duration: input.goal_duration ?? null,
      session_duration: input.session_duration ?? null,
      notes: input.notes ?? null,
      provider,
      model: typeof input.model === 'string' ? input.model : null,
      restDays: input.restDays ?? null,
      is_next_week: !!is_next_week,
      week_number: week_number ?? null,
      equipmentHash: equipmentAnalysis ? shortHash(JSON.stringify(equipmentAnalysis)) : null,
      bodyHash: bodyAnalysis ? shortHash(JSON.stringify(bodyAnalysis)) : null,
      gymHash: gymEquipmentContext ? shortHash(gymEquipmentContext) : null,
      historicalBucket,
    };
    const cacheKey = hashCacheKey('routine', cacheInputs);
    const shouldUseCache = body.regenerate !== true;
    console.log(`[Routine cache] key=${cacheKey} shouldUseCache=${shouldUseCache} bucket=${historicalBucket}`);

    // Streaming (SSE) mode for progress UI
    if (stream === true) {
      const encoder = new TextEncoder();
      const sse = (event: string, data: unknown) =>
        encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);

      const responseStream = new ReadableStream<Uint8Array>({
        async start(controller) {
          let pct = 5;
          const tick = setInterval(() => {
            pct = Math.min(95, pct + 1);
            controller.enqueue(sse('progress', { pct, stage: 'Generating routine…' }));
          }, 1000);

          try {
            const hasKey = Boolean(input.apiKey);
            const keyPreview = input.apiKey ? `${input.apiKey.slice(0, 6)}...${input.apiKey.slice(-4)}` : 'NONE';
            console.log(`[Routine SSE] Provider: ${provider}, Model: ${input.model || 'default'}, ClientKey: ${keyPreview}, ServerKey: ${hasServerKey ? 'YES' : 'NO'}`);
            controller.enqueue(sse('progress', { pct: 5, stage: 'Validating request…' }));

            // ========== CACHE CHECK (streaming branch) ==========
            if (shouldUseCache) {
              const cached = await getCachedAIResponse<any>(cacheKey);
              if (cached.hit) {
                console.log(`[Routine SSE] Cache hit for user ${session.userId}`);
                clearInterval(tick);
                controller.enqueue(sse('progress', { pct: 100, stage: 'Loaded from cache' }));
                controller.enqueue(sse('routine', { routine: cached.data, source: 'cache' }));
                return;
              }
            }

            controller.enqueue(sse('progress', { pct: 10, stage: `Contacting ${provider}…` }));

            const routine =
              provider === 'OpenAI'
                ? await generateRoutineOpenAI(input, historicalContextStr, equipmentAnalysis, bodyAnalysis, gymEquipmentContext)
                : await generateRoutine(input, historicalContextStr, equipmentAnalysis, bodyAnalysis, gymEquipmentContext);

            // ========== CACHE WRITE (streaming branch) ==========
            try {
              await setCachedAIResponse(cacheKey, routine, AI_CACHE_TTL.routine);
            } catch (cacheErr) {
              console.warn('[Routine SSE] Failed to cache:', cacheErr);
            }

            clearInterval(tick);
            controller.enqueue(sse('progress', { pct: 100, stage: 'Done' }));
            controller.enqueue(sse('routine', { routine, source: 'ai' }));
          } catch (err: unknown) {
            clearInterval(tick);
            const message = err instanceof Error ? err.message : String(err);
            const cause = err instanceof Error && err.cause ? String(err.cause) : '';
            console.error('SSE routine generation error:', message, cause ? `Cause: ${cause}` : '');
            controller.enqueue(sse('error', { message: cause ? `${message} (${cause})` : message }));
          } finally {
            controller.close();
          }
        },
      });

      return new NextResponse(responseStream, {
        headers: {
          'Content-Type': 'text/event-stream; charset=utf-8',
          'Cache-Control': 'no-cache, no-transform',
          Connection: 'keep-alive',
        },
      });
    }

    // Non-streaming mode (Consistency Check with Profile-based Cache Invalidation)
    if (typeof body.week_number === 'number' && body.regenerate !== true) {
      try {
        const { getRoutineByWeek, getProfile, hasSignificantProfileChange } = await import('@/lib/db');
        const [existing, currentProfile] = await Promise.all([
          getRoutineByWeek(session.userId, body.week_number),
          getProfile(session.userId)
        ]);

        if (existing) {
          // Parse profile snapshot if it exists
          let profileSnapshot = existing.profile_snapshot;
          if (typeof profileSnapshot === 'string') {
            try {
              profileSnapshot = JSON.parse(profileSnapshot);
            } catch {
              profileSnapshot = null;
            }
          }

          // Check if profile has changed significantly
          const profileChanged = hasSignificantProfileChange(profileSnapshot, currentProfile);

          if (!profileChanged) {
            // Profile hasn't changed significantly, return cached routine
            return withCors(NextResponse.json({
              routine: existing.routine_json,
              source: 'db',
              week_number: existing.week_number,
              week_start_date: existing.week_start_date ?? null,
              routine_id: existing.id
            }));
          } else {
            // Profile changed significantly, log and continue to generate new routine
            console.log(`Profile changed significantly for user ${session.userId}, regenerating routine for week ${body.week_number}`);
          }
        }
      } catch (err) {
        console.warn('Failed to check existing routine, proceeding to generate:', err);
      }
    }

    // ========== REDIS CACHE CHECK (non-streaming, before expensive AI call) ==========
    // Cache key was built earlier (before streaming branch).
    if (shouldUseCache) {
      const cached = await getCachedAIResponse<any>(cacheKey);
      if (cached.hit) {
        console.log(`[Routine] Cache hit for user ${session.userId}, saving AI cost!`);
        return withCors(NextResponse.json({
          routine: cached.data,
          source: 'cache',
          week_number: typeof body.week_number === 'number' ? body.week_number : null,
        }));
      }
    }

    // AI Generation (with equipment and body composition analysis already fetched above)
    const routine =
      provider === 'OpenAI'
        ? await generateRoutineOpenAI(input, historicalContextStr, equipmentAnalysis, bodyAnalysis, gymEquipmentContext)
        : await generateRoutine(input, historicalContextStr, equipmentAnalysis, bodyAnalysis, gymEquipmentContext);

    if (!routine) {
      return withCors(NextResponse.json(
        { error: 'Failed to generate routine. Check your API key and provider.' },
        { status: 500 }
      ));
    }

    // ========== CACHE THE GENERATED ROUTINE ==========
    // Store in Redis for future requests with same parameters
    try {
      await setCachedAIResponse(cacheKey, routine, AI_CACHE_TTL.routine);
      console.log(`[Routine] Cached for user ${session.userId} (TTL: ${AI_CACHE_TTL.routine}s)`);
    } catch (cacheErr) {
      // Don't fail the request if caching fails
      console.warn('[Routine] Failed to cache:', cacheErr);
    }

    return withCors(NextResponse.json(
      {
        routine,
        source: 'ai',
        week_number: typeof body.week_number === 'number' ? body.week_number : null,
      },
      { status: 200 }
    ));
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    const cause = error instanceof Error && error.cause ? String(error.cause) : '';
    console.error('Error generating routine:', message, cause ? `| Cause: ${cause}` : '');
    return withCors(NextResponse.json(
      { error: cause ? `${message} (${cause})` : (message || 'Internal server error') },
      { status: 500 }
    ));
  }
}