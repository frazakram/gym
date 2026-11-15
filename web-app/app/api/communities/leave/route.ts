import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { initializeDatabase, leaveCommunity } from "@/lib/db";
import { requireCsrf } from "@/lib/csrf";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const csrfError = await requireCsrf(req, session.userId);
    if (csrfError) return csrfError;

    await initializeDatabase();
    const ok = await leaveCommunity(session.userId);
    if (!ok) {
      return NextResponse.json({ error: "You are not in any community" }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("POST /api/communities/leave failed:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
