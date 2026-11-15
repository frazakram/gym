import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { SignJWT, decodeJwt, decodeProtectedHeader } from "jose";
import { generateCsrfToken, requireCsrf, validateCsrfRequest, verifyCsrfToken } from "@/lib/csrf";
import { createSession } from "@/lib/auth";

function req(method: string, path: string, opts: { cookie?: string; header?: string } = {}) {
  const headers = new Headers();
  if (opts.cookie !== undefined) headers.set("cookie", `csrf_token=${opts.cookie}`);
  if (opts.header !== undefined) headers.set("x-csrf-token", opts.header);
  return new NextRequest(`http://localhost${path}`, { method, headers });
}

describe("createSession", () => {
  it("issues an HS256 JWT carrying userId with a 7-day expiry", async () => {
    const before = Math.floor(Date.now() / 1000);
    const token = await createSession(42);
    expect(decodeProtectedHeader(token).alg).toBe("HS256");
    const payload = decodeJwt(token);
    expect(payload.userId).toBe(42);
    expect(payload.exp! - before).toBeGreaterThanOrEqual(7 * 86400 - 5);
    expect(payload.exp! - before).toBeLessThanOrEqual(7 * 86400 + 5);
    // Current behaviour: no iss/aud/iat claims.
    expect(payload.iss).toBeUndefined();
    expect(payload.aud).toBeUndefined();
  });

  it("throws when JWT_SECRET is missing", async () => {
    vi.stubEnv("JWT_SECRET", "");
    await expect(createSession(1)).rejects.toThrow("JWT_SECRET environment variable is not defined");
    vi.unstubAllEnvs();
  });
});

describe("CSRF tokens", () => {
  it("verifies its own tokens, with and without user binding", async () => {
    expect(await verifyCsrfToken(await generateCsrfToken())).toEqual({ valid: true });
    expect(await verifyCsrfToken(await generateCsrfToken(7), 7)).toEqual({ valid: true });
  });

  it("rejects a token bound to another user", async () => {
    expect(await verifyCsrfToken(await generateCsrfToken(7), 8)).toEqual({
      valid: false,
      error: "CSRF token user mismatch",
    });
  });

  it("accepts an unbound token for any user (current behaviour)", async () => {
    expect(await verifyCsrfToken(await generateCsrfToken(), 8)).toEqual({ valid: true });
  });

  it("rejects missing, forged and expired tokens", async () => {
    expect(await verifyCsrfToken("")).toEqual({ valid: false, error: "Missing CSRF token" });
    expect((await verifyCsrfToken("not.a.jwt")).valid).toBe(false);

    const forged = await new SignJWT({ nonce: "x" })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("1h")
      .sign(new TextEncoder().encode("some-other-secret"));
    expect(await verifyCsrfToken(forged)).toEqual({ valid: false, error: "Invalid CSRF token signature" });

    const expired = await new SignJWT({ nonce: "x" })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime(Math.floor(Date.now() / 1000) - 60)
      .sign(new TextEncoder().encode(process.env.JWT_SECRET!));
    expect(await verifyCsrfToken(expired)).toEqual({ valid: false, error: "CSRF token expired" });
  });

  it("generates unique tokens", async () => {
    expect(await generateCsrfToken()).not.toBe(await generateCsrfToken());
  });
});

describe("validateCsrfRequest / requireCsrf (double-submit)", () => {
  it("requires both cookie and header, and that they match", async () => {
    const t = await generateCsrfToken();
    expect(await validateCsrfRequest(req("POST", "/api/x", { header: t }))).toEqual({
      valid: false,
      error: "Missing CSRF cookie",
    });
    expect(await validateCsrfRequest(req("POST", "/api/x", { cookie: t }))).toEqual({
      valid: false,
      error: "Missing CSRF header",
    });
    expect(await validateCsrfRequest(req("POST", "/api/x", { cookie: t, header: t + "x" }))).toEqual({
      valid: false,
      error: "CSRF token mismatch",
    });
    expect(await validateCsrfRequest(req("POST", "/api/x", { cookie: t, header: t }))).toEqual({ valid: true });
  });

  it("skips safe methods and any path containing /webhook", async () => {
    expect(await requireCsrf(req("GET", "/api/x"))).toBeNull();
    expect(await requireCsrf(req("HEAD", "/api/x"))).toBeNull();
    expect(await requireCsrf(req("OPTIONS", "/api/x"))).toBeNull();
    expect(await requireCsrf(req("POST", "/api/billing/webhook"))).toBeNull();
  });

  it("returns a 403 JSON response on failure and null on success", async () => {
    const fail = await requireCsrf(req("POST", "/api/x"));
    expect(fail?.status).toBe(403);
    expect(await fail?.json()).toEqual({ error: "Missing CSRF cookie" });

    const t = await generateCsrfToken(3);
    expect(await requireCsrf(req("DELETE", "/api/x", { cookie: t, header: t }), 3)).toBeNull();
  });
});
