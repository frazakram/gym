import { NextRequest, NextResponse } from 'next/server';
import { generateRoutine } from '@/lib/ai-agent';
import { getSession } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { age, weight, height, level, tenure, model_provider, api_key } = body;

    if (!age || !weight || !height || !level || !tenure || !model_provider || !api_key) {
      return NextResponse.json(
        { error: 'All fields including API key are required' },
        { status: 400 }
      );
    }

    // Pass API key directly to the agent
    const routine = await generateRoutine({
      age,
      weight,
      height,
      level,
      tenure,
      model_provider,
      apiKey: api_key, // Passed from client
    });

    if (!routine) {
      return NextResponse.json(
        { error: 'Failed to generate routine. Check your API key.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ routine }, { status: 200 });
  } catch (error: any) {
    console.error('Error generating routine:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
