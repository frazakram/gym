/**
 * LogMeal food-recognition integration (photo → foods + macros).
 *
 * Two-step flow (per LogMeal API v2 docs, base https://api.logmeal.com):
 *   1. POST /v2/image/segmentation/complete  (multipart, field `image`)
 *        → imageId + recognized dishes with confidence
 *   2. POST /v2/nutrition/recipe/nutritionalInfo  { imageId }
 *        → calories + macros for the intake
 *
 * Auth: `Authorization: Bearer <LOGMEAL_API_KEY>` (an APIUser token).
 *
 * This module is fully key-gated: with no key, or on any failure / low
 * confidence, it returns a structured result the caller turns into a
 * "fall back to manual search" response — it never throws to the route.
 *
 * NOTE: LogMeal's exact JSON field names vary by plan/version and require a
 * live key to lock down. Parsing here is intentionally defensive (it probes
 * several known field shapes); confirm against your account's responses and
 * tighten if needed.
 */

import type { DraftFoodItem, PhotoRecognitionResult } from '@/types';

const LOGMEAL_BASE = process.env.LOGMEAL_BASE_URL || 'https://api.logmeal.com';

/** Recognitions below this confidence trigger a manual-search fallback. */
const CONFIDENCE_THRESHOLD = 0.4;

const TIMEOUT_MS = 20000;

function fallback(reason: string): PhotoRecognitionResult {
  return { ok: false, reason, items: [] };
}

/** Decode a `data:image/...;base64,...` URL into bytes + mime type. */
function dataUrlToBytes(dataUrl: string): { bytes: Uint8Array; mime: string } | null {
  const m = dataUrl.match(/^data:(image\/[\w.+-]+);base64,(.+)$/);
  if (!m) return null;
  return { mime: m[1], bytes: new Uint8Array(Buffer.from(m[2], 'base64')) };
}

async function logmealFetch(path: string, init: RequestInit, token: string): Promise<unknown> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${LOGMEAL_BASE}${path}`, {
      ...init,
      headers: { ...(init.headers || {}), Authorization: `Bearer ${token}` },
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`LogMeal ${path} → ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(t);
  }
}

function num(v: unknown): number {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

/** Pull the first finite number found at any of the given dot-paths. */
function pick(obj: unknown, paths: string[]): number {
  for (const path of paths) {
    let cur: unknown = obj;
    for (const key of path.split('.')) {
      if (cur && typeof cur === 'object' && key in (cur as Record<string, unknown>)) {
        cur = (cur as Record<string, unknown>)[key];
      } else {
        cur = undefined;
        break;
      }
    }
    const n = num(cur);
    if (n > 0) return n;
  }
  return 0;
}

/** Extract recognized dish names + best confidence from a segmentation response. */
function parseRecognition(seg: Record<string, unknown>): { names: string[]; confidence: number } {
  const names: string[] = [];
  let confidence = 0;
  const groups = (seg.segmentation_results ?? seg.recognition_results ?? []) as unknown[];
  for (const g of Array.isArray(groups) ? groups : []) {
    const recs = ((g as Record<string, unknown>)?.recognition_results ??
      (Array.isArray(g) ? g : [g])) as unknown[];
    for (const r of Array.isArray(recs) ? recs : []) {
      const rec = r as Record<string, unknown>;
      const name = (rec.name ?? rec.foodName ?? rec.label) as string | undefined;
      const prob = num(rec.prob ?? rec.confidence ?? rec.score);
      if (name && !names.includes(name)) names.push(name);
      if (prob > confidence) confidence = prob;
    }
  }
  return { names, confidence };
}

/**
 * Recognize a meal photo and estimate its macros.
 * @param imageDataUrl base64 `data:image/...` URL (already compressed client-side).
 */
export async function recognizeMeal(imageDataUrl: string): Promise<PhotoRecognitionResult> {
  const token = process.env.LOGMEAL_API_KEY;
  if (!token) return fallback('not_configured');

  const decoded = dataUrlToBytes(imageDataUrl);
  if (!decoded) return fallback('invalid_image');

  try {
    // Step 1 — segmentation + recognition.
    const form = new FormData();
    const blob = new Blob([decoded.bytes as unknown as BlobPart], { type: decoded.mime });
    form.append('image', blob, 'meal.jpg');
    const seg = (await logmealFetch(
      '/v2/image/segmentation/complete',
      { method: 'POST', body: form },
      token
    )) as Record<string, unknown>;

    const imageId = seg.imageId ?? seg.image_id;
    const { names, confidence } = parseRecognition(seg);

    if (!imageId || names.length === 0) return fallback('no_match');

    // Step 2 — nutritional info for the recognized intake.
    let nutrition: Record<string, unknown> = {};
    try {
      nutrition = (await logmealFetch(
        '/v2/nutrition/recipe/nutritionalInfo',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageId }),
        },
        token
      )) as Record<string, unknown>;
    } catch (error) {
      console.warn('LogMeal nutritionalInfo failed; returning names only:', error);
    }

    const info = (nutrition.nutritional_info ?? nutrition) as Record<string, unknown>;
    const calories = pick(info, [
      'calories',
      'energy',
      'totalNutrients.ENERC_KCAL.quantity',
      'nutrients.calories',
    ]);
    const protein_g = pick(info, ['totalNutrients.PROCNT.quantity', 'protein', 'nutrients.protein']);
    const carb_g = pick(info, ['totalNutrients.CHOCDF.quantity', 'carbs', 'nutrients.carbs']);
    const fat_g = pick(info, ['totalNutrients.FAT.quantity', 'fat', 'nutrients.fat']);

    // Present the whole meal as a single editable draft item (the user can then
    // add/remove/adjust ingredients in the shared editor). Macros attach to the
    // top item; recognized names beyond the first are appended to the label.
    const name = names.length > 1 ? `${names[0]} + ${names.length - 1} more` : names[0];
    const macros = {
      calories: Math.round(calories),
      protein_g: Math.round(protein_g * 10) / 10,
      carb_g: Math.round(carb_g * 10) / 10,
      fat_g: Math.round(fat_g * 10) / 10,
    };
    const item: DraftFoodItem = {
      tempId: `photo-${Date.now()}`,
      name,
      quantity: 1,
      unit: 'serving',
      source: 'photo',
      confidence: Math.round(confidence * 100) / 100,
      ...macros,
      // One recognized meal = one serving; quantity scales it linearly.
      perServing: macros,
    };

    return {
      ok: true,
      lowConfidence: confidence < CONFIDENCE_THRESHOLD,
      items: [item],
    };
  } catch (error) {
    console.error('LogMeal recognizeMeal failed:', error);
    return fallback('error');
  }
}

export function isLogMealConfigured(): boolean {
  return Boolean(process.env.LOGMEAL_API_KEY);
}
