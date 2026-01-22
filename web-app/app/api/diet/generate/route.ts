import { NextRequest, NextResponse } from 'next/server';
import { generateDiet } from '@/lib/diet-agent';
import { getSession } from '@/lib/auth';
import { getProfile, initializeDatabase } from '@/lib/db';
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

    const { routine, model_provider, apiKey } = parsed.data;

    // Fetch user profile from DB to get latest preferences
    const profile = await getProfile(session.userId);
    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
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
      provider: model_provider || 'Anthropic',
      // Include routine summary in cache key (if provided)
      routineHash: routine ? JSON.stringify(routine).slice(0, 200) : null,
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
      model_provider: model_provider || 'Anthropic',
      apiKey
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
