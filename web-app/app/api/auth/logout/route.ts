import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { revokeAllSessions } from '@/lib/db';
import { forgetSessionVersion } from '@/lib/session-version-cache';

export async function POST() {
  let response: NextResponse;
  try {
    // Server-side revocation: the token stops working everywhere, not just in
    // this browser (a copied or stolen token would otherwise stay valid for 7 days).
    const session = await getSession();
    if (session) {
      await revokeAllSessions(session.userId);
      forgetSessionVersion(session.userId); // enforce at once on this instance
    }
    response = NextResponse.json({ message: 'Logged out successfully' }, { status: 200 });
  } catch (error) {
    console.error('Logout error:', error);
    response = NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }

  // Always clear the cookie, even if revocation failed.
  // IMPORTANT: In Route Handlers, clear cookies on the response.
  response.cookies.set('session', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  });
  return response;
}
