import { describe, expect, it } from "vitest";
import { Client } from "pg";
import { POST as register } from "@/app/api/auth/register/route";
import { POST as login } from "@/app/api/auth/login/route";
import { POST as logout } from "@/app/api/auth/logout/route";
import { GET as csrf } from "@/app/api/csrf/route";
import { GET as profileGet } from "@/app/api/profile/route";
import { PASSWORD, asHandler, call, newUser, uniqueName } from "./helpers";

const auth = (h: unknown, body: unknown, path: string) =>
  call(asHandler(h), { method: "POST", path, body, csrf: false });

function setCookie(res: Response, name: string): string | undefined {
  return res.headers.getSetCookie().find((c) => c.startsWith(`${name}=`));
}

describe("POST /api/auth/register", () => {
  it("creates the user, returns 201 and sets session + csrf cookies", async () => {
    const username = uniqueName("reg");
    const r = await auth(register, { username, password: PASSWORD }, "/api/auth/register");
    expect(r.status).toBe(201);
    expect(r.body).toMatchObject({ message: "User created successfully", username });
    expect(typeof r.body.userId).toBe("number");
    expect(typeof r.body.csrfToken).toBe("string");

    const session = setCookie(r.res, "session")!;
    expect(session).toMatch(/HttpOnly/i);
    expect(session).toMatch(/SameSite=lax/i);
    expect(session).toMatch(/Max-Age=604800/);
    expect(setCookie(r.res, "csrf_token")).toMatch(/SameSite=strict/i);
    expect(setCookie(r.res, "csrf_token")).not.toMatch(/HttpOnly/i);
  });

  it("stores a bcrypt hash, never the plaintext password", async () => {
    const { id } = await newUser("hash");
    const db = new Client({ connectionString: process.env.POSTGRES_URL });
    await db.connect();
    const { rows } = await db.query("SELECT password_hash FROM users WHERE id = $1", [id]);
    await db.end();
    expect(rows[0].password_hash).toMatch(/^\$2[aby]\$10\$/);
  });

  it("returns 409 for a duplicate username", async () => {
    const { username } = await newUser("dup");
    const r = await auth(register, { username, password: PASSWORD }, "/api/auth/register");
    expect(r).toMatchObject({ status: 409, body: { error: "Username already exists" } });
  });

  it("returns 400 with Zod messages for invalid input", async () => {
    const r = await auth(register, { username: "ab", password: "weak" }, "/api/auth/register");
    expect(r.status).toBe(400);
    expect(r.body.error).toContain("username: Username must be at least 3 characters");
    expect(r.body.error).toContain("password:");
  });

  it("treats a non-JSON body as empty input (400)", async () => {
    const r = await call(asHandler(register), {
      method: "POST",
      path: "/api/auth/register",
      rawBody: "not json",
      csrf: false,
    });
    expect(r.status).toBe(400);
  });
});

describe("POST /api/auth/login", () => {
  it("logs in with the right password", async () => {
    const { id, username } = await newUser("login");
    const r = await auth(login, { username, password: PASSWORD }, "/api/auth/login");
    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({ message: "Login successful", userId: id, username });
    expect(setCookie(r.res, "session")).toBeDefined();
  });

  it("returns the same 401 for a wrong password and an unknown user", async () => {
    const { username } = await newUser("login");
    const wrong = await auth(login, { username, password: "Wrong@1234" }, "/api/auth/login");
    const unknown = await auth(login, { username: uniqueName("ghost"), password: PASSWORD }, "/api/auth/login");
    expect(wrong).toMatchObject({ status: 401, body: { error: "Invalid credentials" } });
    expect(unknown).toMatchObject({ status: 401, body: { error: "Invalid credentials" } });
  });

  it("returns 400 for malformed input", async () => {
    const r = await auth(login, { username: "a b", password: "x" }, "/api/auth/login");
    expect(r.status).toBe(400);
  });
});

describe("POST /api/auth/logout and GET /api/csrf", () => {
  it("logout expires the session cookie without requiring auth or CSRF", async () => {
    const r = await call(asHandler(logout), { method: "POST", path: "/api/auth/logout", csrf: false });
    expect(r.status).toBe(200);
    expect(setCookie(r.res, "session")).toMatch(/Max-Age=0/);
  });

  it("csrf endpoint issues a readable strict cookie for anonymous users", async () => {
    const r = await call(asHandler(csrf), { path: "/api/csrf" });
    expect(r.status).toBe(200);
    expect(typeof r.body.token).toBe("string");
    expect(setCookie(r.res, "csrf_token")).toMatch(/SameSite=strict/i);
  });
});

describe("session enforcement", () => {
  it("rejects requests without a session and accepts a valid one", async () => {
    expect((await call(asHandler(profileGet), { path: "/api/profile" })).status).toBe(401);
    const { id } = await newUser("sess");
    expect((await call(asHandler(profileGet), { path: "/api/profile", userId: id })).status).toBe(200);
  });
});
