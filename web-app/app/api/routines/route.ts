import { NextRequest, NextResponse } from 'next/server';
import { saveRoutine, getLatestRoutine, getRoutinesByUser, initializeDatabase } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { RoutineSaveSchema, safeParseWithError } from '@/lib/validations';
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
    const parsed = safeParseWithError(RoutineSaveSchema, rawBody);
    
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error },
        { status: 400 }
      );
    }

    const { weekNumber, routine, weekStartDate } = parsed.data;

    // Fetch current profile to store as snapshot
    const { getProfile } = await import('@/lib/db');
    const currentProfile = await getProfile(session.userId);

    // Use session userId instead of accepting it from client
    const routineId = await saveRoutine(
      session.userId, 
      weekNumber, 
      routine, 
      weekStartDate ?? null,
      currentProfile // Store profile snapshot
    );

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

    await initializeDatabase();

    const { searchParams } = new URL(req.url);
    const getAll = searchParams.get('all') === 'true';
    const includeArchived = searchParams.get('includeArchived') === 'true';
    const archivedOnly = searchParams.get('archivedOnly') === 'true';

    // Use session userId instead of accepting it from query params
    if (getAll) {
      const routines = await getRoutinesByUser(session.userId, { includeArchived, archivedOnly });
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
