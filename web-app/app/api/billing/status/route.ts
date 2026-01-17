import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getPremiumStatus, initializeDatabase } from "@/lib/db";
import { redisGetJson, redisSetJson } from "@/lib/redis";

export const runtime = "nodejs";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const cacheKey = `billing_status:${session.userId}`;
  const cached = await redisGetJson<unknown>(cacheKey);
  if (cached) {
    return NextResponse.json(cached, { status: 200 });
  }

  await initializeDatabase();
  const status = await getPremiumStatus(session.userId);
  // Short TTL keeps UI snappy and reduces DB load, while staying fresh for upgrades/webhooks.
  await redisSetJson(cacheKey, status, 60);
  return NextResponse.json(status, { status: 200 });
}

