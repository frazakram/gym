import { withCors } from "@/lib/corsMiddleware";
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { initializeDatabase } from "@/lib/db";
import { lookupBarcode } from "@/lib/nutrition/openfoodfacts";
import { rateLimit } from "@/lib/rate-limit";
import { redisGetJson, redisSetJson } from "@/lib/redis";
import { BarcodeSchema, safeParseWithError } from "@/lib/validations";
import type { FoodSearchResult } from "@/types";

export const runtime = "nodejs";

/**
 * GET /api/nutrition/barcode?barcode=... — Open Food Facts barcode lookup.
 * Returns `{ found: false }` (200) when the product isn't in OFF, so the client
 * can fall back to manual search. Rate-limited per user (OFF ~15 reads/min/IP).
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return withCors(NextResponse.json({ error: "Unauthorized" }, { status: 401 }));

    await initializeDatabase();

    const { searchParams } = new URL(request.url);
    const parsed = safeParseWithError(BarcodeSchema, { barcode: searchParams.get("barcode") ?? "" });
    if (!parsed.success) return withCors(NextResponse.json({ error: parsed.error }, { status: 400 }));

    const { barcode } = parsed.data;

    const rl = await rateLimit({ key: `nutri:barcode:${session.userId}`, limit: 12, windowSeconds: 60 });
    if (!rl.allowed) {
      return withCors(
        NextResponse.json({ error: "Too many lookups, slow down" }, { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds) } })
      );
    }

    const cacheKey = `nutri:barcode:${barcode}`;
    const cached = await redisGetJson<FoodSearchResult | { __miss: true }>(cacheKey);
    if (cached) {
      if ("__miss" in cached) return withCors(NextResponse.json({ found: false }));
      return withCors(NextResponse.json({ found: true, result: cached, cached: true }));
    }

    const result = await lookupBarcode(barcode);
    if (!result) {
      await redisSetJson(cacheKey, { __miss: true }, 600).catch(() => {});
      return withCors(NextResponse.json({ found: false }));
    }

    await redisSetJson(cacheKey, result, 86400).catch(() => {});
    return withCors(NextResponse.json({ found: true, result }));
  } catch (error) {
    console.error("barcode lookup failed:", error);
    return withCors(NextResponse.json({ error: "Lookup failed" }, { status: 500 }));
  }
}
