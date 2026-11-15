/**
 * Time limits for calls this server makes to other services.
 *
 * Without a limit, a provider that accepts the connection and never answers
 * holds the user's request (and the serverless function) until the platform
 * kills it, minutes later, with a generic error. Every outbound call passes
 * one of these as `signal: outboundTimeout(kind)`.
 */
export const OUTBOUND_TIMEOUT_MS = {
  /** AI completion the user is waiting for; under the 60 s function limit. */
  aiCompletion: 55_000,
  /** OAuth token exchange during sign-in. */
  oauthToken: 10_000,
  /** Best-effort lookups (YouTube verification, reverse geocoding); the feature works without them. */
  lookup: 5_000,
} as const;

export type OutboundCallKind = keyof typeof OUTBOUND_TIMEOUT_MS;

export function outboundTimeout(kind: OutboundCallKind): AbortSignal {
  return AbortSignal.timeout(OUTBOUND_TIMEOUT_MS[kind]);
}
