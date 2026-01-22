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


export async function POST(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
        return NextResponse.json(
          { error: `Too many requests. Try again in ${burst.retryAfterSeconds}s.` },
          {
            status: 429,
            headers: {
              'Retry-After': String(burst.retryAfterSeconds),
              'X-RateLimit-Limit': String(burst.limit),
              'X-RateLimit-Remaining': String(burst.remaining),
            },
          }
        );
      }

      const rl = await rateLimit({
        key: `rl:routine_generate:hour:${session.userId}`,
        limit: RATE_LIMITS.routinePerHour(),
        windowSeconds: 60 * 60,
      });
      if (!rl.allowed) {
        return NextResponse.json(
          { error: `Too many routine generations. Try again in ${rl.retryAfterSeconds}s.` },
          {
            status: 429,
            headers: {
              'Retry-After': String(rl.retryAfterSeconds),
              'X-RateLimit-Limit': String(rl.limit),
              'X-RateLimit-Remaining': String(rl.remaining),
            },
          }
        );
      }
    }

    // Validate input with Zod
    const rawBody = await request.json().catch(() => ({}));
    const parsed = safeParseWithError(RoutineGenerateSchema, rawBody);
    
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error },
        { status: 400 }
      );
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
      return NextResponse.json(
        { error: `${provider} API key is required (enter it in the UI, or set it in server env)` },
        { status: 400 }
      );
    }

    const ftInToCm = (ft: number, inches: number) => ft * 30.48 + inches * 2.54;
    const normalizedHeight =
      (height_unit === 'ftin' && typeof height_ft === 'number' && typeof height_in === 'number')
        ? ftInToCm(height_ft, Math.max(0, Math.min(11.9, height_in)))
        : height;

    // Build historical context for progressive routines
    let historicalContextStr: string | undefined;
    try {
      const historicalContext = await buildHistoricalContext(session.userId);
      if (historicalContext) {
        historicalContextStr = formatHistoricalContextForPrompt(historicalContext);
      }
    } catch (error) {
      console.warn('Failed to build historical context:', error);
      // Continue without historical context
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
      apiKey: keyFromClient || undefined, // Passed from client (optional if server env has key)
    };

    // Fetch equipment and body analysis upfront for both streaming and non-streaming modes
    const { getProfile } = await import('@/lib/db');
    const userProfile = await getProfile(session.userId);
    const equipmentAnalysis = userProfile?.gym_equipment_analysis || null;
    const bodyAnalysis = userProfile?.body_composition_analysis || null;

    // Also use profile session_duration if not provided in request
    if (!input.session_duration && userProfile?.session_duration) {
      input.session_duration = userProfile.session_duration;
    }

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
            controller.enqueue(sse('progress', { pct: 5, stage: 'Validating request…' }));
            controller.enqueue(sse('progress', { pct: 10, stage: 'Contacting AI provider…' }));

            const routine =
              provider === 'OpenAI'
                ? await generateRoutineOpenAI(input, historicalContextStr, equipmentAnalysis, bodyAnalysis)
                : await generateRoutine(input, historicalContextStr, equipmentAnalysis, bodyAnalysis);

            clearInterval(tick);
            controller.enqueue(sse('progress', { pct: 100, stage: 'Done' }));
            controller.enqueue(sse('routine', { routine }));
          } catch (err: unknown) {
            clearInterval(tick);
            const message = err instanceof Error ? err.message : String(err);
            controller.enqueue(sse('error', { message }));
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
            return NextResponse.json({
              routine: existing.routine_json,
              source: 'db',
              week_number: existing.week_number,
              week_start_date: existing.week_start_date ?? null,
              routine_id: existing.id
            });
          } else {
            // Profile changed significantly, log and continue to generate new routine
            console.log(`Profile changed significantly for user ${session.userId}, regenerating routine for week ${body.week_number}`);
          }
        }
      } catch (err) {
        console.warn('Failed to check existing routine, proceeding to generate:', err);
      }
    }

    // ========== REDIS CACHE CHECK (before expensive AI call) ==========
    // Build cache key from input parameters (excluding API keys)
    const cacheInputs = {
      userId: session.userId,
      age: input.age,
      weight: input.weight,
      height: input.height,
      gender: input.gender,
      goal: input.goal,
      level: input.level,
      tenure: input.tenure,
      goal_weight: input.goal_weight,
      session_duration: input.session_duration,
      notes: input.notes,
      provider,
      // Include equipment/body analysis in cache key
      equipmentHash: equipmentAnalysis ? JSON.stringify(equipmentAnalysis).slice(0, 100) : null,
      bodyHash: bodyAnalysis ? JSON.stringify(bodyAnalysis).slice(0, 100) : null,
    };
    
    const cacheKey = hashCacheKey('routine', cacheInputs);
    
    // Skip cache if regenerate is explicitly requested
    if (body.regenerate !== true) {
      const cached = await getCachedAIResponse<any>(cacheKey);
      if (cached.hit) {
        console.log(`[Routine] Cache hit for user ${session.userId}, saving AI cost!`);
        return NextResponse.json({
          routine: cached.data,
          source: 'cache',
          week_number: typeof body.week_number === 'number' ? body.week_number : null,
        });
      }
    }

    // AI Generation (with equipment and body composition analysis already fetched above)
    const routine =
      provider === 'OpenAI'
        ? await generateRoutineOpenAI(input, historicalContextStr, equipmentAnalysis, bodyAnalysis)
        : await generateRoutine(input, historicalContextStr, equipmentAnalysis, bodyAnalysis);

    if (!routine) {
      return NextResponse.json(
        { error: 'Failed to generate routine. Check your API key and provider.' },
        { status: 500 }
      );
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

    return NextResponse.json(
      {
        routine,
        source: 'ai',
        week_number: typeof body.week_number === 'number' ? body.week_number : null,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    // Don't leak secrets in logs — log the message only
    const message = error instanceof Error ? error.message : String(error);
    console.error('Error generating routine:', message);
    return NextResponse.json(
      { error: message || 'Internal server error' },
      { status: 500 }
    );
  }
}
