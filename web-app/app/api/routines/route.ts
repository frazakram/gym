import { NextRequest, NextResponse } from 'next/server';
import { saveRoutine, getLatestRoutine, getRoutinesByUser } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { weekNumber, routine } = await req.json();

    if (!weekNumber || !routine) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Use session userId instead of accepting it from client
    const routineId = await saveRoutine(session.userId, weekNumber, routine);

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
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const getAll = searchParams.get('all') === 'true';

    // Use session userId instead of accepting it from query params
    if (getAll) {
      const routines = await getRoutinesByUser(session.userId);
      return NextResponse.json({ routines });
    } else {
      const routine = await getLatestRoutine(session.userId);
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
