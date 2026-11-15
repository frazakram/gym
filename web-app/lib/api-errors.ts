import { NextResponse } from "next/server";
import { APIConnectionTimeoutError } from "openai";
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

  constructor(message: string, status = 400, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "UserFacingError";
    this.status = status;
  }
}

export type PublicError = { status: number; message: string };

/**
 * The safe, client-visible form of any caught error.
 * - UserFacingError: its own message and status.
 * - ZodError (invalid input): 400 with the formatted issues.
 * - Anything else: a generic 500. Callers must log the original error.
 */
export function toPublicError(error: unknown): PublicError {
  if (error instanceof UserFacingError) return { status: error.status, message: error.message };
  if (error instanceof ZodError) return { status: 400, message: formatZodError(error) };
  return { status: 500, message: INTERNAL_ERROR_MESSAGE };
}

/**
 * Converts a caught error into a JSON error response (see toPublicError).
 * Server errors (5xx) are logged with full detail, including any cause.
 */
export function toErrorResponse(error: unknown, logContext: string): NextResponse {
  const publicError = toPublicError(error);
  if (publicError.status >= 500) console.error(`[${logContext}]`, error);
  return NextResponse.json({ error: publicError.message }, { status: publicError.status });
}

// ============= AI PROVIDER ERRORS =============

const AI_PROVIDER_MESSAGES: Record<number, PublicError> = {
  401: { status: 502, message: "The AI provider rejected the API key. Check the key in AI Settings." },
  403: { status: 502, message: "The AI provider rejected the API key. Check the key in AI Settings." },
  404: {
    status: 502,
    message: "The selected AI model is not available for this API key. Choose another model in AI Settings.",
  },
  429: { status: 429, message: "The AI provider is rate limiting requests. Please try again in a minute." },
};

/**
 * Use only around calls to an AI provider. Errors carrying a provider HTTP
 * status (OpenAI/Anthropic SDKs via LangChain, or our own fetch wrappers) that
 * the user can act on become UserFacingErrors with fixed messages; the raw
 * provider error is kept as `cause` for server logs. Other errors pass through.
 */
export const AI_PROVIDER_TIMEOUT_MESSAGE = "The AI provider took too long to respond. Please try again.";

/**
 * True for a call cut off by its time limit: fetch with
 * `signal: outboundTimeout(...)` rejects with a "TimeoutError" DOMException,
 * the OpenAI SDK (its `timeout` option) with APIConnectionTimeoutError.
 */
export function isOutboundTimeout(error: unknown): boolean {
  if (error instanceof APIConnectionTimeoutError) return true;
  return error instanceof DOMException && error.name === "TimeoutError";
}

export function asAiProviderError(error: unknown): unknown {
  if (error instanceof UserFacingError || typeof error !== "object" || error === null) return error;
  if (isOutboundTimeout(error)) return new UserFacingError(AI_PROVIDER_TIMEOUT_MESSAGE, 504, { cause: error });
  const status = (error as { status?: unknown }).status;
  const mapped = typeof status === "number" ? AI_PROVIDER_MESSAGES[status] : undefined;
  return mapped ? new UserFacingError(mapped.message, mapped.status, { cause: error }) : error;
}
