import { NextRequest } from "next/server";
import { createSession } from "@/lib/auth";
import { generateCsrfToken } from "@/lib/csrf";
import { POST as register } from "@/app/api/auth/register/route";
import { cookieJar } from "./jar";

type Handler = (req: NextRequest, ctx: { params: Promise<Record<string, string>> }) => Promise<Response>;

export type CallOptions = {
  method?: string;
  path?: string;
  body?: unknown;
  rawBody?: string;
  headers?: Record<string, string>;
  /** Authenticate as this user (session cookie). Omit for anonymous. */
  userId?: number;
  /** Attach a valid double-submit CSRF token (default: true for non-GET). */
  csrf?: boolean;
  params?: Record<string, string>;
};

// Response JSON is asserted loosely in tests, so allow property access without casts.
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- test-only convenience
type Json = any;
export type CallResult = { status: number; body: Json; res: Response };

export async function call(handler: Handler, opts: CallOptions = {}): Promise<CallResult> {
  const method = (opts.method ?? "GET").toUpperCase();
  const headers = new Headers(opts.headers);
  const cookies: string[] = [];

  cookieJar.clear();
  if (opts.userId !== undefined) {
    const token = await createSession(opts.userId);
    cookieJar.set("session", token);
    cookies.push(`session=${token}`);
  }

  const wantsCsrf = opts.csrf ?? !["GET", "HEAD", "OPTIONS"].includes(method);
  if (wantsCsrf) {
    const t = await generateCsrfToken(opts.userId);
    cookies.push(`csrf_token=${t}`);
    headers.set("x-csrf-token", t);
  }
  if (cookies.length) headers.set("cookie", cookies.join("; "));

  let body: string | undefined = opts.rawBody;
  if (body === undefined && opts.body !== undefined) {
    body = JSON.stringify(opts.body);
    headers.set("content-type", "application/json");
  }

  const req = new NextRequest(`http://localhost${opts.path ?? "/api/test"}`, { method, headers, body });
  const res = await handler(req, { params: Promise.resolve(opts.params ?? {}) });
  const text = await res.text();
  let parsed: unknown = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = text;
  }
  return { status: res.status, body: parsed, res };
}

let seq = 0;
export function uniqueName(prefix = "user"): string {
  seq += 1;
  return `${prefix}_${Date.now().toString(36)}_${seq}`;
}

export const PASSWORD = "Test@1234";

/** Registers a user through the real route and returns its id. */
export async function newUser(prefix = "user"): Promise<{ id: number; username: string }> {
  const username = uniqueName(prefix);
  const r = await call(register as unknown as Handler, {
    method: "POST",
    path: "/api/auth/register",
    body: { username, password: PASSWORD },
    csrf: false,
  });
  if (r.status !== 201) throw new Error(`register failed: ${r.status} ${JSON.stringify(r.body)}`);
  return { id: r.body.userId, username };
}

export function asHandler(fn: unknown): Handler {
  return fn as Handler;
}
