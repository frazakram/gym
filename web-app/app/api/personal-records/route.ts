import { withCors } from "@/lib/corsMiddleware";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getPersonalRecords, initializeDatabase, type PersonalRecord } from "@/lib/db";
import { redisGetJson, redisSetJson } from "@/lib/redis";

export const runtime = "nodejs";

export async function GET() {
  const session = await getSession();
  if (!session) return withCors(NextResponse.json({ error: "Unauthorized" }, { status: 401 }));

  await initializeDatabase();

  // Versioned cache key — bumped whenever a completion is logged.
  const ver = (await redisGetJson<number>(`pr_ver:${session.userId}`)) ?? 0;
  const cacheKey = `pr:${session.userId}:v${ver}`;
  const cached = await redisGetJson<PersonalRecord[]>(cacheKey);
  if (cached) return withCors(NextResponse.json({ records: cached }, { status: 200 }));

  const records = await getPersonalRecords(session.userId);
  await redisSetJson(cacheKey, records, 300);
  return withCors(NextResponse.json({ records }, { status: 200 }));
}
