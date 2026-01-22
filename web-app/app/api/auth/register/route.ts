import { NextRequest, NextResponse } from 'next/server';
import { createUser, initializeDatabase } from '@/lib/db';
import { createSession, setSessionCookie } from '@/lib/auth';
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit';
import { RegisterSchema, safeParseWithError } from '@/lib/validations';
import { generateCsrfToken } from '@/lib/csrf';

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

    // Validate input with Zod (includes all password requirements)
    const rawBody = await request.json().catch(() => ({}));
    const parsed = safeParseWithError(RegisterSchema, rawBody);
    
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error },
        { status: 400 }
      );
    }

    const { username, password } = parsed.data;

    // Ensure tables exist before trying to insert
    await initializeDatabase();

    const user = await createUser(username, password);

    if (!user) {
      return NextResponse.json(
        { error: 'Username already exists' },
        { status: 409 }
      );
    }

    // Auto-login the user after successful registration
    const token = await createSession(user.id);
    
    // Generate CSRF token for the newly registered user
    const csrfToken = await generateCsrfToken(user.id);

    const res = NextResponse.json(
      { message: 'User created successfully', userId: user.id, username, csrfToken },
      { status: 201 }
    );

    // Set session cookie on the response
    res.cookies.set('session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    });

    // Set CSRF token cookie
    res.cookies.set('csrf_token', csrfToken, {
      httpOnly: false, // Must be readable by client JS
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60, // 1 hour
      path: '/',
    });

    return res;
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
