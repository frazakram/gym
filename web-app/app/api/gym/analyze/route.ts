import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import type { GymEquipmentAnalysis } from '@/types';

const EQUIPMENT_DETECTION_PROMPT = `Analyze these gym photos and identify ALL visible exercise equipment with high precision.

Be EXTREMELY DETAILED and specific:
- For weights: specify exact types (e.g., "Olympic barbell 45lb", "Adjustable dumbbells 5-50lbs", "Fixed dumbbells up to 100lbs")
- For machines: name specific machines (e.g., "Lat pulldown machine", "Leg press", "Cable crossover")
- For benches: specify types (e.g., "Flat bench", "Adjustable incline bench", "Decline bench")
- For cardio: list exact equipment (e.g., "Treadmill", "Rowing machine", "Stationary bike")

Assess the gym setup:
1. Gym Type:
   - "home" = Home gym setup with basic equipment
   - "commercial" = Full commercial gym with comprehensive equipment
   - "specialized" = Specialized facility (e.g., powerlifting, CrossFit box)

2. Space Assessment:
   - "limited" = Small space, minimal room for movement
   - "moderate" = Medium space, can perform most exercises
   - "spacious" = Large gym with ample space

3. Unique Features: Any special equipment or setups (e.g., "lifting platform", "smith machine", "functional trainer")

4. Limitations: Missing common equipment or restrictions (e.g., "no squat rack", "dumbbells only up to 20kg", "no cable machines")

Return JSON format:
{
  "equipment_detected": [...],
  "gym_type": "home" | "commercial" | "specialized",
  "space_assessment": "limited" | "moderate" | "spacious",
  "unique_features": [...],
  "limitations": [...],
  "confidence_score": 0.0-1.0
}`;

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { images } = await request.json();

    if (!images || !Array.isArray(images) || images.length === 0) {
      return NextResponse.json(
        { error: 'No images provided' },
        { status: 400 }
      );
    }

    if (images.length > 6) {
      return NextResponse.json(
        { error: 'Maximum 6 images allowed' },
        { status: 400 }
      );
    }

    // Get OpenAI API key
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      );
    }

    // Build vision API request
    const messages = [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: EQUIPMENT_DETECTION_PROMPT
          },
          ...images.map((base64: string) => ({
            type: 'image_url',
            image_url: {
              url: base64.startsWith('data:') ? base64 : `data:image/jpeg;base64,${base64}`,
              detail: 'high' // Use high detail for better equipment recognition
            }
          }))
        ]
      }
    ];

    // Call OpenAI Vision API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages,
        response_format: { type: 'json_object' },
        max_tokens: 1500,
        temperature: 0.3 // Lower temperature for more consistent analysis
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', errorText);
      return NextResponse.json(
        { error: 'Failed to analyze images' },
        { status: response.status }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return NextResponse.json(
        { error: 'No analysis returned from AI' },
        { status: 500 }
      );
    }

    // Parse the JSON response
    let analysis: GymEquipmentAnalysis;
    try {
      const parsed = JSON.parse(content);
      analysis = {
        equipment_detected: parsed.equipment_detected || [],
        gym_type: parsed.gym_type || 'home',
        space_assessment: parsed.space_assessment || 'moderate',
        unique_features: parsed.unique_features,
        limitations: parsed.limitations,
        confidence_score: parsed.confidence_score || 0.8,
        analyzed_at: new Date().toISOString()
      };
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      return NextResponse.json(
        { error: 'Invalid analysis format' },
        { status: 500 }
      );
    }

    return NextResponse.json({ analysis }, { status: 200 });
  } catch (error) {
    console.error('Error analyzing gym equipment:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
