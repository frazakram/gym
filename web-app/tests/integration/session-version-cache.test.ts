import { afterEach, describe, expect, it, vi } from "vitest";
import { Client } from "pg";
import { createSession } from "@/lib/auth";
import { pool } from "@/lib/db/core";
import { GET as getProfile } from "@/app/api/profile/route";
import { asHandler, call, newUser } from "./helpers";

// getSession remembers a user's session version for 30 s per server instance
// (approved trade-off: a "log out everywhere" done on ANOTHER instance takes up
// to 30 s to reach this one; same-instance logout stays immediate, see
// session-revocation.test.ts).
const profileStatusWith = async (sessionToken: string) =>
  (await call(asHandler(getProfile), { path: "/api/profile", sessionToken })).status;

/** Revokes like another server instance would: in the database only. */
async function revokeElsewhere(userId: number): Promise<void> {
  const db = new Client({ connectionString: process.env.POSTGRES_URL });
  await db.connect();
  await db.query("UPDATE users SET session_version = session_version + 1 WHERE id = $1", [userId]);
  await db.end();
}

const sessionVersionQueries = (spy: { mock: { calls: unknown[][] } }) =>
  spy.mock.calls.filter(([sql]) => String(sql).includes("session_version")).length;

afterEach(() => {
  vi.restoreAllMocks();
});

describe("session version cache", () => {
  it("a repeat request within 30 s does not query the session version again", async () => {
    const { id } = await newUser("svcache");
    const token = await createSession(id, 0);
    const querySpy = vi.spyOn(pool, "query");

    expect(await profileStatusWith(token)).toBe(200);
    expect(await profileStatusWith(token)).toBe(200);
    expect(sessionVersionQueries(querySpy)).toBe(1);
  });

  it("a revocation done on another instance is enforced here within 30 s", async () => {
    const { id } = await newUser("svcache");
    const token = await createSession(id, 0);
    expect(await profileStatusWith(token)).toBe(200);

    await revokeElsewhere(id);
    expect(await profileStatusWith(token)).toBe(200); // the approved window

    const now = Date.now();
    vi.spyOn(Date, "now").mockReturnValue(now + 31_000);
    expect(await profileStatusWith(token)).toBe(401);
  });

  it("never rejects a newer login because of an older remembered version", async () => {
    const { id } = await newUser("svcache");
    expect(await profileStatusWith(await createSession(id, 0))).toBe(200); // remembers 0

    await revokeElsewhere(id); // database is now at 1
    const freshLogin = await createSession(id, 1);
    expect(await profileStatusWith(freshLogin)).toBe(200);
  });
});
