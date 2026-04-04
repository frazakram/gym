import { NextRequest, NextResponse } from 'next/server';
import { generateDiet } from '@/lib/diet-agent';
import { getSession } from '@/lib/auth';
import { getProfile, initializeDatabase } from '@/lib/db';

// Vercel Hobby plan: max 60s for serverless functions
export const maxDuration = 60;
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit';
import { DietGenerateSchema, safeParseWithError } from '@/lib/validations';
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

    await initializeDatabase();

    // Rate limit AI generation to protect credits (no-op if Redis not configured)
    {
      const burst = await rateLimit({
        key: `rl:diet_generate:minute:${session.userId}`,
        limit: RATE_LIMITS.dietPerMinute(),
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
        key: `rl:diet_generate:hour:${session.userId}`,
        limit: RATE_LIMITS.dietPerHour(),
        windowSeconds: 60 * 60,
      });
      if (!rl.allowed) {
        return NextResponse.json(
          { error: `Too many diet generations. Try again in ${rl.retryAfterSeconds}s.` },
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
    const parsed = safeParseWithError(DietGenerateSchema, rawBody);
    
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error },
        { status: 400 }
      );
    }

    const { routine, model_provider, apiKey, api_key, model: clientModel } = parsed.data;
    const resolvedApiKey = apiKey || api_key;

    // Fetch user profile from DB to get latest preferences
    const profile = await getProfile(session.userId);
    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Fetch latest body measurements for weight trend context
    let bodyMeasurements: { latest_weight?: number; waist?: number; trend?: 'gaining' | 'losing' | 'stable' } | undefined;
    try {
      const { getBodyMeasurements } = await import('@/lib/db');
      const measurements = await getBodyMeasurements(session.userId, 10);
      if (measurements.length > 0) {
        const latest = measurements[0];
        bodyMeasurements = {
          latest_weight: latest.weight ?? undefined,
          waist: latest.waist ?? undefined,
        };
        // Calculate weight trend from last 2+ measurements
        if (measurements.length >= 2) {
          const weights = measurements.filter(m => m.weight != null).slice(0, 5);
          if (weights.length >= 2) {
            const recent = weights[0].weight!;
            const older = weights[weights.length - 1].weight!;
            const diff = recent - older;
            bodyMeasurements.trend = diff > 0.5 ? 'gaining' : diff < -0.5 ? 'losing' : 'stable';
          }
        }
      }
    } catch {
      // Continue without measurements — non-critical
    }

    // ========== REDIS CACHE CHECK (before expensive AI call) ==========
    const cacheInputs = {
      userId: session.userId,
      age: profile.age,
      weight: profile.weight,
      height: profile.height,
      gender: profile.gender,
      goal: profile.goal,
      diet_type: profile.diet_type,
      cuisine: profile.cuisine,
      protein_powder: profile.protein_powder,
      protein_powder_amount: profile.protein_powder_amount,
      meals_per_day: profile.meals_per_day,
      allergies: profile.allergies,
      cooking_level: profile.cooking_level,
      budget: profile.budget,
      specific_food_preferences: profile.specific_food_preferences,
      session_duration: profile.session_duration,
      provider: model_provider || 'Anthropic',
      // Include routine summary in cache key (if provided)
      routineHash: routine ? JSON.stringify(routine).slice(0, 200) : null,
      // Include body measurements for cache invalidation when weight changes
      bodyWeight: bodyMeasurements?.latest_weight || null,
      bodyTrend: bodyMeasurements?.trend || null,
    };
    
    const cacheKey = hashCacheKey('diet', cacheInputs);
    
    // Check cache first
    const cached = await getCachedAIResponse<any>(cacheKey);
    if (cached.hit) {
      console.log(`[Diet] Cache hit for user ${session.userId}, saving AI cost!`);
      return NextResponse.json({ dietPlan: cached.data, source: 'cache' }, { status: 200 });
    }

    const dietPlan = await generateDiet({
      profile,
      routine, // context
      bodyMeasurements,
      model_provider: model_provider || 'OpenAI',
      apiKey: resolvedApiKey,
      model: typeof clientModel === 'string' ? clientModel : undefined,
    });

    if (!dietPlan) {
      return NextResponse.json({ error: 'Failed to generate diet plan' }, { status: 500 });
    }

    // ========== CACHE THE GENERATED DIET ==========
    try {
      await setCachedAIResponse(cacheKey, dietPlan, AI_CACHE_TTL.diet);
      console.log(`[Diet] Cached for user ${session.userId} (TTL: ${AI_CACHE_TTL.diet}s)`);
    } catch (cacheErr) {
      console.warn('[Diet] Failed to cache:', cacheErr);
    }

    return NextResponse.json({ dietPlan, source: 'ai' }, { status: 200 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Error generating diet:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
