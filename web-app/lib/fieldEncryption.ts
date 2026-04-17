import crypto from 'crypto';

// DB_ENCRYPTION_KEY must be a 64-character hex string (32 bytes).
// Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
// If not set, all functions are passthrough — safe for gradual rollout.

const PREFIX = 'enc:';

function getKey(): Buffer | null {
  const hex = process.env.DB_ENCRYPTION_KEY;
  if (!hex) return null;
  if (hex.length !== 64) throw new Error('DB_ENCRYPTION_KEY must be a 64-char hex string (32 bytes)');
  return Buffer.from(hex, 'hex');
}

export function isEncrypted(value: string): boolean {
  return value.startsWith(PREFIX);
}

/**
 * Deterministic encryption: same plaintext always produces the same ciphertext.
 * Required for fields used in WHERE clause equality lookups (e.g. username/email).
 * IV is derived from HMAC-SHA256(key, plaintext) — still authenticated/tamper-proof.
 */
export function encryptDet(plain: string): string {
  const key = getKey();
  if (!key) return plain;
  const iv = crypto.createHmac('sha256', key).update(plain).digest().slice(0, 12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const ct = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${PREFIX}${iv.toString('hex')}:${ct.toString('hex')}:${tag.toString('hex')}`;
}

/**
 * Random-IV encryption: more secure, for fields not used in WHERE clauses (e.g. name).
 */
export function encryptRnd(plain: string): string {
  const key = getKey();
  if (!key) return plain;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const ct = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${PREFIX}${iv.toString('hex')}:${ct.toString('hex')}:${tag.toString('hex')}`;
}

/**
 * Decrypt a field. Returns the original value unchanged if it is not encrypted
 * (plaintext legacy rows) or if DB_ENCRYPTION_KEY is not configured.
 */
export function decrypt(value: string | null | undefined): string {
  if (!value || !value.startsWith(PREFIX)) return value ?? '';
  const key = getKey();
  if (!key) return value; // key not set, return raw
  const parts = value.slice(PREFIX.length).split(':');
  if (parts.length !== 3) return value; // malformed, safety passthrough
  const [ivHex, ctHex, tagHex] = parts;
  try {
    const iv = Buffer.from(ivHex, 'hex');
    const ct = Buffer.from(ctHex, 'hex');
    const tag = Buffer.from(tagHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);
    return decipher.update(ct).toString('utf8') + decipher.final('utf8');
  } catch {
    return value; // tampered or wrong key — return raw rather than crash
  }
}
