import { Redis } from "@upstash/redis";
import { createHash } from "crypto";

/**
 * Redis client supporting both:
 * 1. Upstash REST API (UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN)
 * 2. Redis Cloud / Standard Redis (REDIS_URL connection string)
 */

let _redis: Redis | null | undefined;

function getUpstashEnv(): { url: string; token: string } | null {
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim() || "";
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim() || "";
  if (!url || !token) return null;
  return { url, token };
}

export function getRedis(): Redis | null {
  if (_redis !== undefined) return _redis;
  
  // Try Upstash REST API first
  const upstashEnv = getUpstashEnv();
  if (upstashEnv) {
    _redis = new Redis({ url: upstashEnv.url, token: upstashEnv.token });
    return _redis;
  }
  
  // No Redis configured
  _redis = null;
  return _redis;
}

export async function redisGetJson<T>(key: string): Promise<T | null> {
  const r = getRedis();
  if (!r) return null;
  try {
    const v = await r.get<T>(key);
    return v ?? null;
  } catch (error) {
    console.error("Redis GET error:", error);
    return null;
  }
}

export async function redisSetJson(key: string, value: unknown, ttlSeconds: number): Promise<void> {
  const r = getRedis();
  if (!r) return;
  const ttl = Number(ttlSeconds);
  if (!Number.isFinite(ttl) || ttl <= 0) return;
  try {
    await r.set(key, value as any, { ex: Math.floor(ttl) });
  } catch (error) {
    console.error("Redis SET error:", error);
  }
}

export async function redisDel(key: string): Promise<void> {
  const r = getRedis();
  if (!r) return;
  try {
    await r.del(key);
  } catch (error) {
    console.error("Redis DEL error:", error);
  }
}

export async function redisIncr(key: string): Promise<number | null> {
  const r = getRedis();
  if (!r) return null;
  try {
    const v = await r.incr(key);
    return typeof v === "number" ? v : Number(v);
  } catch (error) {
    console.error("Redis INCR error:", error);
    return null;
  }
}

// ============= AI RESPONSE CACHING =============

/**
 * Cache TTLs for different AI responses
 */
export const AI_CACHE_TTL = {
  routine: 60 * 60 * 24, // 24 hours
  diet: 60 * 60 * 24,    // 24 hours
  notes: 60 * 60,        // 1 hour
};

/**
 * Generate a hash key for caching based on input parameters
 */
export function hashCacheKey(prefix: string, data: Record<string, unknown>): string {
  // Sort keys for consistent hashing
  const sortedData = Object.keys(data)
    .sort()
    .reduce((acc, key) => {
      const value = data[key];
      // Skip undefined/null values and API keys
      if (value !== undefined && value !== null && !key.toLowerCase().includes("key")) {
        acc[key] = value;
      }
      return acc;
    }, {} as Record<string, unknown>);

  const hash = createHash("sha256")
    .update(JSON.stringify(sortedData))
    .digest("hex")
    .slice(0, 16); // Use first 16 chars for shorter keys

  return `${prefix}:${hash}`;
}

/**
 * Get cached AI response
 */
export async function getCachedAIResponse<T>(
  cacheKey: string
): Promise<{ hit: true; data: T } | { hit: false }> {
  const cached = await redisGetJson<T>(cacheKey);
  if (cached !== null) {
    console.log(`[Cache HIT] ${cacheKey}`);
    return { hit: true, data: cached };
  }
  console.log(`[Cache MISS] ${cacheKey}`);
  return { hit: false };
}

/**
 * Set cached AI response
 */
export async function setCachedAIResponse<T>(
  cacheKey: string,
  data: T,
  ttlSeconds: number
): Promise<void> {
  await redisSetJson(cacheKey, data, ttlSeconds);
  console.log(`[Cache SET] ${cacheKey} (TTL: ${ttlSeconds}s)`);
}

/**
 * Invalidate cache for a specific pattern/user
 */
export async function invalidateUserCache(userId: number, prefix: string): Promise<void> {
  // For simple invalidation, we use a version key
  const versionKey = `cache_ver:${prefix}:${userId}`;
  await redisIncr(versionKey);
}

/**
 * Get versioned cache key (invalidates when user profile changes)
 */
export async function getVersionedCacheKey(
  userId: number,
  prefix: string,
  data: Record<string, unknown>
): Promise<string> {
  const versionKey = `cache_ver:${prefix}:${userId}`;
  const version = (await redisGetJson<number>(versionKey)) ?? 0;
  const baseKey = hashCacheKey(prefix, { ...data, userId, version });
  return baseKey;
}

