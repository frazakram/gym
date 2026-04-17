import { withCors } from "@/lib/corsMiddleware";
import { NextRequest, NextResponse } from "next/server";
import { getApprovedCoachPublicById, initializeDatabase } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  void req;
  const { id } = await ctx.params;
  const coachId = Math.floor(Number(id));
  if (!Number.isFinite(coachId) || coachId <= 0) {
    return withCors(NextResponse.json({ error: "Invalid coach id" }, { status: 400 }));
  }

  await initializeDatabase();
  const coach = await getApprovedCoachPublicById(coachId);
  if (!coach) return withCors(NextResponse.json({ error: "Not found" }, { status: 404 }));
  return withCors(NextResponse.json({ coach }, { status: 200 }));
}
