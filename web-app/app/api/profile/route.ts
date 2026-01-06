import { NextRequest, NextResponse } from 'next/server';
import { getProfile, saveProfile } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET() {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const profile = await getProfile(session.userId);

    return NextResponse.json({ profile }, { status: 200 });
  } catch (error) {
    console.error('Error fetching profile:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { age, weight, height, gender, goal, level, tenure, goal_weight, notes } = await request.json();

    // Avoid falsy checks; validate presence
    if (age == null || weight == null || height == null || !gender || !goal || !level || !tenure) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      );
    }

    const profile = await saveProfile(
      session.userId,
      age,
      weight,
      height,
      gender,
      goal,
      level,
      tenure,
      goal_weight,
      notes
    );

    return NextResponse.json({ profile }, { status: 200 });
  } catch (error) {
    console.error('Error saving profile:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
