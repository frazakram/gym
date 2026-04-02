import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getStreak } from "@/lib/db";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const streak = await getStreak(session.userId);
    return NextResponse.json(streak);
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch streak" },
      { status: 500 }
    );
  }
}
