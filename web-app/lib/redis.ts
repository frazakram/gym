import { Redis } from "@upstash/redis";

let _redis: Redis | null | undefined;

function getRedisEnv(): { url: string; token: string } | null {
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim() || "";
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim() || "";
  if (!url || !token) return null;
  return { url, token };
}

export function getRedis(): Redis | null {
  if (_redis !== undefined) return _redis;
  const env = getRedisEnv();
  if (!env) {
    _redis = null;
    return _redis;
  }
  _redis = new Redis({ url: env.url, token: env.token });
  return _redis;
}

export async function redisGetJson<T>(key: string): Promise<T | null> {
  const r = getRedis();
  if (!r) return null;
  const v = await r.get<T>(key);
  return v ?? null;
}

export async function redisSetJson(key: string, value: unknown, ttlSeconds: number): Promise<void> {
  const r = getRedis();
  if (!r) return;
  const ttl = Number(ttlSeconds);
  if (!Number.isFinite(ttl) || ttl <= 0) return;
  await r.set(key, value as any, { ex: Math.floor(ttl) });
}

export async function redisDel(key: string): Promise<void> {
  const r = getRedis();
  if (!r) return;
  await r.del(key);
}

