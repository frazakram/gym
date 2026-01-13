import { NextRequest, NextResponse } from 'next/server';
import { generateDiet } from '@/lib/diet-agent';
import { getSession } from '@/lib/auth';
import { getProfile } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { routine, model_provider, apiKey } = body;

    // Fetch user profile from DB to get latest preferences
    const profile = await getProfile(session.userId);
    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const dietPlan = await generateDiet({
      profile,
      routine, // context
      model_provider: model_provider || 'Anthropic',
      apiKey
    });

    if (!dietPlan) {
      return NextResponse.json({ error: 'Failed to generate diet plan' }, { status: 500 });
    }

    return NextResponse.json({ dietPlan }, { status: 200 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Error generating diet:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
