import { afterEach, describe, expect, it, vi } from "vitest";
import { GET as billingStatus } from "@/app/api/billing/status/route";
import { asHandler, call, newUser } from "./helpers";

// Production on 2026-11-16: Upstash configured but unreachable. Each cache call
// retried 5 times with exponential backoff, so /api/billing/status (cache read
// + cache write) took ~9 s and held up the whole dashboard.
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("an unreachable Redis does not slow requests down", () => {
  it("billing status still answers correctly within 1.5 s", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    // Before anything calls getRedis(): it memoizes the client on first use.
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://unreachable-redis.invalid");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "test-token");
    const { id } = await newUser("slowredis");

    const started = performance.now();
    const response = await call(asHandler(billingStatus), { path: "/api/billing/status", userId: id });
    const elapsedMs = performance.now() - started;

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ premium: false, access: true });
    expect(elapsedMs).toBeLessThan(1500);
  }, 30_000);
});
