/** Where users land after sign-in when no (valid) return path was requested. */
export const DEFAULT_RETURN_PATH = "/dashboard";

const MAX_RETURN_PATH_LENGTH = 512;

// Only used to resolve relative paths; never appears in the result.
const PLACEHOLDER_ORIGIN = "https://same-site.invalid";

/**
 * Returns `candidate` if it is a same-site path ("/..."), otherwise the default.
 *
 * Rejects anything a browser could resolve to another origin: absolute URLs,
 * scheme-relative "//host", backslash variants ("/\host", "\\host"), other
 * schemes (javascript:), and paths containing whitespace or control characters
 * (including percent-encoded ones) that browsers strip before resolving.
 */
export function toSafeReturnPath(candidate: unknown): string {
  if (typeof candidate !== "string") return DEFAULT_RETURN_PATH;
  if (candidate.length === 0 || candidate.length > MAX_RETURN_PATH_LENGTH) return DEFAULT_RETURN_PATH;
  if (!candidate.startsWith("/") || candidate.startsWith("//")) return DEFAULT_RETURN_PATH;
  if (candidate.includes("\\")) return DEFAULT_RETURN_PATH;
  if (/[\s\u0000-\u001f\u007f]|%(0[0-9a-f]|1[0-9a-f]|20|7f)/i.test(candidate)) return DEFAULT_RETURN_PATH;

  try {
    const resolved = new URL(candidate, PLACEHOLDER_ORIGIN);
    if (resolved.origin !== PLACEHOLDER_ORIGIN) return DEFAULT_RETURN_PATH;
    return `${resolved.pathname}${resolved.search}${resolved.hash}`;
  } catch {
    return DEFAULT_RETURN_PATH;
  }
}
