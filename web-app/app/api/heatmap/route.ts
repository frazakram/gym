import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getHeatmapData, initializeDatabase } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const daysRaw = searchParams.get("days");
  // Default 56 days (8 weeks), max 90 days
  const days = Math.max(7, Math.min(90, Number(daysRaw ?? 56) || 56));

  await initializeDatabase();

  const heatmapData = await getHeatmapData(session.userId, days);

  return NextResponse.json({ heatmap: heatmapData }, { status: 200 });
}
