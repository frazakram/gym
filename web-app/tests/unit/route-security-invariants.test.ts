import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

// Every state-changing API handler must authenticate the caller and validate
// the double-submit CSRF token. This is checked statically so a new route
// cannot ship without them (the Phase 3 CSRF gaps existed because nothing
// enforced the rule). Exceptions need a reason here.

const API_DIR = path.resolve(import.meta.dirname, "../../app/api");
const MUTATING_METHODS = ["POST", "PUT", "PATCH", "DELETE"] as const;

/** route path (relative to app/api, no "/route.ts") + method -> why the check is not required */
const NO_SESSION_REQUIRED: Record<string, string> = {
  "auth/login POST": "creates the session",
  "auth/register POST": "creates the user and session",
  "auth/logout POST": "clears the cookie even without a valid session (revokes when there is one)",
  "auth/google POST": "Android native sign-in: exchanges a verified Google ID token for a session",
  "billing/webhook POST": "called by Razorpay; authenticated by HMAC signature instead",
};
const NO_CSRF_REQUIRED: Record<string, string> = {
  "auth/login POST": "no session to ride yet; rate limited, SameSite=Lax cookies",
  "auth/register POST": "no session to ride yet; rate limited, SameSite=Lax cookies",
  "auth/logout POST": "forced logout is harmless; SameSite=Lax cookies",
  "auth/google POST": "called by the Android app, not a browser form; requires a Google-signed ID token",
  "billing/webhook POST": "server-to-server call authenticated by HMAC signature",
};

function routeFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) return routeFiles(full);
    return entry === "route.ts" ? [full] : [];
  });
}

/** Source of each exported handler: from its declaration to the next export. */
function exportedHandlers(source: string): Map<string, string> {
  const handlers = new Map<string, string>();
  const declaration = /export\s+(?:async\s+)?function\s+(GET|POST|PUT|PATCH|DELETE|OPTIONS)\s*\(/g;
  const matches = [...source.matchAll(declaration)];
  matches.forEach((match, index) => {
    const end = index + 1 < matches.length ? matches[index + 1].index : source.length;
    handlers.set(match[1], source.slice(match.index, end));
  });
  return handlers;
}

const mutatingHandlers = routeFiles(API_DIR).flatMap((file) => {
  const route = path.relative(API_DIR, path.dirname(file)).split(path.sep).join("/");
  const handlers = exportedHandlers(readFileSync(file, "utf8"));
  return MUTATING_METHODS.filter((method) => handlers.has(method)).map((method) => ({
    id: `${route} ${method}`,
    body: handlers.get(method)!,
  }));
});

describe("API route security invariants", () => {
  it("finds the state-changing handlers", () => {
    expect(mutatingHandlers.length).toBeGreaterThanOrEqual(40);
  });

  it.each(mutatingHandlers.map((h) => [h.id, h.body] as const))("%s checks the session", (id, body) => {
    if (id in NO_SESSION_REQUIRED) return;
    expect(body, `${id} must call getSession()`).toMatch(/\bgetSession\(\)/);
  });

  it.each(mutatingHandlers.map((h) => [h.id, h.body] as const))("%s validates the CSRF token", (id, body) => {
    if (id in NO_CSRF_REQUIRED) return;
    expect(body, `${id} must call requireCsrf(...)`).toMatch(/\brequireCsrf\(/);
  });

  it("has no stale exceptions", () => {
    const ids = new Set(mutatingHandlers.map((h) => h.id));
    const stale = [...Object.keys(NO_SESSION_REQUIRED), ...Object.keys(NO_CSRF_REQUIRED)].filter((id) => !ids.has(id));
    expect(stale).toEqual([]);
  });
});
