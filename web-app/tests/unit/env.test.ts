import { describe, expect, it } from "vitest";
import { checkServerEnv } from "@/lib/env";

const VALID_PRODUCTION = {
  NODE_ENV: "production",
  JWT_SECRET: "a".repeat(48),
  POSTGRES_URL: "postgres://user:pass@db.example.com/app",
  DB_ENCRYPTION_KEY: "0123456789abcdef".repeat(4),
  UPSTASH_REDIS_REST_URL: "https://redis.example.com",
  UPSTASH_REDIS_REST_TOKEN: "token",
};

describe("checkServerEnv", () => {
  it("accepts a complete production configuration", () => {
    expect(checkServerEnv(VALID_PRODUCTION)).toEqual({ errors: [], warnings: [] });
  });

  it("errors when JWT_SECRET is missing (no session can be issued or verified)", () => {
    const { errors } = checkServerEnv({ ...VALID_PRODUCTION, JWT_SECRET: "" });
    expect(errors).toEqual([expect.stringContaining("JWT_SECRET")]);
  });

  it("errors when no Postgres URL is configured, under any supported name", () => {
    const { errors } = checkServerEnv({ ...VALID_PRODUCTION, POSTGRES_URL: undefined });
    expect(errors).toEqual([expect.stringContaining("database")]);
    expect(checkServerEnv({ ...VALID_PRODUCTION, POSTGRES_URL: undefined, DATABASE_URL: "postgresql://x:y@h/db" }).errors).toEqual([]);
    expect(checkServerEnv({ ...VALID_PRODUCTION, POSTGRES_URL: "mysql://x" }).errors).toEqual([expect.stringContaining("database")]);
  });

  it("does not require a database outside production when mock auth is explicitly enabled", () => {
    const { errors } = checkServerEnv({ NODE_ENV: "development", JWT_SECRET: "dev", ALLOW_MOCK_AUTH: "true" });
    expect(errors).toEqual([]);
  });

  it("errors on a malformed DB_ENCRYPTION_KEY (encryption would throw on use)", () => {
    for (const bad of ["abc", "z".repeat(64), "0123456789abcdef".repeat(4) + "00"]) {
      expect(checkServerEnv({ ...VALID_PRODUCTION, DB_ENCRYPTION_KEY: bad }).errors).toEqual([
        expect.stringContaining("DB_ENCRYPTION_KEY"),
      ]);
    }
  });

  it("warns, but does not fail, on risky production settings", () => {
    const { errors, warnings } = checkServerEnv({
      ...VALID_PRODUCTION,
      UPSTASH_REDIS_REST_URL: "",
      PREMIUM: "true",
      ALLOW_MOCK_AUTH: "true",
      DATABASE_DRIVER: "PG",
      RAZORPAY_KEY_ID: "rzp_live_x",
      SMTP_HOST: "smtp.example.com",
    });
    expect(errors).toEqual([]);
    for (const topic of ["UPSTASH", "PREMIUM", "ALLOW_MOCK_AUTH", "DATABASE_DRIVER", "RAZORPAY", "SMTP"]) {
      expect(warnings.some((w) => w.includes(topic)), `warning about ${topic}`).toBe(true);
    }
  });

  it("does not warn about production-only settings in development", () => {
    const { warnings } = checkServerEnv({ NODE_ENV: "development", JWT_SECRET: "dev", POSTGRES_URL: "postgres://u:p@localhost/db" });
    expect(warnings).toEqual([]);
  });
});
