import { NextRequest, NextResponse } from 'next/server';
import { authenticateUser, initializeDatabase } from '@/lib/db';
import { createSession, setSessionCookie } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username and password are required' },
        { status: 400 }
      );
    }

    // Ensure tables exist before trying to read
    await initializeDatabase();

    const userId = await authenticateUser(username, password);

    if (!userId) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    const token = await createSession(userId);
    await setSessionCookie(token);

    return NextResponse.json(
      { message: 'Login successful', userId, username },
      { status: 200 }
    );
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
