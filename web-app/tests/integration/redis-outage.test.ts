import { afterEach, describe, expect, it, vi } from "vitest";

// A configured Redis whose every call fails, as with wrong credentials or an
// archived Upstash database (seen in production on 2026-11-15).
vi.mock("@/lib/redis", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/redis")>();
  const failing = () => Promise.reject(new Error("Upstash: unauthorized"));
  const brokenClient = { incr: failing, expire: failing, ttl: failing, get: failing, set: failing, del: failing };
  return { ...original, getRedis: () => brokenClient };
});

import { POST as login } from "@/app/api/auth/login/route";
import { POST as register } from "@/app/api/auth/register/route";
import { POST as analyzeBody } from "@/app/api/body/analyze/route";
import { PASSWORD, asHandler, call, newUser, uniqueName } from "./helpers";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("when Redis is configured but failing", () => {
  it("sign-in still works (rate limiting fails open)", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const unknownUser = await call(asHandler(login), {
      method: "POST",
      path: "/api/auth/login",
      body: { username: uniqueName("ghost"), password: "Wrong@1234" },
      csrf: false,
    });
    expect(unknownUser).toMatchObject({ status: 401, body: { error: "Invalid credentials" } });

    const username = uniqueName("outage");
    const registered = await call(asHandler(register), {
      method: "POST",
      path: "/api/auth/register",
      body: { username, password: PASSWORD },
      csrf: false,
    });
    expect(registered.status).toBe(201);

    const signedIn = await call(asHandler(login), {
      method: "POST",
      path: "/api/auth/login",
      body: { username, password: PASSWORD },
      csrf: false,
    });
    expect(signedIn.status).toBe(200);
  });

  it("paid AI on the server key still fails closed in production", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("OPENAI_API_KEY", "sk-server-test");
    const { id } = await newUser("outage");
    const response = await call(asHandler(analyzeBody), {
      method: "POST",
      path: "/api/body/analyze",
      userId: id,
      body: { images: ["data:image/png;base64,AA=="] },
    });
    expect(response.status).toBe(503);
  });
});
