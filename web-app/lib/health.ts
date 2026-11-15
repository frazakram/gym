import { pool } from "@/lib/db/core";
import { getRedis } from "@/lib/redis";

/**
 * Dependency checks for GET /api/health (uptime monitoring). Results are
 * coarse on purpose: the endpoint is public, so it never returns error text.
 */
export type DependencyStatus = "ok" | "down" | "not_configured";
export type HealthStatus = "ok" | "degraded" | "down";
export type HealthReport = {
  status: HealthStatus;
  checks: { database: DependencyStatus; redis: DependencyStatus };
};

const DATABASE_CHECK_TIMEOUT_MS = 3_000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`health check timed out after ${ms} ms`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

export async function checkDatabase(): Promise<DependencyStatus> {
  try {
    await withTimeout(pool.query("SELECT 1"), DATABASE_CHECK_TIMEOUT_MS);
    return "ok";
  } catch (error) {
    console.error("[health] database check failed:", error);
    return "down";
  }
}

/** Redis is optional: absent is fine, configured but unreachable is degraded. */
export async function checkRedis(): Promise<DependencyStatus> {
  const redis = getRedis();
  if (!redis) return "not_configured";
  try {
    await redis.ping(); // bounded by the client's own timeout (lib/redis.ts)
    return "ok";
  } catch (error) {
    console.error("[health] redis check failed:", error);
    return "down";
  }
}

export async function getHealthReport(): Promise<HealthReport> {
  const [database, redis] = await Promise.all([checkDatabase(), checkRedis()]);
  const status: HealthStatus = database === "down" ? "down" : redis === "down" ? "degraded" : "ok";
  return { status, checks: { database, redis } };
}
