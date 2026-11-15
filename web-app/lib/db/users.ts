// Users, credentials and session versions.
import bcrypt from 'bcryptjs';
import { User } from '@/types';
import { encryptDet, decrypt } from '@/lib/fieldEncryption';
import { MOCK_USER, MOCK_USER_ID, allowMockAuth, initializeDatabase, pool } from './core';

/**
 * Current session version of a user, or null if the user does not exist.
 * Runs initializeDatabase() first: getSession() can be the first database call
 * on a new instance, and the column must exist before it is read.
 */
export async function getSessionVersion(userId: number): Promise<number | null> {
  if (allowMockAuth() && userId === MOCK_USER_ID) return 0;
  await initializeDatabase();
  const result = await pool.query<{ session_version: number }>(
    'SELECT session_version FROM users WHERE id = $1',
    [userId]
  );
  const row = result.rows[0];
  return row ? Number(row.session_version) : null;
}

/** Invalidates every outstanding session of the user (used on logout). */
export async function revokeAllSessions(userId: number): Promise<void> {
  if (allowMockAuth() && userId === MOCK_USER_ID) return;
  await initializeDatabase();
  await pool.query('UPDATE users SET session_version = session_version + 1 WHERE id = $1', [userId]);
}

export async function createUser(username: string, password: string): Promise<User | null> {
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const encUsername = encryptDet(username);
    const result = await pool.query<User>(
      `INSERT INTO users (username, password_hash)
       VALUES ($1, $2)
       RETURNING id, username, password_hash, created_at`,
      [encUsername, hashedPassword]
    );
    const row = result.rows[0];
    if (row) row.username = username; // return plaintext to caller
    return row || null;
  } catch (error: unknown) {
    const maybePgError = error as { code?: string } | null;
    if (maybePgError?.code === '23505') return null; // Username exists
    if (allowMockAuth()) {
      console.warn("createUser DB failed, using mock auth:", error);
      return { ...MOCK_USER, username };
    }
    console.error("createUser DB failed:", error);
    throw new Error("Database unavailable. Registration is disabled until DB is configured.");
  }
}

export async function authenticateUser(username: string, password: string): Promise<number | null> {
  try {
    const encUsername = encryptDet(username);
    let result = await pool.query<User>(
      'SELECT id, password_hash FROM users WHERE username = $1',
      [encUsername]
    );

    // Fallback for legacy plaintext rows — migrate them to encrypted on success
    if (result.rows.length === 0) {
      result = await pool.query<User>(
        'SELECT id, password_hash FROM users WHERE username = $1',
        [username]
      );
      if (result.rows.length > 0) {
        await pool.query('UPDATE users SET username = $1 WHERE id = $2', [encUsername, result.rows[0].id]).catch(() => {});
      }
    }

    if (result.rows.length === 0) {
      if (allowMockAuth()) {
        console.warn(`Mock Auth: User '${username}' not found, logging in as mock user`);
        return MOCK_USER_ID;
      }
      return null;
    }

    const user = result.rows[0];
    const isValid = await bcrypt.compare(password, user.password_hash);

    if (!isValid && allowMockAuth()) {
      console.warn(`Mock Auth: Invalid password for '${username}', logging in as mock user`);
      return MOCK_USER_ID;
    }

    return isValid ? user.id : null;
  } catch (error) {
    if (allowMockAuth()) {
      console.warn("authenticateUser DB failed, using mock auth:", error);
      // Mock auth is explicitly enabled for local development
      return MOCK_USER_ID;
    }
    console.error("authenticateUser DB failed:", error);
    return null;
  }
}

export async function getUserIdByUsername(username: string): Promise<number | null> {
  try {
    const encUsername = encryptDet(username);
    const result = await pool.query<User>('SELECT id FROM users WHERE username = $1', [encUsername]);

    // Fallback for legacy plaintext rows — migrate on success
    if (!result.rows[0]) {
      const ptResult = await pool.query<User>('SELECT id FROM users WHERE username = $1', [username]);
      if (ptResult.rows[0]) {
        await pool.query('UPDATE users SET username = $1 WHERE id = $2', [encUsername, ptResult.rows[0].id]).catch(() => {});
      }
      return ptResult.rows?.[0]?.id ?? null;
    }

    return result.rows[0].id;
  } catch (error) {
    if (allowMockAuth()) {
      console.warn("getUserIdByUsername DB failed, using mock auth:", error);
      return MOCK_USER_ID;
    }
    console.error("getUserIdByUsername DB failed:", error);
    return null;
  }
}

export async function getUser(userId: number): Promise<Pick<User, 'id' | 'username'> | null> {
  try {
    const result = await pool.query<User>(
      'SELECT id, username FROM users WHERE id = $1',
      [userId]
    );
    const row = result.rows[0] || null;
    if (row) row.username = decrypt(row.username);
    return row;
  } catch (error) {
    if (allowMockAuth()) {
      if (userId === MOCK_USER_ID) return { id: MOCK_USER_ID, username: MOCK_USER.username };
      return null;
    }
    console.error("getUser DB failed:", error);
    return null;
  }
}

export async function createUserWithRandomPassword(username: string): Promise<User | null> {
  const random = `${Date.now()}-${Math.random().toString(16).slice(2)}-${Math.random().toString(16).slice(2)}`;
  return await createUser(username, random);
}
