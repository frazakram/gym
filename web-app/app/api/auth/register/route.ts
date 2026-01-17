import { NextRequest, NextResponse } from 'next/server';
import { createUser, initializeDatabase } from '@/lib/db';
import { createSession, setSessionCookie } from '@/lib/auth';
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit';

function getClientIp(request: NextRequest): string {
  const xff = request.headers.get('x-forwarded-for');
  if (xff && xff.trim()) return xff.split(',')[0].trim();
  const xrip = request.headers.get('x-real-ip');
  if (xrip && xrip.trim()) return xrip.trim();
  return 'unknown';
}

export async function POST(request: NextRequest) {
  try {
    // Per-IP rate limit (no-op if Redis not configured)
    {
      const ip = getClientIp(request);
      const rl = await rateLimit({
        key: `rl:auth_register:minute:${ip}`,
        limit: RATE_LIMITS.authPerMinuteByIp(),
        windowSeconds: 60,
      });
      if (!rl.allowed) {
        return NextResponse.json(
          { error: `Too many registrations. Try again in ${rl.retryAfterSeconds}s.` },
          { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds) } }
        );
      }
    }

    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username and password are required' },
        { status: 400 }
      );
    }

    // Password Validation
    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters long' },
        { status: 400 }
      );
    }
    if (!/[A-Z]/.test(password)) {
      return NextResponse.json(
        { error: 'Password must contain at least one uppercase letter' },
        { status: 400 }
      );
    }
    if (!/[0-9]/.test(password)) {
      return NextResponse.json(
        { error: 'Password must contain at least one number' },
        { status: 400 }
      );
    }
    // Special characters: !@#$%^&*()_+-=[]{}|;':",./<>? and others
    if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) {
      return NextResponse.json(
        { error: 'Password must contain at least one special character' },
        { status: 400 }
      );
    }

    // Ensure tables exist before trying to insert
    await initializeDatabase();

    const user = await createUser(username, password);

    if (!user) {
      return NextResponse.json(
        { error: 'Username already exists' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { message: 'User created successfully', userId: user.id },
      { status: 201 }
    );
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
