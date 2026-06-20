import { withCors } from "@/lib/corsMiddleware";
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  initializeDatabase,
  getNutritionGoals,
  getDailyTotals,
  getFoodEntries,
  getRecentFoods,
  getFavoriteFoods,
} from "@/lib/db";
import type { NutritionDaySummary } from "@/types";

export const runtime = "nodejs";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Dashboard payload for a single day: goals, today's totals + entries, and the
 * recent/favorite quick-log lists. `?date=YYYY-MM-DD` (defaults to today UTC).
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return withCors(NextResponse.json({ error: "Unauthorized" }, { status: 401 }));

    await initializeDatabase();

    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get("date");
    const date = dateParam && DATE_RE.test(dateParam) ? dateParam : new Date().toISOString().slice(0, 10);

    const [goals, totals, entries, recent, favorites] = await Promise.all([
      getNutritionGoals(session.userId),
      getDailyTotals(session.userId, date),
      getFoodEntries(session.userId, date),
      getRecentFoods(session.userId, 10),
      getFavoriteFoods(session.userId),
    ]);

    const payload: NutritionDaySummary = { date, goals, totals, entries, recent, favorites };
    return withCors(NextResponse.json(payload));
  } catch (error) {
    console.error("nutrition summary failed:", error);
    return withCors(NextResponse.json({ error: "Failed to load nutrition summary" }, { status: 500 }));
  }
}
