import { NextResponse } from "next/server";
import { getRedis } from "@/lib/redis";

export type RateLimitResult = {
  allowed: boolean;
  limit: number;
  remaining: number;
  retryAfterSeconds: number;
  /** True when Redis was configured but failed: the request was allowed without counting. */
  degraded?: boolean;
};

function intFromEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  const n = raw ? Number(raw) : NaN;
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

/**
 * Fixed-window rate limit using Redis INCR + EXPIRE.
 * - If Redis is not configured, it allows all requests (no-op).
 * - If Redis fails (bad credentials, archived database, network), it logs and
 *   allows the request with `degraded: true` instead of throwing: rate limiting
 *   is defence in depth and must not take sign-in or other features down.
 *   Callers that must fail closed (checkPaidAiLimit) check `degraded`.
 */
export async function rateLimit(params: {
  key: string;
  limit: number;
  windowSeconds: number;
}): Promise<RateLimitResult> {
  const redis = getRedis();
  const limit = Math.max(1, Math.floor(params.limit));
  const windowSeconds = Math.max(1, Math.floor(params.windowSeconds));

  if (!redis) {
    return { allowed: true, limit, remaining: limit, retryAfterSeconds: 0 };
  }

  try {
    const count = await redis.incr(params.key);
    if (count === 1) {
      await redis.expire(params.key, windowSeconds);
    }

    const allowed = count <= limit;
    const remaining = Math.max(0, limit - count);
    const ttl = await redis.ttl(params.key);
    const retryAfterSeconds = allowed ? 0 : Math.max(1, Number(ttl) || windowSeconds);

    return { allowed, limit, remaining, retryAfterSeconds };
  } catch (error) {
    console.error(`[rate-limit] Redis unavailable; allowing ${params.key} without counting:`, error);
    return { allowed: true, limit, remaining: limit, retryAfterSeconds: 0, degraded: true };
  }
}

// ============= PAID AI COST GUARD =============

/** AI features that spend the server's own provider key. */
export type PaidAiFeature = "body_analyze" | "gym_analyze" | "coach_note";

export type PaidAiLimitDecision =
  | { ok: true }
  | { ok: false; status: 429 | 503; error: string; retryAfterSeconds: number };

const PAID_AI_DEFAULT_LIMITS: Record<PaidAiFeature, { perMinute: number; perHour: number }> = {
  body_analyze: { perMinute: 2, perHour: 10 },
  gym_analyze: { perMinute: 2, perHour: 10 },
  coach_note: { perMinute: 5, perHour: 30 },
};

const LIMITER_UNAVAILABLE_DECISION: PaidAiLimitDecision = {
  ok: false,
  status: 503,
  error: "This AI feature is temporarily unavailable. Please try again shortly.",
  retryAfterSeconds: 60,
};

/**
 * Per-user minute + hour limits for AI calls paid with the server key.
 *
 * Unlike rateLimit(), this fails CLOSED in production: if Redis is missing or
 * erroring we refuse rather than allow unbounded spend. Outside production it
 * fails open so local development works without Redis.
 */
export async function checkPaidAiLimit(feature: PaidAiFeature, userId: number): Promise<PaidAiLimitDecision> {
  const isProduction = process.env.NODE_ENV === "production";
  const envPrefix = `RATE_LIMIT_${feature.toUpperCase()}`;
  const defaultLimits = PAID_AI_DEFAULT_LIMITS[feature];
  const rateWindows = [
    { name: "minute", seconds: 60, limit: intFromEnv(`${envPrefix}_PER_MINUTE`, defaultLimits.perMinute) },
    { name: "hour", seconds: 3600, limit: intFromEnv(`${envPrefix}_PER_HOUR`, defaultLimits.perHour) },
  ];

  if (!getRedis()) {
    if (isProduction) {
      console.error(`[paid-ai-limit] Redis not configured; refusing ${feature} in production`);
      return LIMITER_UNAVAILABLE_DECISION;
    }
    return { ok: true };
  }

  try {
    for (const rateWindow of rateWindows) {
      const windowResult = await rateLimit({
        key: `rl:ai:${feature}:${rateWindow.name}:${userId}`,
        limit: rateWindow.limit,
        windowSeconds: rateWindow.seconds,
      });
      if (windowResult.degraded) {
        if (isProduction) {
          console.error(`[paid-ai-limit] Redis error; refusing ${feature} in production`);
          return LIMITER_UNAVAILABLE_DECISION;
        }
        return { ok: true };
      }
      if (!windowResult.allowed) {
        return {
          ok: false,
          status: 429,
          error: `Too many requests. Try again in ${windowResult.retryAfterSeconds}s.`,
          retryAfterSeconds: windowResult.retryAfterSeconds,
        };
      }
    }
    return { ok: true };
  } catch (error) {
    if (isProduction) {
      console.error(`[paid-ai-limit] Redis error; refusing ${feature} in production:`, error);
      return LIMITER_UNAVAILABLE_DECISION;
    }
    console.warn(`[paid-ai-limit] Redis error; allowing ${feature} outside production:`, error);
    return { ok: true };
  }
}

/** HTTP response for a refused paid-AI request (429 rate limited, 503 limiter unavailable). */
export function paidAiLimitResponse(decision: Extract<PaidAiLimitDecision, { ok: false }>): NextResponse {
  return NextResponse.json(
    { error: decision.error },
    { status: decision.status, headers: { "Retry-After": String(decision.retryAfterSeconds) } },
  );
}

export const RATE_LIMITS = {
  routinePerHour: () => intFromEnv("RATE_LIMIT_ROUTINE_PER_HOUR", 6),
  routinePerMinute: () => intFromEnv("RATE_LIMIT_ROUTINE_PER_MINUTE", 2),
  dietPerHour: () => intFromEnv("RATE_LIMIT_DIET_PER_HOUR", 6),
  dietPerMinute: () => intFromEnv("RATE_LIMIT_DIET_PER_MINUTE", 2),
  notesPerHour: () => intFromEnv("RATE_LIMIT_NOTES_PER_HOUR", 30),
  notesPerMinute: () => intFromEnv("RATE_LIMIT_NOTES_PER_MINUTE", 10),

  authPerMinuteByIp: () => intFromEnv("RATE_LIMIT_AUTH_PER_MINUTE_PER_IP", 10),

  // Coach booking (Premium/Trial). Defaults are conservative to prevent spam.
  coachBookPerDay: () => intFromEnv("RATE_LIMIT_COACH_BOOK_PER_DAY", 3),
  coachBookPerMinute: () => intFromEnv("RATE_LIMIT_COACH_BOOK_PER_MINUTE", 1),
};

