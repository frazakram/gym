import { withCors } from "@/lib/corsMiddleware";
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { initializeDatabase, saveUserGym } from "@/lib/db";
import { GymSaveSchema, safeParseWithError } from "@/lib/validations";
import { requireCsrf } from "@/lib/csrf";
import { getRedis } from "@/lib/redis";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return withCors(NextResponse.json({ error: "Unauthorized" }, { status: 401 }));
    }

    const csrfError = await requireCsrf(request, session.userId);
    if (csrfError) return csrfError;

    await initializeDatabase();

    const rawBody = await request.json().catch(() => ({}));
    const parsed = safeParseWithError(GymSaveSchema, rawBody);
    if (!parsed.success) {
      return withCors(NextResponse.json({ error: parsed.error }, { status: 400 }));
    }

    await saveUserGym(session.userId, parsed.data);

    // Invalidate Redis caches
    try {
      const r = getRedis();
      if (r) {
        await Promise.all([
          r.del(`gym:${session.userId}`),
          r.del(`routine:${session.userId}`),
          r.del(`profile:${session.userId}`),
        ]);
      }
    } catch {
      // ignore cache bust failures
    }

    return withCors(NextResponse.json({ success: true }));
  } catch (error) {
    console.error("POST /api/gym/save error:", error);
    return withCors(NextResponse.json({ error: "Internal server error" }, { status: 500 }));
  }
}
