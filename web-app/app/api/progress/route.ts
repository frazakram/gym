import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getCompletedExercisesSince, initializeDatabase } from "@/lib/db";
import { ProgressQuerySchema, safeParseWithError } from "@/lib/validations";
import { buildProgress, progressWindowStart } from "@/lib/progress";

export const runtime = "nodejs";

/** Training minutes per day (week) or per week (month), strength vs cardio, for the Progress chart. */
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await initializeDatabase();

  const params = Object.fromEntries(new URL(req.url).searchParams);
  const parsed = safeParseWithError(ProgressQuerySchema, params);
  if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const now = new Date();
  const rows = await getCompletedExercisesSince(session.userId, progressWindowStart(parsed.data.range, now));
  return NextResponse.json(buildProgress(rows, { range: parsed.data.range, now }), { status: 200 });
}
