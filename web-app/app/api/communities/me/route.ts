import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getMyCommunity, getRejoinCooldownExpiry, initializeDatabase } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    await initializeDatabase();
    const [community, cooldownExpiry] = await Promise.all([
      getMyCommunity(session.userId),
      getRejoinCooldownExpiry(session.userId),
    ]);
    return NextResponse.json({ community, cooldown_expires_at: cooldownExpiry });
  } catch (error) {
    console.error("GET /api/communities/me failed:", error);
    // Return empty state instead of 500 so UI renders join/create options
    return NextResponse.json({ community: null, cooldown_expires_at: null });
  }
}
