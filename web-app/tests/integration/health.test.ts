import { afterEach, describe, expect, it, vi } from "vitest";
import { GET as health } from "@/app/api/health/route";
import { pool } from "@/lib/db/core";
import { asHandler, call } from "./helpers";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("GET /api/health", () => {
  it("reports ok when the database answers (Redis not configured is not a failure)", async () => {
    const response = await call(asHandler(health), { path: "/api/health" });
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ status: "ok", checks: { database: "ok", redis: "not_configured" } });
  });

  it("reports degraded, still 200, and answers fast when Redis is configured but unreachable", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://unreachable-redis.invalid");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "test-token");
    vi.resetModules();
    const { GET: freshHealth } = await import("@/app/api/health/route");

    const started = performance.now();
    const response = await call(asHandler(freshHealth), { path: "/api/health" });
    expect(performance.now() - started).toBeLessThan(2000);
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ status: "degraded", checks: { database: "ok", redis: "down" } });
  });

  it("answers 503 when the database is down, without leaking the error", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(pool, "query").mockRejectedValue(new Error("connect ECONNREFUSED 10.0.0.5:5432 password=secret"));
    const response = await call(asHandler(health), { path: "/api/health" });
    expect(response.status).toBe(503);
    expect(response.body).toMatchObject({ status: "down", checks: { database: "down" } });
    expect(JSON.stringify(response.body)).not.toMatch(/ECONNREFUSED|secret|10\.0\.0\.5/);
  });
});
