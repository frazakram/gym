import { afterEach, describe, expect, it, vi } from "vitest";
import { GET as startGoogleLogin } from "@/app/api/auth/google/start/route";
import { asHandler, call } from "./helpers";

afterEach(() => {
  vi.unstubAllEnvs();
});

function returnToCookie(response: Response): string | undefined {
  const header = response.headers.getSetCookie().find((cookie) => cookie.startsWith("google_oauth_return_to="));
  return header ? decodeURIComponent(header.split(";")[0].split("=")[1]) : undefined;
}

describe("GET /api/auth/google/start returnTo handling (open redirect)", () => {
  it("never stores an off-site returnTo for the post-login redirect", async () => {
    vi.stubEnv("GOOGLE_CLIENT_ID", "test-client-id");
    vi.stubEnv("GOOGLE_CLIENT_SECRET", "test-client-secret");

    const response = await call(asHandler(startGoogleLogin), {
      path: "/api/auth/google/start?returnTo=" + encodeURIComponent("https://evil.example/phish"),
    });

    expect(response.status).toBe(307);
    expect(response.res.headers.get("location")).toMatch(/^https:\/\/accounts\.google\.com\//);
    expect(returnToCookie(response.res)).toBe("/dashboard");
  });

  it("keeps a same-site returnTo", async () => {
    vi.stubEnv("GOOGLE_CLIENT_ID", "test-client-id");
    vi.stubEnv("GOOGLE_CLIENT_SECRET", "test-client-secret");

    const response = await call(asHandler(startGoogleLogin), {
      path: "/api/auth/google/start?returnTo=" + encodeURIComponent("/coach/portal"),
    });

    expect(returnToCookie(response.res)).toBe("/coach/portal");
  });
});
