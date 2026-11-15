import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { isCurrentSessionVersion } from '@/lib/session-version-cache';

function getSecretKey(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is not defined');
  }
  return new TextEncoder().encode(secret);
}

/**
 * Issues a session token. `sessionVersion` must be the user's current
 * users.session_version (see getSessionVersion); tokens from an older version
 * are rejected by getSession().
 */
export async function createSession(userId: number, sessionVersion: number): Promise<string> {
  const token = await new SignJWT({ userId, sv: sessionVersion })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('7d')
    .sign(getSecretKey());

  return token;
}

export async function getSession(): Promise<{ userId: number } | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('session')?.value;

  if (!token) {
    return null;
  }

  let userId: number;
  let tokenSessionVersion: number;
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    if (typeof payload.userId !== 'number') return null;
    userId = payload.userId;
    // Tokens issued before versioning carry no claim and count as version 0.
    tokenSessionVersion = typeof payload.sv === 'number' ? payload.sv : 0;
  } catch {
    return null;
  }

  // Revocation check. Fails closed: unknown user or database error = no session.
  try {
    if (!(await isCurrentSessionVersion(userId, tokenSessionVersion))) return null;
  } catch (error) {
    console.error('[auth] session version check failed:', error);
    return null;
  }
  return { userId };
}

export async function setSessionCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set('session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    expires: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
    path: '/',
  });
}

export async function deleteSession() {
  const cookieStore = await cookies();
  cookieStore.delete('session');
}
