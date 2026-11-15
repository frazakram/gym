import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getStreak, getUserXp, initializeDatabase } from "@/lib/db";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    await initializeDatabase();
    const [streak, xp] = await Promise.all([
      getStreak(session.userId),
      getUserXp(session.userId),
    ]);
    return NextResponse.json({ ...streak, total_xp: xp.total_xp });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch streak" },
      { status: 500 }
    );
  }
}