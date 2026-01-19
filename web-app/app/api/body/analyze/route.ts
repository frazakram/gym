import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import type { BodyCompositionAnalysis } from '@/types'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { images } = body

    if (!images || !Array.isArray(images) || images.length === 0) {
      return NextResponse.json(
        { error: 'At least one image is required' },
        { status: 400 }
      )
    }

    if (images.length > 2) {
      return NextResponse.json(
        { error: 'Maximum 2 images allowed' },
        { status: 400 }
      )
    }

    // Validate images are base64 encoded
    for (const img of images) {
      if (typeof img !== 'string' || !img.startsWith('data:image/')) {
        return NextResponse.json(
          { error: 'Invalid image format. Must be base64 encoded.' },
          { status: 400 }
        )
      }
    }

    // Prepare messages for GPT-4o Vision
    const imageMessages = images.map((img: string) => ({
      type: 'image_url' as const,
      image_url: {
        url: img,
        detail: 'high' as const,
      },
    }))

    const systemPrompt = `You are an expert fitness analyst specializing in body composition assessment. 
Analyze the provided body photo(s) to give helpful, respectful, and actionable fitness insights.

IMPORTANT GUIDELINES:
- Focus ONLY on fitness-relevant observations (posture, muscle development, body composition)
- Be respectful and professional - no judgmental language
- Provide constructive, actionable recommendations
- If multiple photos are provided, use them to get a comprehensive view
- Estimate body fat percentage ranges conservatively (provide ranges, not exact numbers)
- Consider realistic timelines for goal achievement
- Suggest exercise modifications based on current development level

Your analysis should help the user understand:
1. Current body composition and development level
2. Realistic fitness goals and timeframes
3. Areas to focus on for their specific goals
4. Any posture or form considerations for safer training

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
}`

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Please analyze this body composition photo and provide fitness insights.',
            },
            ...imageMessages,
          ],
        },
      ],
      max_tokens: 1000,
      temperature: 0.7,
    })

    const content = response.choices[0]?.message?.content
    if (!content) {
      throw new Error('No response from AI')
    }

    // Parse JSON from response
    let analysis: BodyCompositionAnalysis
    try {
      // Extract JSON from markdown code blocks if present
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, content]
      const jsonStr = jsonMatch[1]?.trim() || content.trim()
      const parsed = JSON.parse(jsonStr)
      
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
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError)
      // Fallback analysis
      analysis = {
        body_type: 'average',
        muscle_development: 'beginner',
        posture_notes: [],
        focus_areas: ['Overall fitness development'],
        overall_assessment: 'Unable to perform detailed analysis. Please ensure photos are clear and well-lit.',
        confidence_score: 0.5,
        analyzed_at: new Date().toISOString(),
      }
    }

    return NextResponse.json({ analysis })
  } catch (error) {
    console.error('Body analysis error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to analyze body composition' },
      { status: 500 }
    )
  }
}
