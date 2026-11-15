import { describe, expect, it } from "vitest";
import { SignJWT } from "jose";
import { POST as login } from "@/app/api/auth/login/route";
import { POST as logout } from "@/app/api/auth/logout/route";
import { GET as getProfile } from "@/app/api/profile/route";
import { PASSWORD, asHandler, call, newUser } from "./helpers";

async function loginAndGetSessionToken(username: string): Promise<string> {
  const response = await call(asHandler(login), {
    method: "POST",
    path: "/api/auth/login",
    body: { username, password: PASSWORD },
    csrf: false,
  });
  expect(response.status).toBe(200);
  const cookie = response.res.headers.getSetCookie().find((header) => header.startsWith("session="))!;
  return cookie.split(";")[0].slice("session=".length);
}

const profileStatusWith = async (sessionToken: string) =>
  (await call(asHandler(getProfile), { path: "/api/profile", sessionToken })).status;

const logoutWith = (sessionToken: string) =>
  call(asHandler(logout), { method: "POST", path: "/api/auth/logout", sessionToken, csrf: false });

describe("session revocation", () => {
  it("rejects a session token after the user logs out", async () => {
    const { username } = await newUser("revoke");
    const token = await loginAndGetSessionToken(username);
    expect(await profileStatusWith(token)).toBe(200);

    expect((await logoutWith(token)).status).toBe(200);

    expect(await profileStatusWith(token)).toBe(401);
  });

  it("logging out ends the user's sessions on other devices too", async () => {
    const { username } = await newUser("revoke");
    const phone = await loginAndGetSessionToken(username);
    const laptop = await loginAndGetSessionToken(username);

    await logoutWith(laptop);

    expect(await profileStatusWith(phone)).toBe(401);
  });

  it("signing in again after logout gives a working session", async () => {
    const { username } = await newUser("revoke");
    await logoutWith(await loginAndGetSessionToken(username));

    const fresh = await loginAndGetSessionToken(username);
    expect(await profileStatusWith(fresh)).toBe(200);
  });

  it("keeps tokens issued before versioning (no version claim) valid until the next logout", async () => {
    const { id } = await newUser("legacy");
    const legacyToken = await new SignJWT({ userId: id })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("7d")
      .sign(new TextEncoder().encode(process.env.JWT_SECRET!));

    expect(await profileStatusWith(legacyToken)).toBe(200);
    await logoutWith(legacyToken);
    expect(await profileStatusWith(legacyToken)).toBe(401);
  });
});
