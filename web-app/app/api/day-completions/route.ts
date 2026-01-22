import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getDayCompletions, initializeDatabase, toggleDayCompletion } from "@/lib/db";
import { redisIncr } from "@/lib/redis";
import { DayCompletionSchema, safeParseWithError } from "@/lib/validations";
import { requireCsrf } from "@/lib/csrf";
import { z } from "zod";

export const runtime = "nodejs";

const RoutineIdQuerySchema = z.object({
  routineId: z.coerce.number().int().positive(),
});

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const parsed = safeParseWithError(RoutineIdQuerySchema, { routineId: searchParams.get("routineId") });
  
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const { routineId } = parsed.data;

  await initializeDatabase();
  const days = await getDayCompletions(session.userId, routineId);
  return NextResponse.json({ days }, { status: 200 });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // CSRF validation for state-changing request
  const csrfError = await requireCsrf(req, session.userId);
  if (csrfError) return csrfError;

  // Validate input with Zod
  const rawBody = await req.json().catch(() => ({}));
  const parsed = safeParseWithError(DayCompletionSchema, rawBody);
  
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const { routineId, dayIndex, completed } = parsed.data;

  await initializeDatabase();
  const ok = await toggleDayCompletion(session.userId, routineId, dayIndex, completed);
  if (!ok) {
    return NextResponse.json({ error: "Failed to update rest-day completion" }, { status: 403 });
  }

  // Invalidate derived analytics cache for ALL `days=` values (best-effort).
  await redisIncr(`analytics_ver:${session.userId}`);

  return NextResponse.json({ success: true }, { status: 200 });
}

