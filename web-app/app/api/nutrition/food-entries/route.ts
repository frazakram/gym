import { withCors } from "@/lib/corsMiddleware";
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { requireCsrf } from "@/lib/csrf";
import {
  initializeDatabase,
  getFoodEntries,
  getFoodEntriesRange,
  addFoodEntry,
  addFavoriteFood,
} from "@/lib/db";
import { FoodEntryCreateSchema, safeParseWithError } from "@/lib/validations";

export const runtime = "nodejs";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * GET — list food entries.
 *  - `?date=YYYY-MM-DD` for a single day (default today)
 *  - `?from=YYYY-MM-DD&to=YYYY-MM-DD` for the historical range view
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return withCors(NextResponse.json({ error: "Unauthorized" }, { status: 401 }));

    await initializeDatabase();

    const { searchParams } = new URL(request.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    if (from && to) {
      if (!DATE_RE.test(from) || !DATE_RE.test(to)) {
        return withCors(NextResponse.json({ error: "Invalid date range" }, { status: 400 }));
      }
      const entries = await getFoodEntriesRange(session.userId, from, to);
      return withCors(NextResponse.json({ entries }));
    }

    const dateParam = searchParams.get("date");
    const date = dateParam && DATE_RE.test(dateParam) ? dateParam : new Date().toISOString().slice(0, 10);
    const entries = await getFoodEntries(session.userId, date);
    return withCors(NextResponse.json({ date, entries }));
  } catch (error) {
    console.error("list food entries failed:", error);
    return withCors(NextResponse.json({ error: "Failed to load entries" }, { status: 500 }));
  }
}

/** POST — log a (confirmed) food entry. Optionally save it as a favorite. */
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return withCors(NextResponse.json({ error: "Unauthorized" }, { status: 401 }));

    const csrfError = await requireCsrf(request, session.userId);
    if (csrfError) return csrfError;

    await initializeDatabase();

    const parsed = safeParseWithError(FoodEntryCreateSchema, await request.json().catch(() => ({})));
    if (!parsed.success) return withCors(NextResponse.json({ error: parsed.error }, { status: 400 }));

    const { save_favorite, ...data } = parsed.data;
    const entry = await addFoodEntry(session.userId, data);
    if (!entry) return withCors(NextResponse.json({ error: "Failed to save entry" }, { status: 500 }));

    if (save_favorite) {
      // Best-effort: a favorites failure shouldn't fail the log.
      await addFavoriteFood(session.userId, {
        source: data.source,
        name: data.name,
        calories: data.calories,
        protein_g: data.protein_g,
        carb_g: data.carb_g,
        fat_g: data.fat_g,
        quantity: data.quantity,
        unit: data.unit,
      }).catch(() => null);
    }

    return withCors(NextResponse.json({ entry }, { status: 201 }));
  } catch (error) {
    console.error("create food entry failed:", error);
    return withCors(NextResponse.json({ error: "Failed to save entry" }, { status: 500 }));
  }
}
