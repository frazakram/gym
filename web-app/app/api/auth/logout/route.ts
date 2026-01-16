import { NextResponse } from 'next/server';

export async function POST() {
  try {
    const res = NextResponse.json({ message: 'Logged out successfully' }, { status: 200 });
    // IMPORTANT: In Route Handlers, clear cookies on the response.
    res.cookies.set('session', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
      path: '/',
    });
    return res;
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
