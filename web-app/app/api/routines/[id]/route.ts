import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { deleteRoutineById, initializeDatabase, setRoutineArchived } from "@/lib/db";

export const runtime = "nodejs";

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const routineId = Number(id);
  if (!Number.isFinite(routineId)) return NextResponse.json({ error: "Invalid routine id" }, { status: 400 });

  const body = await req.json().catch(() => ({}));
  const archived = Boolean((body as any).archived);

  await initializeDatabase();
  const ok = await setRoutineArchived(session.userId, routineId, archived);
  if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ success: true }, { status: 200 });
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const routineId = Number(id);
  if (!Number.isFinite(routineId)) return NextResponse.json({ error: "Invalid routine id" }, { status: 400 });

  await initializeDatabase();
  const ok = await deleteRoutineById(session.userId, routineId);
  if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ success: true }, { status: 200 });
}

