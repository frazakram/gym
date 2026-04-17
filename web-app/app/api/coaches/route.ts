import { withCors } from "@/lib/corsMiddleware";
import { NextRequest, NextResponse } from "next/server";
import { initializeDatabase, listApprovedCoachesPublic } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const limit = Math.max(1, Math.min(100, Number(searchParams.get("limit") ?? 50) || 50));

  await initializeDatabase();
  const coaches = await listApprovedCoachesPublic(limit);
  return withCors(NextResponse.json({ coaches }, { status: 200 }));
}
