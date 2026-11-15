import { getSessionVersion } from '@/lib/db';

/**
 * Per-instance memory of each user's users.session_version, so getSession()
 * does not query the database on every request.
 *
 * Trade-off (approved by the owner, 2026-11-16): a "log out everywhere" done
 * on another server instance reaches this one within SESSION_VERSION_TTL_MS.
 * Logout on this instance is immediate (forgetSessionVersion).
 *
 * Only an exact match is answered from memory. Any mismatch re-reads the
 * database, so a newer login is never rejected because this instance
 * remembers an older version.
 */
export const SESSION_VERSION_TTL_MS = 30_000;
const MAX_REMEMBERED_USERS = 10_000;

type RememberedVersion = { version: number; expiresAt: number };
const rememberedVersions = new Map<number, RememberedVersion>();

function remember(userId: number, version: number): void {
  rememberedVersions.delete(userId); // re-insert so Map order tracks recency
  if (rememberedVersions.size >= MAX_REMEMBERED_USERS) {
    const oldest = rememberedVersions.keys().next().value;
    if (oldest !== undefined) rememberedVersions.delete(oldest);
  }
  rememberedVersions.set(userId, { version, expiresAt: Date.now() + SESSION_VERSION_TTL_MS });
}

/**
 * True when `tokenVersion` is the user's current session version. Throws if
 * the database cannot be read (callers fail closed).
 */
export async function isCurrentSessionVersion(userId: number, tokenVersion: number): Promise<boolean> {
  const remembered = rememberedVersions.get(userId);
  if (remembered && remembered.expiresAt > Date.now() && remembered.version === tokenVersion) return true;

  const currentVersion = await getSessionVersion(userId);
  if (currentVersion === null) {
    rememberedVersions.delete(userId);
    return false;
  }
  remember(userId, currentVersion);
  return currentVersion === tokenVersion;
}

/** Call after revoking a user's sessions so this instance enforces it at once. */
export function forgetSessionVersion(userId: number): void {
  rememberedVersions.delete(userId);
}
