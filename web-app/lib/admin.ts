import { getUser, initializeDatabase } from "@/lib/db";

function parseAdminUserIds(): Set<number> {
  const ids = new Set<number>();
  const raw = (process.env.ADMIN_USER_IDS || process.env.ADMIN_USER_ID || "").trim();
  if (!raw) return ids;
  for (const part of raw.split(",")) {
    const n = Number(part.trim());
    if (Number.isFinite(n) && n > 0) ids.add(Math.floor(n));
  }
  return ids;
}

function parseAdminUsernames(): Set<string> {
  const names = new Set<string>();
  const raw = (process.env.ADMIN_USERNAMES || "").trim();
  if (!raw) return names;
  for (const part of raw.split(",")) {
    const v = part.trim().toLowerCase();
    if (v) names.add(v);
  }
  return names;
}

/**
 * Admin gating (server-side).
 * Configure with:
 * - ADMIN_USER_IDS="1,2,3" (recommended) OR ADMIN_USER_ID="1"
 * - (optional) ADMIN_USERNAMES="admin,harshit"
 */
export async function isAdminUser(userId: number): Promise<boolean> {
  const ids = parseAdminUserIds();
  if (ids.size > 0) return ids.has(userId);

  const names = parseAdminUsernames();
  if (names.size === 0) return false;

  // Fallback to username-based admin
  await initializeDatabase();
  const u = await getUser(userId);
  const username = (u?.username || "").trim().toLowerCase();
  return Boolean(username) && names.has(username);
}

