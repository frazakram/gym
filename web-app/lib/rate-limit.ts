import { getRedis } from "@/lib/redis";

export type RateLimitResult = {
  allowed: boolean;
  limit: number;
  remaining: number;
  retryAfterSeconds: number;
};

function intFromEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  const n = raw ? Number(raw) : NaN;
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

/**
 * Fixed-window rate limit using Redis INCR + EXPIRE.
 * - If Redis is not configured, it allows all requests (no-op).
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

  const count = await redis.incr(params.key);
  if (count === 1) {
    await redis.expire(params.key, windowSeconds);
  }

  const allowed = count <= limit;
  const remaining = Math.max(0, limit - count);
  const ttl = await redis.ttl(params.key);
  const retryAfterSeconds = allowed ? 0 : Math.max(1, Number(ttl) || windowSeconds);

  return { allowed, limit, remaining, retryAfterSeconds };
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

