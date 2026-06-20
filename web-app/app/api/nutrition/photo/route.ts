import { withCors } from "@/lib/corsMiddleware";
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { requireCsrf } from "@/lib/csrf";
import { initializeDatabase } from "@/lib/db";
import { recognizeMeal, isLogMealConfigured } from "@/lib/nutrition/logmeal";
import { recognizeMealWithVision, isVisionConfigured } from "@/lib/nutrition/vision-recognize";
import { rateLimit } from "@/lib/rate-limit";
import { PhotoRecognizeSchema, safeParseWithError } from "@/lib/validations";
import type { PhotoRecognitionResult } from "@/types";

export const runtime = "nodejs";

/**
 * POST /api/nutrition/photo — recognize a meal photo.
 *
 * Engine priority: LogMeal (if LOGMEAL_API_KEY set) → OpenAI vision (if
 * OPENAI_API_KEY set) → manual search. Returns an editable DRAFT only — it
 * never logs anything; the client confirms before POSTing food-entries. On
 * `ok:false` the client falls back to manual search.
 *
 * The uploaded image is used transiently for recognition and is NOT persisted.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return withCors(NextResponse.json({ error: "Unauthorized" }, { status: 401 }));

    const csrfError = await requireCsrf(request, session.userId);
    if (csrfError) return csrfError;

    await initializeDatabase();

    // Photo recognition is the most expensive call — keep it tightly limited.
    const rl = await rateLimit({ key: `nutri:photo:${session.userId}`, limit: 20, windowSeconds: 3600 });
    if (!rl.allowed) {
      return withCors(
        NextResponse.json({ error: "Photo limit reached, try again later" }, { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds) } })
      );
    }

    const parsed = safeParseWithError(PhotoRecognizeSchema, await request.json().catch(() => ({})));
    if (!parsed.success) return withCors(NextResponse.json({ error: parsed.error }, { status: 400 }));

    const image = parsed.data.image;
    let result: PhotoRecognitionResult = { ok: false, reason: "not_configured", items: [] };

    // 1) LogMeal if configured.
    if (isLogMealConfigured()) {
      result = await recognizeMeal(image);
    }
    // 2) Fall back to OpenAI vision when LogMeal isn't set or didn't produce a
    //    usable result. This is the default free engine when an OpenAI key exists.
    if (!result.ok && isVisionConfigured()) {
      result = await recognizeMealWithVision(image);
    }

    // Always 200: the body's `ok`/`reason` tells the client whether to show the
    // draft or fall back to manual search.
    return withCors(NextResponse.json(result));
  } catch (error) {
    console.error("photo recognition failed:", error);
    return withCors(NextResponse.json({ ok: false, reason: "error", items: [] }, { status: 200 }));
  }
}
