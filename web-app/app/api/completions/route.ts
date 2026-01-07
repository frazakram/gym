import { NextRequest, NextResponse } from 'next/server';
import { toggleExerciseCompletion, getCompletionStats } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const { routineId, dayIndex, exerciseIndex, completed } = await req.json();

    if (routineId === undefined || dayIndex === undefined || exerciseIndex === undefined || completed === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const success = await toggleExerciseCompletion(
      Number(routineId),
      Number(dayIndex),
      Number(exerciseIndex),
      Boolean(completed)
    );

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to update completion status' },
        { status: 500 }
      );
    }

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
    const { searchParams } = new URL(req.url);
    const routineId = searchParams.get('routineId');

    if (!routineId) {
      return NextResponse.json(
        { error: 'routineId is required' },
        { status: 400 }
      );
    }

    const completions = await getCompletionStats(Number(routineId));
    return NextResponse.json({ completions });
  } catch (error) {
    console.error('Error fetching completions:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
