import { NextRequest, NextResponse } from 'next/server';
import { getCompletionStats, initializeDatabase, toggleExerciseCompletion } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { redisIncr } from '@/lib/redis';

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await initializeDatabase();

    const { routineId, dayIndex, exerciseIndex, completed } = await req.json();

    if (routineId === undefined || dayIndex === undefined || exerciseIndex === undefined || completed === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const success = await toggleExerciseCompletion(
      session.userId,
      Number(routineId),
      Number(dayIndex),
      Number(exerciseIndex),
      Boolean(completed)
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
