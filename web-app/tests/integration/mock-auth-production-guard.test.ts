import { afterEach, describe, expect, it, vi } from "vitest";
import { POST as login } from "@/app/api/auth/login/route";
import { asHandler, call, newUser, uniqueName } from "./helpers";

afterEach(() => {
  vi.unstubAllEnvs();
});

function attemptLogin(username: string, password: string) {
  return call(asHandler(login), {
    method: "POST",
    path: "/api/auth/login",
    body: { username, password },
    csrf: false,
  });
}

describe("ALLOW_MOCK_AUTH can never weaken login in production", () => {
  it("rejects a wrong password even if ALLOW_MOCK_AUTH=true leaks into production", async () => {
    const { username } = await newUser("mockguard");
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("ALLOW_MOCK_AUTH", "true");

    const wrongPassword = await attemptLogin(username, "Wrong@1234");
    expect(wrongPassword).toMatchObject({ status: 401, body: { error: "Invalid credentials" } });

    const unknownUser = await attemptLogin(uniqueName("ghost"), "Wrong@1234");
    expect(unknownUser).toMatchObject({ status: 401, body: { error: "Invalid credentials" } });
  });

  it("still allows mock login outside production when explicitly enabled (local dev)", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("ALLOW_MOCK_AUTH", "true");

    const response = await attemptLogin(uniqueName("ghost"), "Wrong@1234");
    expect(response.status).toBe(200);
    expect(response.body.userId).toBe(999);
  });
});
