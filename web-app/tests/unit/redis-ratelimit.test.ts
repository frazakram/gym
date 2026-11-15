import { describe, expect, it, vi } from "vitest";
import { getRedis, hashCacheKey, redisGetJson, redisSetJson } from "@/lib/redis";
import { RATE_LIMITS, rateLimit } from "@/lib/rate-limit";

describe("redis helpers without Upstash configured", () => {
  it("has no client and degrades to no-ops", async () => {
    expect(getRedis()).toBeNull();
    expect(await redisGetJson("k")).toBeNull();
    await expect(redisSetJson("k", { a: 1 }, 60)).resolves.toBeUndefined();
  });
});

describe("hashCacheKey", () => {
  it("is stable regardless of key order", () => {
    expect(hashCacheKey("routine", { a: 1, b: 2 })).toBe(hashCacheKey("routine", { b: 2, a: 1 }));
  });

  it("ignores null/undefined values and any field whose name contains 'key'", () => {
    const base = hashCacheKey("p", { goal: "x" });
    expect(hashCacheKey("p", { goal: "x", extra: undefined, other: null })).toBe(base);
    expect(hashCacheKey("p", { goal: "x", apiKey: "sk-123", api_key: "sk-456" })).toBe(base);
  });

  it("formats as prefix:16-hex-chars", () => {
    expect(hashCacheKey("diet", { a: 1 })).toMatch(/^diet:[0-9a-f]{16}$/);
    expect(hashCacheKey("diet", { a: 1 })).not.toBe(hashCacheKey("diet", { a: 2 }));
  });
});

describe("rateLimit", () => {
  it("allows everything when Redis is not configured (fails open)", async () => {
    const r = await rateLimit({ key: "rl:test", limit: 1, windowSeconds: 60 });
    expect(r).toEqual({ allowed: true, limit: 1, remaining: 1, retryAfterSeconds: 0 });
  });

  it("clamps limit and window to at least 1", async () => {
    const r = await rateLimit({ key: "rl:test", limit: 0, windowSeconds: 0 });
    expect(r.limit).toBe(1);
  });

  it("reads limits from env with sane fallbacks", () => {
    expect(RATE_LIMITS.routinePerHour()).toBe(6);
    vi.stubEnv("RATE_LIMIT_ROUTINE_PER_HOUR", "20");
    expect(RATE_LIMITS.routinePerHour()).toBe(20);
    vi.stubEnv("RATE_LIMIT_ROUTINE_PER_HOUR", "-3");
    expect(RATE_LIMITS.routinePerHour()).toBe(6);
    vi.stubEnv("RATE_LIMIT_ROUTINE_PER_HOUR", "abc");
    expect(RATE_LIMITS.routinePerHour()).toBe(6);
    vi.unstubAllEnvs();
    expect(RATE_LIMITS.authPerMinuteByIp()).toBe(10);
  });
});
