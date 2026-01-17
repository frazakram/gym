import { NextRequest, NextResponse } from 'next/server';
import { getLatestDiet, getDietByWeek, initializeDatabase } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await initializeDatabase();

    const { searchParams } = new URL(request.url);
    const weekParam = searchParams.get('week');

    let dietData;

    if (weekParam) {
      const weekNumber = parseInt(weekParam, 10);
      dietData = await getDietByWeek(session.userId, weekNumber);
    } else {
      dietData = await getLatestDiet(session.userId);
    }

    if (!dietData) {
      // Not finding a diet is not a 500 error, just empty result
      return NextResponse.json({ diet: null }, { status: 200 });
    }

    // Wrap in standard structure if needed or just return raw
    return NextResponse.json({ 
      diet: dietData 
    }, { status: 200 });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Error fetching diet:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
