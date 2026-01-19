import { NextRequest, NextResponse } from "next/server";
import { getApprovedCoachPublicById, initializeDatabase } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  void req;
  const { id } = await ctx.params;
  const coachId = Math.floor(Number(id));
  if (!Number.isFinite(coachId) || coachId <= 0) {
    return NextResponse.json({ error: "Invalid coach id" }, { status: 400 });
  }

  await initializeDatabase();
  const coach = await getApprovedCoachPublicById(coachId);
  if (!coach) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ coach }, { status: 200 });
}

