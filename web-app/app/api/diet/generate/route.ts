import { NextRequest, NextResponse } from 'next/server';
import { generateDiet } from '@/lib/diet-agent';
import { getSession } from '@/lib/auth';
import { getProfile } from '@/lib/db';
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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

    const body = await request.json();
    const { routine, model_provider, apiKey } = body;

    // Fetch user profile from DB to get latest preferences
    const profile = await getProfile(session.userId);
    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
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

    return NextResponse.json({ dietPlan }, { status: 200 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Error generating diet:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
