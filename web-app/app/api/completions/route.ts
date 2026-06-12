import { withCors } from "@/lib/corsMiddleware";
import { NextRequest, NextResponse } from 'next/server';
import { getCompletionStats, initializeDatabase, toggleExerciseCompletion, awardXp, awardStreakXpIfFirstToday, XP_VALUES } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { redisIncr } from '@/lib/redis';
import { ExerciseCompletionSchema, safeParseWithError } from '@/lib/validations';
import { requireCsrf } from '@/lib/csrf';

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return withCors(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }));
    }

    // CSRF validation for state-changing request
    const csrfError = await requireCsrf(req, session.userId);
    if (csrfError) return csrfError;

    await initializeDatabase();

    // Validate input with Zod
    const rawBody = await req.json().catch(() => ({}));
    const parsed = safeParseWithError(ExerciseCompletionSchema, rawBody);
    
    if (!parsed.success) {
      return withCors(NextResponse.json(
        { error: parsed.error },
        { status: 400 }
      ));
    }

    const { routineId, dayIndex, exerciseIndex, completed, actual_weight, actual_reps, notes } = parsed.data;

    const result = await toggleExerciseCompletion(
      session.userId,
      routineId,
      dayIndex,
      exerciseIndex,
      completed,
      { actual_weight, actual_reps, notes }
    );

    if (!result.ok) {
      return withCors(NextResponse.json(
        { error: 'Failed to update completion status (Access Denied or Error)' },
        { status: 403 } // 403 Forbidden is more appropriate if it was an ownership issue
      ));
    }

    // Award XP only on a genuine transition to completed — re-saving an already
    // completed exercise (e.g. editing the logged weight) must not farm XP.
    if (result.newlyCompleted) {
      await awardXp(session.userId, 'exercise_completed', XP_VALUES.EXERCISE);
      await awardStreakXpIfFirstToday(session.userId);
    }

    // Invalidate derived analytics + personal-record caches (best-effort).
    await redisIncr(`analytics_ver:${session.userId}`);
    await redisIncr(`pr_ver:${session.userId}`);

    return withCors(NextResponse.json({ success: true }));
  } catch (error) {
    console.error('Error toggling exercise completion:', error);
    return withCors(NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    ));
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return withCors(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }));
    }

    await initializeDatabase();

    const { searchParams } = new URL(req.url);
    const routineId = searchParams.get('routineId');

    if (!routineId) {
      return withCors(NextResponse.json(
        { error: 'routineId is required' },
        { status: 400 }
      ));
    }

    const completions = await getCompletionStats(session.userId, Number(routineId));
    return withCors(NextResponse.json({ completions }));
  } catch (error) {
    console.error('Error fetching completions:', error);
    return withCors(NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    ));
  }
}