import { NextRequest, NextResponse } from 'next/server';
import { saveRoutine, getLatestRoutine, getRoutinesByUser } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const { userId, weekNumber, routine } = await req.json();

    if (!userId || !weekNumber || !routine) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const routineId = await saveRoutine(userId, weekNumber, routine);

    if (!routineId) {
      return NextResponse.json(
        { error: 'Failed to save routine' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, routineId });
  } catch (error) {
    console.error('Error saving routine:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const getAll = searchParams.get('all') === 'true';

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    if (getAll) {
      const routines = await getRoutinesByUser(Number(userId));
      return NextResponse.json({ routines });
    } else {
      const routine = await getLatestRoutine(Number(userId));
      return NextResponse.json({ routine });
    }
  } catch (error) {
    console.error('Error fetching routine:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
