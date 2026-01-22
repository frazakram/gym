import { NextRequest, NextResponse } from 'next/server';
import { getProfile, initializeDatabase, saveProfile } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { ProfileUpdateSchema, safeParseWithError } from '@/lib/validations';
import { requireCsrf } from '@/lib/csrf';

export async function GET() {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await initializeDatabase();

    const { getUser } = await import('@/lib/db');
    const [profile, user] = await Promise.all([
      getProfile(session.userId),
      getUser(session.userId)
    ]);

    return NextResponse.json({
      profile,
      username: user?.username || `User ${session.userId}`
    }, { status: 200 });
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

    // CSRF validation for state-changing request
    const csrfError = await requireCsrf(request, session.userId);
    if (csrfError) return csrfError;

    await initializeDatabase();

    // Validate input with Zod
    const rawBody = await request.json().catch(() => ({}));
    const parsed = safeParseWithError(ProfileUpdateSchema, rawBody);
    
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error },
        { status: 400 }
      );
    }

    const data = parsed.data;
    
    // Helper to convert null to undefined (Zod nullable vs TypeScript optional)
    const nullToUndefined = <T>(val: T | null | undefined): T | undefined => 
      val === null ? undefined : val;

    const profile = await saveProfile(
      session.userId,
      data.age,
      data.weight,
      data.height,
      data.gender,
      data.goal,
      data.level,
      data.tenure,
      nullToUndefined(data.goal_weight),
      nullToUndefined(data.notes),
      nullToUndefined(data.goal_duration),
      nullToUndefined(data.session_duration),
      nullToUndefined(data.diet_type),
      nullToUndefined(data.cuisine),
      nullToUndefined(data.protein_powder),
      nullToUndefined(data.protein_powder_amount),
      nullToUndefined(data.meals_per_day),
      nullToUndefined(data.allergies),
      nullToUndefined(data.specific_food_preferences),
      nullToUndefined(data.cooking_level),
      nullToUndefined(data.budget),
      nullToUndefined(data.name),
      nullToUndefined(data.gym_photos),
      nullToUndefined(data.gym_equipment_analysis),
      nullToUndefined(data.body_photos),
      nullToUndefined(data.body_composition_analysis)
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
