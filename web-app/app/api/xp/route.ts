import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getUserXp, initializeDatabase, getStreak } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    await initializeDatabase();
    const [xp, streak] = await Promise.all([
      getUserXp(session.userId),
      getStreak(session.userId),
    ]);
    return NextResponse.json({
      total_xp: xp.total_xp,
      current_streak: streak.current,
      longest_streak: streak.longest,
    });
  } catch (error) {
    console.error("GET /api/xp failed:", error);
    return NextResponse.json({ error: "Failed to fetch XP" }, { status: 500 });
  }
}
