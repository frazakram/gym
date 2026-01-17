import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getPremiumStatus, getUserAnalytics, initializeDatabase } from "@/lib/db";
import { redisGetJson, redisSetJson } from "@/lib/redis";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const daysRaw = searchParams.get("days");
  const days = Math.max(7, Math.min(365, Number(daysRaw ?? 90) || 90));

  const cacheKey = `analytics:${session.userId}:${days}`;
  const cached = await redisGetJson<unknown>(cacheKey);
  if (cached) return NextResponse.json(cached, { status: 200 });

  await initializeDatabase();

  const premium = await getPremiumStatus(session.userId);
  if (!premium.access) {
    return NextResponse.json({ error: "Analytics is a premium feature." }, { status: 403 });
  }

  const payload = await getUserAnalytics(session.userId, { rangeDays: days });
  // Short TTL is enough; analytics is derived from completions and can change frequently.
  await redisSetJson(cacheKey, payload, 60);
  return NextResponse.json(payload, { status: 200 });
}

