import { NextRequest, NextResponse } from 'next/server';
import { getCompletionStats, initializeDatabase, toggleExerciseCompletion } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { redisIncr } from '@/lib/redis';
import { ExerciseCompletionSchema, safeParseWithError } from '@/lib/validations';
import { requireCsrf } from '@/lib/csrf';

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // CSRF validation for state-changing request
    const csrfError = await requireCsrf(req, session.userId);
    if (csrfError) return csrfError;

    await initializeDatabase();

    // Validate input with Zod
    const rawBody = await req.json().catch(() => ({}));
    const parsed = safeParseWithError(ExerciseCompletionSchema, rawBody);
    
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error },
        { status: 400 }
      );
    }

    const { routineId, dayIndex, exerciseIndex, completed } = parsed.data;

    const success = await toggleExerciseCompletion(
      session.userId,
      routineId,
      dayIndex,
      exerciseIndex,
      completed
    );

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to update completion status (Access Denied or Error)' },
        { status: 403 } // 403 Forbidden is more appropriate if it was an ownership issue
      );
    }

    // Invalidate derived analytics cache for ALL `days=` values (best-effort).
    await redisIncr(`analytics_ver:${session.userId}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error toggling exercise completion:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await initializeDatabase();

    const { searchParams } = new URL(req.url);
    const routineId = searchParams.get('routineId');

    if (!routineId) {
      return NextResponse.json(
        { error: 'routineId is required' },
        { status: 400 }
      );
    }

    const completions = await getCompletionStats(session.userId, Number(routineId));
    return NextResponse.json({ completions });
  } catch (error) {
    console.error('Error fetching completions:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
