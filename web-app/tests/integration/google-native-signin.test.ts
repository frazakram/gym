import { afterEach, describe, expect, it, vi } from "vitest";

// The Android app signs in with the native Google account picker and posts the
// resulting ID token here. Only Google's signature check is replaced: a token
// equal to FAKE_GOOGLE_ID_TOKEN verifies as GOOGLE_CLAIMS; session tokens
// still go through the real jose verification.
const FAKE_GOOGLE_ID_TOKEN = "google-id-token-for-tests";
const GOOGLE_CLAIMS = { email: `native.${Date.now()}@example.com`, email_verified: true, name: "Native User", sub: "google-sub-1" };

vi.mock("jose", async (importOriginal) => {
  const jose = await importOriginal<typeof import("jose")>();
  return {
    ...jose,
    jwtVerify: (async (token: unknown, ...rest: unknown[]) =>
      token === FAKE_GOOGLE_ID_TOKEN
        ? { payload: GOOGLE_CLAIMS, protectedHeader: { alg: "RS256" } }
        : (jose.jwtVerify as (...args: unknown[]) => unknown)(token, ...rest)) as typeof jose.jwtVerify,
  };
});

import { POST as nativeGoogleSignIn } from "@/app/api/auth/google/route";
import { GET as getProfile } from "@/app/api/profile/route";
import { asHandler, call } from "./helpers";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("POST /api/auth/google (Android native sign-in)", () => {
  it("returns a session token the rest of the API accepts, in the shape the app expects", async () => {
    vi.stubEnv("GOOGLE_CLIENT_ID", "test-client-id");
    const response = await call(asHandler(nativeGoogleSignIn), {
      method: "POST",
      path: "/api/auth/google",
      body: { idToken: FAKE_GOOGLE_ID_TOKEN },
      csrf: false,
    });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      token: expect.any(String),
      user: { id: expect.any(Number), email: GOOGLE_CLAIMS.email, name: GOOGLE_CLAIMS.name },
      profileComplete: false,
    });

    const body = response.body as { token: string };
    const profile = await call(asHandler(getProfile), { path: "/api/profile", sessionToken: body.token });
    expect(profile.status).toBe(200);
  });

  it("signing in again returns the same account", async () => {
    vi.stubEnv("GOOGLE_CLIENT_ID", "test-client-id");
    const signIn = () =>
      call(asHandler(nativeGoogleSignIn), { method: "POST", path: "/api/auth/google", body: { idToken: FAKE_GOOGLE_ID_TOKEN }, csrf: false });
    const first = (await signIn()).body as { user: { id: number } };
    const second = (await signIn()).body as { user: { id: number } };
    expect(second.user.id).toBe(first.user.id);
  });

  it("rejects a missing or invalid Google token with 401 JSON", async () => {
    vi.stubEnv("GOOGLE_CLIENT_ID", "test-client-id");
    for (const body of [{}, { idToken: "not-a-google-token" }]) {
      const response = await call(asHandler(nativeGoogleSignIn), { method: "POST", path: "/api/auth/google", body, csrf: false });
      expect(response).toMatchObject({ status: 401, body: { error: "Authentication failed" } });
    }
  });
});
