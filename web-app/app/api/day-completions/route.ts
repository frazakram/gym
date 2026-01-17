import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getDayCompletions, initializeDatabase, toggleDayCompletion } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const routineIdRaw = searchParams.get("routineId");
  const routineId = Number(routineIdRaw);
  if (!routineIdRaw || !Number.isFinite(routineId)) {
    return NextResponse.json({ error: "routineId is required" }, { status: 400 });
  }

  await initializeDatabase();
  const days = await getDayCompletions(session.userId, routineId);
  return NextResponse.json({ days }, { status: 200 });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const routineId = Number((body as any).routineId);
  const dayIndex = Number((body as any).dayIndex);
  const completed = Boolean((body as any).completed);

  if (!Number.isFinite(routineId) || !Number.isFinite(dayIndex)) {
    return NextResponse.json({ error: "routineId and dayIndex are required" }, { status: 400 });
  }

  await initializeDatabase();
  const ok = await toggleDayCompletion(session.userId, routineId, dayIndex, completed);
  if (!ok) {
    return NextResponse.json({ error: "Failed to update rest-day completion" }, { status: 403 });
  }
  return NextResponse.json({ success: true }, { status: 200 });
}

