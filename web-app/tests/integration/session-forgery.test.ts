import { describe, expect, it } from "vitest";
import { SignJWT, UnsecuredJWT } from "jose";
import { GET as getProfile } from "@/app/api/profile/route";
import { createSession } from "@/lib/auth";
import { getSessionVersion } from "@/lib/db";
import { asHandler, call, newUser } from "./helpers";

const SERVER_SECRET = () => new TextEncoder().encode(process.env.JWT_SECRET!);

function requestProfileWithSession(sessionToken: string) {
  return call(asHandler(getProfile), { path: "/api/profile", sessionToken });
}

describe("session cookie verification", () => {
  it("accepts a genuine session (control)", async () => {
    const { id } = await newUser("sess");
    const response = await requestProfileWithSession(await createSession(id, (await getSessionVersion(id)) ?? 0));
    expect(response.status).toBe(200);
  });

  it("rejects a token signed with a different secret", async () => {
    const { id } = await newUser("sess");
    const forged = await new SignJWT({ userId: id })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("7d")
      .sign(new TextEncoder().encode("attacker-chosen-secret"));
    expect((await requestProfileWithSession(forged)).status).toBe(401);
  });

  it("rejects an unsigned alg:none token", async () => {
    const { id } = await newUser("sess");
    const unsigned = new UnsecuredJWT({ userId: id }).setExpirationTime("7d").encode();
    expect((await requestProfileWithSession(unsigned)).status).toBe(401);
  });

  it("rejects an expired token", async () => {
    const { id } = await newUser("sess");
    const expired = await new SignJWT({ userId: id })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime(Math.floor(Date.now() / 1000) - 60)
      .sign(SERVER_SECRET());
    expect((await requestProfileWithSession(expired)).status).toBe(401);
  });

  it("rejects a genuine token whose payload was edited to another user", async () => {
    const victim = await newUser("victim");
    const attacker = await newUser("attacker");
    const [header, , signature] = (await createSession(attacker.id, 0)).split(".");
    const editedPayload = Buffer.from(
      JSON.stringify({ userId: victim.id, exp: Math.floor(Date.now() / 1000) + 3600 }),
    ).toString("base64url");
    expect((await requestProfileWithSession(`${header}.${editedPayload}.${signature}`)).status).toBe(401);
  });
});
