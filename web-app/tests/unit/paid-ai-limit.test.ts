import { beforeEach, describe, expect, it, vi } from "vitest";

// In-memory stand-in for the Upstash client: INCR / EXPIRE / TTL semantics.
const fakeRedis = vi.hoisted(() => {
  const counts = new Map<string, number>();
  const ttls = new Map<string, number>();
  const state = { configured: true, failing: false };
  const fakeClient = {
    incr: async (key: string) => {
      if (state.failing) throw new Error("redis down");
      const count = (counts.get(key) ?? 0) + 1;
      counts.set(key, count);
      return count;
    },
    expire: async (key: string, seconds: number) => {
      ttls.set(key, seconds);
      return 1;
    },
    ttl: async (key: string) => ttls.get(key) ?? -1,
  };
  return {
    state,
    reset() {
      counts.clear();
      ttls.clear();
      state.configured = true;
      state.failing = false;
    },
    getRedis: () => (state.configured ? fakeClient : null),
  };
});

vi.mock("@/lib/redis", () => ({ getRedis: fakeRedis.getRedis }));

import { checkPaidAiLimit } from "@/lib/rate-limit";

beforeEach(() => {
  fakeRedis.reset();
  vi.unstubAllEnvs();
});

describe("checkPaidAiLimit", () => {
  it("allows up to the per-minute limit, then blocks with 429 and a retry hint", async () => {
    vi.stubEnv("RATE_LIMIT_BODY_ANALYZE_PER_MINUTE", "2");
    vi.stubEnv("RATE_LIMIT_BODY_ANALYZE_PER_HOUR", "100");
    expect(await checkPaidAiLimit("body_analyze", 1)).toEqual({ ok: true });
    expect(await checkPaidAiLimit("body_analyze", 1)).toEqual({ ok: true });
    const blockedDecision = await checkPaidAiLimit("body_analyze", 1);
    expect(blockedDecision).toMatchObject({ ok: false, status: 429 });
    expect(blockedDecision.ok === false && blockedDecision.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("enforces the hourly limit independently of the minute window", async () => {
    vi.stubEnv("RATE_LIMIT_GYM_ANALYZE_PER_MINUTE", "100");
    vi.stubEnv("RATE_LIMIT_GYM_ANALYZE_PER_HOUR", "3");
    for (let attempt = 1; attempt <= 3; attempt++) {
      expect((await checkPaidAiLimit("gym_analyze", 1)).ok).toBe(true);
    }
    expect(await checkPaidAiLimit("gym_analyze", 1)).toMatchObject({ ok: false, status: 429 });
  });

  it("counts per user and per feature", async () => {
    vi.stubEnv("RATE_LIMIT_BODY_ANALYZE_PER_MINUTE", "1");
    expect((await checkPaidAiLimit("body_analyze", 1)).ok).toBe(true);
    expect((await checkPaidAiLimit("body_analyze", 1)).ok).toBe(false);
    expect((await checkPaidAiLimit("body_analyze", 2)).ok).toBe(true);
    expect((await checkPaidAiLimit("gym_analyze", 1)).ok).toBe(true);
  });

  it("has conservative defaults when no env override is set", async () => {
    // Default: 2 per minute for photo analysis.
    expect((await checkPaidAiLimit("body_analyze", 7)).ok).toBe(true);
    expect((await checkPaidAiLimit("body_analyze", 7)).ok).toBe(true);
    expect((await checkPaidAiLimit("body_analyze", 7)).ok).toBe(false);
  });

  describe("when Redis is unavailable", () => {
    it("fails closed (503) in production when Redis is not configured", async () => {
      fakeRedis.state.configured = false;
      vi.stubEnv("NODE_ENV", "production");
      expect(await checkPaidAiLimit("body_analyze", 1)).toMatchObject({ ok: false, status: 503 });
    });

    it("fails closed (503) in production when Redis errors", async () => {
      fakeRedis.state.failing = true;
      vi.stubEnv("NODE_ENV", "production");
      expect(await checkPaidAiLimit("coach_note", 1)).toMatchObject({ ok: false, status: 503 });
    });

    it("stays open outside production so local dev works without Redis", async () => {
      fakeRedis.state.configured = false;
      vi.stubEnv("NODE_ENV", "development");
      expect(await checkPaidAiLimit("body_analyze", 1)).toEqual({ ok: true });
      fakeRedis.state.configured = true;
      fakeRedis.state.failing = true;
      expect(await checkPaidAiLimit("body_analyze", 1)).toEqual({ ok: true });
    });
  });
});
