import { withCors } from "@/lib/corsMiddleware";
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { initializeDatabase } from "@/lib/db";
import { searchFoods } from "@/lib/nutrition/openfoodfacts";
import { rateLimit } from "@/lib/rate-limit";
import { redisGetJson, redisSetJson } from "@/lib/redis";
import { FoodSearchQuerySchema, safeParseWithError } from "@/lib/validations";
import type { FoodSearchResult } from "@/types";

export const runtime = "nodejs";

/**
 * GET /api/nutrition/search?q=...&page_size=... — Open Food Facts text search.
 * Rate-limited per user (OFF allows ~10 search req/min/IP); results cached
 * briefly in Redis (when available) to cut duplicate as-you-type calls.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return withCors(NextResponse.json({ error: "Unauthorized" }, { status: 401 }));

    await initializeDatabase();

    const { searchParams } = new URL(request.url);
    const parsed = safeParseWithError(FoodSearchQuerySchema, {
      q: searchParams.get("q") ?? "",
      page_size: searchParams.get("page_size") ?? undefined,
    });
    if (!parsed.success) return withCors(NextResponse.json({ error: parsed.error }, { status: 400 }));

    const { q, page_size } = parsed.data;

    // Stay within OFF's per-IP budget: cap per user well under 10/min.
    const rl = await rateLimit({ key: `nutri:search:${session.userId}`, limit: 8, windowSeconds: 60 });
    if (!rl.allowed) {
      return withCors(
        NextResponse.json({ error: "Too many searches, slow down" }, { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds) } })
      );
    }

    const cacheKey = `nutri:search:q:${q.toLowerCase()}:${page_size}`;
    const cached = await redisGetJson<FoodSearchResult[]>(cacheKey);
    if (cached) return withCors(NextResponse.json({ results: cached, cached: true }));

    const results = await searchFoods(q, page_size);
    await redisSetJson(cacheKey, results, 300).catch(() => {});

    return withCors(NextResponse.json({ results }));
  } catch (error) {
    console.error("nutrition search failed:", error);
    return withCors(NextResponse.json({ error: "Search failed" }, { status: 500 }));
  }
}
