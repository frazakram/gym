import { NextRequest, NextResponse } from 'next/server';
import { authenticateUser, initializeDatabase } from '@/lib/db';
import { createSession } from '@/lib/auth';
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit';
import { LoginSchema, safeParseWithError } from '@/lib/validations';
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
        key: `rl:auth_login:minute:${ip}`,
        limit: RATE_LIMITS.authPerMinuteByIp(),
        windowSeconds: 60,
      });
      if (!rl.allowed) {
        return NextResponse.json(
          { error: `Too many login attempts. Try again in ${rl.retryAfterSeconds}s.` },
          { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds) } }
        );
      }
    }

    // Validate input with Zod
    const rawBody = await request.json().catch(() => ({}));
    const parsed = safeParseWithError(LoginSchema, rawBody);
    
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error },
        { status: 400 }
      );
    }

    const { username, password } = parsed.data;

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

    // Generate CSRF token for the authenticated user
    const csrfToken = await generateCsrfToken(userId);

    const res = NextResponse.json(
      { message: 'Login successful', userId, username, csrfToken },
      { status: 200 }
    );

    // IMPORTANT: In Route Handlers, set cookies on the response (not via next/headers cookies().set).
    res.cookies.set('session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      expires: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
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
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
