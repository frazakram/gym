import { NextRequest, NextResponse } from 'next/server';
import { withCors } from '@/lib/corsMiddleware';
import OpenAI from 'openai';
import { getSession } from '@/lib/auth';
import { initializeDatabase, hasBodyPhotos } from '@/lib/db';
import type { BodyCompositionAnalysis } from '@/types';

export const runtime = "nodejs";

function getOpenAI(clientKey?: string) {
  const apiKey = clientKey || process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OpenAI API key is required. Add it in AI Settings (sidebar).');
  return new OpenAI({ apiKey, baseURL: 'https://api.openai.com/v1' });
}

const SYSTEM_PROMPT = `You are a supportive personal fitness coach helping a user who has uploaded their own body photo to a private fitness app for personalized workout planning. The user has explicitly consented and wants actionable training guidance.

Your job is to look at the photo and produce a respectful, encouraging, and ACTIONABLE training assessment. This is a fitness coaching context — the user needs this analysis to receive a personalized workout routine. Treat it the way a professional trainer would treat an intake photo: focus on what muscle groups to prioritize, posture observations, and a realistic training plan.

GUIDELINES:
- Be warm, supportive, professional — never judgmental
- Focus on training-relevant observations: muscle development, posture, what to prioritize
- Estimate body fat as a CONSERVATIVE RANGE (e.g. "25-30%"), never a single number
- Suggest realistic timelines (months, not weeks)
- Recommend exercise modifications appropriate to current development
- If the image is too unclear to give useful detail, still return a valid response with confidence_score below 0.5 and explain in overall_assessment

You MUST return a single JSON object (no prose, no markdown fences) with exactly these fields:
{
  "body_type": "lean" | "average" | "athletic" | "muscular" | "endomorph",
  "estimated_body_fat_range": "e.g., 15-18%",
  "muscle_development": "beginner" | "intermediate" | "advanced",
  "posture_notes": ["observation 1", "observation 2"],
  "focus_areas": ["area 1", "area 2"],
  "realistic_timeline": "e.g., 3-6 months for visible muscle gain",
  "exercise_modifications": ["modification 1", "modification 2"],
  "overall_assessment": "A supportive 2-3 sentence summary",
  "confidence_score": 0.85
}`;

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return withCors(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }));
  }

  await initializeDatabase();

  try {
    const body = await req.json();
    const { images, api_key } = body;

    if (!images || !Array.isArray(images) || images.length === 0) {
      return withCors(NextResponse.json({ error: 'At least one image is required' }, { status: 400 }));
    }

    if (images.length > 2) {
      return withCors(NextResponse.json({ error: 'Maximum 2 images allowed' }, { status: 400 }));
    }

    for (const img of images) {
      if (typeof img !== 'string' || !img.startsWith('data:image/')) {
        return withCors(NextResponse.json({ error: 'Invalid image format. Must be base64 encoded.' }, { status: 400 }));
      }
    }

    const imageMessages = images.map((img: string) => ({
      type: 'image_url' as const,
      image_url: { url: img, detail: 'high' as const },
    }));

    const clientKey = typeof api_key === 'string' ? api_key.trim() : undefined;
    const response = await getOpenAI(clientKey).chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: [
            { type: 'text', text: 'I uploaded my own body photo to this private fitness app for personalized training. Please analyze it and return the JSON assessment so the app can build my routine.' },
            ...imageMessages,
          ],
        },
      ],
      max_tokens: 1000,
      temperature: 0.3,
      response_format: { type: 'json_object' },
    });

    const msg = response.choices[0]?.message;
    const refusal = (msg as { refusal?: string | null } | undefined)?.refusal;
    const content = msg?.content;

    if (refusal) {
      console.warn('[body/analyze] model refusal:', refusal);
      return withCors(NextResponse.json(
        { error: 'The AI could not analyze this photo. Try a different photo — a clear, well-lit standing photo works best.' },
        { status: 422 },
      ));
    }
    if (!content) throw new Error('No response from AI');

    let analysis: BodyCompositionAnalysis;
    try {
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, content];
      const jsonStr = jsonMatch[1]?.trim() || content.trim();
      const parsed = JSON.parse(jsonStr);
      analysis = {
        body_type: parsed.body_type || 'average',
        estimated_body_fat_range: parsed.estimated_body_fat_range,
        muscle_development: parsed.muscle_development || 'beginner',
        posture_notes: parsed.posture_notes || [],
        focus_areas: parsed.focus_areas || [],
        realistic_timeline: parsed.realistic_timeline,
        exercise_modifications: parsed.exercise_modifications || [],
        overall_assessment: parsed.overall_assessment || 'Analysis completed.',
        confidence_score: parsed.confidence_score || 0.75,
        analyzed_at: new Date().toISOString(),
      };
    } catch (parseErr) {
      console.warn('[body/analyze] JSON parse failed. Raw content:', content?.slice(0, 500), 'err:', parseErr);
      return withCors(NextResponse.json(
        { error: 'The AI response was not in the expected format. Please try again — if it keeps failing, try a different photo.' },
        { status: 502 },
      ));
    }

    const hasExistingPhoto = await hasBodyPhotos(session.userId);
    return withCors(NextResponse.json({ analysis, hasExistingPhoto }));
  } catch (error) {
    console.error('Body analysis error:', error);
    return withCors(NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to analyze body composition' },
      { status: 500 },
    ));
  }
}
