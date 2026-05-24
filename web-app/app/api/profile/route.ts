import { withCors } from "@/lib/corsMiddleware";
import { NextRequest, NextResponse } from 'next/server';
import { getProfile, initializeDatabase, saveProfile, saveNationality, countryToRegion } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { ProfileUpdateSchema, safeParseWithError } from '@/lib/validations';
import { requireCsrf } from '@/lib/csrf';

export async function GET() {
  try {
    const session = await getSession();

    if (!session) {
      return withCors(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }));
    }

    await initializeDatabase();

    const { getUser } = await import('@/lib/db');
    const [profile, user] = await Promise.all([
      getProfile(session.userId),
      getUser(session.userId)
    ]);

    return withCors(NextResponse.json({
      profile,
      username: user?.username || `User ${session.userId}`
    }, { status: 200 }));
  } catch (error) {
    console.error('Error fetching profile:', error);
    return withCors(NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    ));
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return withCors(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }));
    }

    // CSRF validation for state-changing request
    const csrfError = await requireCsrf(request, session.userId);
    if (csrfError) return csrfError;

    await initializeDatabase();

    // Validate input with Zod
    const rawBody = await request.json().catch(() => ({}));
    const parsed = safeParseWithError(ProfileUpdateSchema, rawBody);
    
    if (!parsed.success) {
      return withCors(NextResponse.json(
        { error: parsed.error },
        { status: 400 }
      ));
    }

    const data = parsed.data;

    // Pass values through as-is. saveProfile distinguishes:
    //   undefined  → caller didn't send the field → preserve existing DB value
    //   null       → caller explicitly cleared the field → store NULL
    //   any value  → store the value
    // Collapsing null→undefined would break the "explicitly clear photos" flow.
    const profile = await saveProfile(
      session.userId,
      data.age as any,
      data.weight as any,
      data.height as any,
      data.gender as any,
      data.goal as any,
      data.level as any,
      data.tenure as any,
      data.goal_weight as any,
      data.notes as any,
      data.goal_duration as any,
      data.session_duration as any,
      data.diet_type as any,
      data.cuisine as any,
      data.protein_powder as any,
      data.protein_powder_amount as any,
      data.meals_per_day as any,
      data.allergies as any,
      data.specific_food_preferences as any,
      data.cooking_level as any,
      data.budget as any,
      data.name as any,
      data.gym_photos,
      data.gym_equipment_analysis,
      data.body_photos,
      data.body_composition_analysis,
      data.preferred_rest_days as any
    );

    // Persist nationality + region (separate update so we don't bloat saveProfile signature)
    if (data.nationality !== undefined || data.region !== undefined) {
      const nat = data.nationality ? data.nationality.toUpperCase() : null;
      const region = data.region ?? (nat ? countryToRegion(nat) : null);
      await saveNationality(session.userId, nat, region);
    }

    return withCors(NextResponse.json({ profile }, { status: 200 }));
  } catch (error) {
    console.error('Error saving profile:', error);
    return withCors(NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    ));
  }
}