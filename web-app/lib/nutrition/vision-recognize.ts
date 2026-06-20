/**
 * Free, high-quality photo meal recognition using the OpenAI vision model the
 * app already uses for body/gym analysis — no extra third-party service.
 *
 * The model identifies each food/drink in the photo and estimates calories +
 * macros for the visible portion. Results come back as the same editable
 * {@link DraftFoodItem} draft the other entry flows use, so the user always
 * reviews/edits before anything is logged.
 *
 * Used as the fallback when LOGMEAL_API_KEY is absent (see app/api/nutrition/
 * photo/route.ts). Uses process.env.OPENAI_API_KEY server-side.
 */

import OpenAI from 'openai'
import type { DraftFoodItem, MacroSet, PhotoRecognitionResult } from '@/types'

const MODEL = process.env.OPENAI_VISION_MODEL || 'gpt-4o'

function getClient(): OpenAI | null {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) return null
  return new OpenAI({ apiKey, baseURL: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1' })
}

export function isVisionConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY)
}

const SYSTEM_PROMPT = `You are a nutrition estimator for a fitness app. The user has uploaded a photo of a meal they want to log.

Identify each distinct food or drink item visible. For each item, estimate the nutrition for the portion you can actually see in the photo (NOT per 100 g). Account for likely cooking oils, butter, dressings and sauces. Indian dishes are common — handle them well (e.g. dal, roti, biryani, paneer, sabzi).

Return ONLY a JSON object (no prose, no markdown) shaped exactly:
{
  "items": [
    { "name": "string", "calories": number, "protein_g": number, "carb_g": number, "fat_g": number }
  ],
  "confidence": number  // 0..1, your overall confidence in the identification + estimate
}

Rules:
- One entry per distinct food. Combine garnishes into the main dish.
- Numbers are for the visible portion, rounded sensibly. Use 0 only when genuinely ~0.
- If the image is not food or is unidentifiable, return {"items": [], "confidence": 0}.`

function num(v: unknown): number {
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) && n >= 0 ? n : 0
}
const round1 = (n: number) => Math.round(n * 10) / 10

export async function recognizeMealWithVision(imageDataUrl: string): Promise<PhotoRecognitionResult> {
  const client = getClient()
  if (!client) return { ok: false, reason: 'not_configured', items: [] }
  if (!imageDataUrl.startsWith('data:image/')) return { ok: false, reason: 'invalid_image', items: [] }

  try {
    const res = await client.chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Identify the foods in this meal photo and return the JSON.' },
            { type: 'image_url', image_url: { url: imageDataUrl, detail: 'low' } },
          ],
        },
      ],
      max_tokens: 700,
      temperature: 0.2,
      response_format: { type: 'json_object' },
    })

    const content = res.choices[0]?.message?.content
    if (!content) return { ok: false, reason: 'no_match', items: [] }

    const parsed = JSON.parse(content) as { items?: unknown[]; confidence?: number }
    const confidence = typeof parsed.confidence === 'number' ? Math.max(0, Math.min(1, parsed.confidence)) : 0.6
    const raw = Array.isArray(parsed.items) ? parsed.items : []

    const items: DraftFoodItem[] = raw
      .map((r, i): DraftFoodItem | null => {
        const o = r as Record<string, unknown>
        const name = String(o.name ?? '').trim().slice(0, 120)
        if (!name) return null
        const macros: MacroSet = {
          calories: Math.round(num(o.calories)),
          protein_g: round1(num(o.protein_g)),
          carb_g: round1(num(o.carb_g)),
          fat_g: round1(num(o.fat_g)),
        }
        if (!macros.calories && !macros.protein_g && !macros.carb_g && !macros.fat_g) return null
        // Each detected food = one serving; quantity scales it linearly.
        return {
          tempId: `vision-${Date.now()}-${i}`,
          name,
          quantity: 1,
          unit: 'serving',
          source: 'photo',
          confidence,
          perServing: macros,
          ...macros,
        }
      })
      .filter((x): x is DraftFoodItem => x !== null)

    if (items.length === 0) return { ok: false, reason: 'no_match', items: [] }
    return { ok: true, lowConfidence: confidence < 0.5, items }
  } catch (error) {
    console.error('vision recognizeMeal failed:', error)
    return { ok: false, reason: 'error', items: [] }
  }
}
