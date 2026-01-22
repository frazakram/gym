import { NextRequest, NextResponse } from 'next/server';
import { initializeDatabase, saveDiet } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { DietSaveSchema, safeParseWithError } from '@/lib/validations';
import { requireCsrf } from '@/lib/csrf';

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

    // Validate input with Zod
    const rawBody = await request.json().catch(() => ({}));
    const parsed = safeParseWithError(DietSaveSchema, rawBody);
    
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const { weekNumber, diet } = parsed.data;

    const savedId = await saveDiet(session.userId, weekNumber, diet);

    if (!savedId) {
      return NextResponse.json({ error: 'Failed to save diet' }, { status: 500 });
    }

    return NextResponse.json({ success: true, dietId: savedId }, { status: 200 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Error saving diet:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
