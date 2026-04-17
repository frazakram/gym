import { withCors } from "../../cors-middleware";
import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { getSession } from '@/lib/auth';
import type { BodyCompositionAnalysis } from '@/types';

export const runtime = "nodejs";

function getOpenAI(clientKey?: string) {
  const apiKey = clientKey || process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OpenAI API key is required. Add it in AI Settings (sidebar).');
  return new OpenAI({ apiKey, baseURL: 'https://api.openai.com/v1' });
}

const SYSTEM_PROMPT = `You are an expert fitness analyst specializing in body composition assessment.
Analyze the provided body photo(s) to give helpful, respectful, and actionable fitness insights.

IMPORTANT GUIDELINES:
- Focus ONLY on fitness-relevant observations (posture, muscle development, body composition)
- Be respectful and professional - no judgmental language
- Provide constructive, actionable recommendations
- If multiple photos are provided, use them to get a comprehensive view
- Estimate body fat percentage ranges conservatively (provide ranges, not exact numbers)
- Consider realistic timelines for goal achievement
- Suggest exercise modifications based on current development level

Return your analysis as a JSON object with these fields:
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
            { type: 'text', text: 'Please analyze this body composition photo and provide fitness insights.' },
            ...imageMessages,
          ],
        },
      ],
      max_tokens: 1000,
      temperature: 0.7,
    });

    const content = response.choices[0]?.message?.content;
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
    } catch {
      analysis = {
        body_type: 'average',
        muscle_development: 'beginner',
        posture_notes: [],
        focus_areas: ['Overall fitness development'],
        overall_assessment: 'Unable to perform detailed analysis. Please ensure photos are clear and well-lit.',
        confidence_score: 0.5,
        analyzed_at: new Date().toISOString(),
      };
    }

    return withCors(NextResponse.json({ analysis }));
  } catch (error) {
    console.error('Body analysis error:', error);
    return withCors(NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to analyze body composition' },
      { status: 500 },
    ));
  }
}
