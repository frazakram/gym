import { NextRequest, NextResponse } from 'next/server';
import { saveDiet, getProfile } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { weekNumber, diet } = await request.json();

    if (!weekNumber || !diet) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

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
