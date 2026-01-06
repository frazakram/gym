import { NextRequest, NextResponse } from 'next/server';
import { generateRoutine } from '@/lib/ai-agent';
import { getSession } from '@/lib/auth';
import { generateRoutineOpenAI } from '@/lib/openai-routine';

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      age,
      weight,
      height,
      height_unit,
      height_ft,
      height_in,
      gender,
      goal,
      level,
      tenure,
      goal_weight,
      notes,
      model_provider,
      api_key,
      apiKey, // backward/alt client name
      stream,
    } = body ?? {};

    const provider = model_provider as 'Anthropic' | 'OpenAI' | undefined;
    const keyFromClientRaw = (typeof api_key === 'string' ? api_key : typeof apiKey === 'string' ? apiKey : '');
    const keyFromClient = keyFromClientRaw
      .normalize('NFKC')
      .replace(/[\u200B-\u200D\uFEFF]/g, '')
      .trim();
    const hasServerKey =
      provider === 'Anthropic'
        ? Boolean(process.env.ANTHROPIC_API_KEY)
        : provider === 'OpenAI'
          ? Boolean(process.env.OPENAI_API_KEY)
          : false;

    // Validate required fields (avoid falsy checks; 0 is a valid number even if we don't expect it)
    if (
      age == null ||
      weight == null ||
      height == null ||
      !gender ||
      !goal ||
      !level ||
      !tenure ||
      (provider !== 'Anthropic' && provider !== 'OpenAI')
    ) {
      return NextResponse.json(
        { error: 'Missing required fields for routine generation' },
        { status: 400 }
      );
    }

    // Only require a client key if we don't have a server-side key for the selected provider
    if (!keyFromClient && !hasServerKey) {
      return NextResponse.json(
        { error: `${provider} API key is required (enter it in the UI, or set it in server env)` },
        { status: 400 }
      );
    }

    const ftInToCm = (ft: number, inches: number) => ft * 30.48 + inches * 2.54;
    const normalizedHeight =
      (height_unit === 'ftin' && typeof height_ft === 'number' && typeof height_in === 'number')
        ? ftInToCm(height_ft, Math.max(0, Math.min(11.9, height_in)))
        : height;

    const input = {
      age,
      weight,
      height: normalizedHeight,
      gender,
      goal,
      level,
      tenure,
      goal_weight,
      notes,
      model_provider,
      apiKey: keyFromClient || undefined, // Passed from client (optional if server env has key)
    };

    // Streaming (SSE) mode for progress UI
    if (stream === true) {
      const encoder = new TextEncoder();
      const sse = (event: string, data: unknown) =>
        encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);

      const responseStream = new ReadableStream<Uint8Array>({
        async start(controller) {
          let pct = 5;
          const tick = setInterval(() => {
            pct = Math.min(95, pct + 1);
            controller.enqueue(sse('progress', { pct, stage: 'Generating routine…' }));
          }, 1000);

          try {
            controller.enqueue(sse('progress', { pct: 5, stage: 'Validating request…' }));
            controller.enqueue(sse('progress', { pct: 10, stage: 'Contacting AI provider…' }));

            const routine =
              provider === 'OpenAI'
                ? await generateRoutineOpenAI(input)
                : await generateRoutine(input);

            clearInterval(tick);
            controller.enqueue(sse('progress', { pct: 100, stage: 'Done' }));
            controller.enqueue(sse('routine', { routine }));
          } catch (err: unknown) {
            clearInterval(tick);
            const message = err instanceof Error ? err.message : String(err);
            controller.enqueue(sse('error', { message }));
          } finally {
            controller.close();
          }
        },
      });

      return new NextResponse(responseStream, {
        headers: {
          'Content-Type': 'text/event-stream; charset=utf-8',
          'Cache-Control': 'no-cache, no-transform',
          Connection: 'keep-alive',
        },
      });
    }

    // Non-streaming mode
    const routine =
      provider === 'OpenAI'
        ? await generateRoutineOpenAI(input)
        : await generateRoutine(input);

    if (!routine) {
      return NextResponse.json(
        { error: 'Failed to generate routine. Check your API key and provider.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ routine }, { status: 200 });
  } catch (error: unknown) {
    // Don't leak secrets in logs — log the message only
    const message = error instanceof Error ? error.message : String(error);
    console.error('Error generating routine:', message);
    return NextResponse.json(
      { error: message || 'Internal server error' },
      { status: 500 }
    );
  }
}
