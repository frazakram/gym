export type UntrustedTextOptions = {
  /**
   * Max number of characters to keep after normalization.
   * Prevents prompt bloat / abuse.
   */
  maxChars?: number;
};

/**
 * Treat user-provided text as untrusted:
 * - normalize/trim
 * - strip zero-width chars
 * - limit length
 */
export function sanitizeUntrustedText(raw: unknown, opts: UntrustedTextOptions = {}): string {
  const maxChars = Number.isFinite(opts.maxChars) ? Math.max(0, Number(opts.maxChars)) : 1200;
  const s = String(raw ?? "")
    .normalize("NFKC")
    .replace(/[\u200B-\u200D\uFEFF]/g, "") // zero-width chars
    .replace(/\u0000/g, "") // null bytes
    .trim();

  if (s.length <= maxChars) return s;
  return s.slice(0, maxChars).trimEnd();
}

/**
 * Escape text so it can't break out of XML-like delimiters in prompts.
 */
export function escapeForPrompt(raw: string): string {
  return raw
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Wrap untrusted text in a clearly delimited, escaped block.
 */
export function wrapUntrustedBlock(label: string, raw: unknown, opts: UntrustedTextOptions = {}): string {
  const cleaned = sanitizeUntrustedText(raw, opts);
  const escaped = escapeForPrompt(cleaned);
  return `<${label}>\n${escaped}\n</${label}>`;
}

