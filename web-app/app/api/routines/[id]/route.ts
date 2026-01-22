import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { deleteRoutineById, initializeDatabase, setRoutineArchived } from "@/lib/db";
import { RoutineIdParamSchema, safeParseWithError } from "@/lib/validations";
import { requireCsrf } from "@/lib/csrf";

export const runtime = "nodejs";

const RoutineArchiveSchema = z.object({
  archived: z.boolean(),
});

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // CSRF validation for state-changing request
  const csrfError = await requireCsrf(req, session.userId);
  if (csrfError) return csrfError;

  const { id } = await ctx.params;
  const paramsParsed = safeParseWithError(RoutineIdParamSchema, { id });
  if (!paramsParsed.success) return NextResponse.json({ error: paramsParsed.error }, { status: 400 });

  const routineId = paramsParsed.data.id;

  // Validate body
  const rawBody = await req.json().catch(() => ({}));
  const bodyParsed = safeParseWithError(RoutineArchiveSchema, rawBody);
  if (!bodyParsed.success) return NextResponse.json({ error: bodyParsed.error }, { status: 400 });

  const { archived } = bodyParsed.data;

  await initializeDatabase();
  const ok = await setRoutineArchived(session.userId, routineId, archived);
  if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ success: true }, { status: 200 });
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // CSRF validation for state-changing request
  const csrfError = await requireCsrf(req, session.userId);
  if (csrfError) return csrfError;

  const { id } = await ctx.params;
  const paramsParsed = safeParseWithError(RoutineIdParamSchema, { id });
  if (!paramsParsed.success) return NextResponse.json({ error: paramsParsed.error }, { status: 400 });

  const routineId = paramsParsed.data.id;

  await initializeDatabase();
  const ok = await deleteRoutineById(session.userId, routineId);
  if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ success: true }, { status: 200 });
}

