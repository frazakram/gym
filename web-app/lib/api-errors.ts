import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { formatZodError } from "@/lib/validations";

export const INTERNAL_ERROR_MESSAGE = "Internal server error";

/**
 * An error whose message is written for end users and is safe to return in an
 * API response. Throw this deliberately; every other error is treated as
 * internal and its message never leaves the server.
 */
export class UserFacingError extends Error {
  readonly status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "UserFacingError";
    this.status = status;
  }
}

/**
 * Converts a caught error into a JSON error response.
 * - UserFacingError: its message and status.
 * - ZodError (invalid input): 400 with the formatted issues.
 * - Anything else: logged with full detail server-side; the client gets a
 *   generic 500 so internals (config names, SQL, provider responses) don't leak.
 */
export function toErrorResponse(error: unknown, logContext: string): NextResponse {
  if (error instanceof UserFacingError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  if (error instanceof ZodError) {
    return NextResponse.json({ error: formatZodError(error) }, { status: 400 });
  }
  console.error(`[${logContext}]`, error);
  return NextResponse.json({ error: INTERNAL_ERROR_MESSAGE }, { status: 500 });
}
