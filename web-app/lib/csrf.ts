import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

/**
 * CSRF Protection Module
 * 
 * Uses a double-submit cookie pattern with JWT tokens:
 * 1. Server generates a CSRF token and sets it in an HttpOnly cookie
 * 2. Client must include the same token in a header (X-CSRF-Token)
 * 3. Server verifies both match and the token is valid
 */

const CSRF_COOKIE_NAME = "csrf_token";
const CSRF_HEADER_NAME = "x-csrf-token";
const CSRF_TOKEN_EXPIRY = "1h"; // 1 hour

// Use a separate secret for CSRF (falls back to JWT_SECRET if not set)
function getCsrfSecret(): Uint8Array {
  const secret = process.env.CSRF_SECRET || process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("CSRF_SECRET or JWT_SECRET environment variable is not defined");
  }
  return new TextEncoder().encode(secret);
}

/**
 * Generate a new CSRF token
 */
export async function generateCsrfToken(userId?: number): Promise<string> {
  const payload: Record<string, unknown> = {
    // Random nonce to make each token unique
    nonce: crypto.randomBytes(16).toString("hex"),
    // Include timestamp for additional entropy
    iat: Math.floor(Date.now() / 1000),
  };
  
  // Optionally bind to user session
  if (userId !== undefined) {
    payload.uid = userId;
  }

  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(CSRF_TOKEN_EXPIRY)
    .sign(getCsrfSecret());

  return token;
}

/**
 * Verify a CSRF token
 */
export async function verifyCsrfToken(
  token: string,
  userId?: number
): Promise<{ valid: boolean; error?: string }> {
  if (!token || typeof token !== "string") {
    return { valid: false, error: "Missing CSRF token" };
  }

  try {
    const { payload } = await jwtVerify(token, getCsrfSecret());
    
    // If userId was provided during generation, verify it matches
    if (userId !== undefined && payload.uid !== undefined) {
      if (payload.uid !== userId) {
        return { valid: false, error: "CSRF token user mismatch" };
      }
    }

    return { valid: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid token";
    
    // Provide more specific error messages
    if (message.includes("expired")) {
      return { valid: false, error: "CSRF token expired" };
    }
    if (message.includes("signature")) {
      return { valid: false, error: "Invalid CSRF token signature" };
    }
    
    return { valid: false, error: "Invalid CSRF token" };
  }
}

/**
 * Set CSRF token cookie on response
 */
export async function setCsrfCookie(
  response: NextResponse,
  userId?: number
): Promise<string> {
  const token = await generateCsrfToken(userId);
  
  response.cookies.set(CSRF_COOKIE_NAME, token, {
    httpOnly: false, // Must be readable by client JS to send in header
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 60 * 60, // 1 hour
    path: "/",
  });

  return token;
}

/**
 * Get CSRF token from request (cookie)
 */
export function getCsrfTokenFromCookie(request: NextRequest): string | null {
  return request.cookies.get(CSRF_COOKIE_NAME)?.value || null;
}

/**
 * Get CSRF token from request header
 */
export function getCsrfTokenFromHeader(request: NextRequest): string | null {
  return request.headers.get(CSRF_HEADER_NAME);
}

/**
 * Validate CSRF token from request
 * Compares cookie token with header token using timing-safe comparison
 */
export async function validateCsrfRequest(
  request: NextRequest,
  userId?: number
): Promise<{ valid: boolean; error?: string }> {
  const cookieToken = getCsrfTokenFromCookie(request);
  const headerToken = getCsrfTokenFromHeader(request);

  // Both must be present
  if (!cookieToken) {
    return { valid: false, error: "Missing CSRF cookie" };
  }
  if (!headerToken) {
    return { valid: false, error: "Missing CSRF header" };
  }

  // Tokens must match (timing-safe comparison)
  const cookieBuffer = Buffer.from(cookieToken);
  const headerBuffer = Buffer.from(headerToken);
  
  if (cookieBuffer.length !== headerBuffer.length) {
    return { valid: false, error: "CSRF token mismatch" };
  }
  
  if (!crypto.timingSafeEqual(cookieBuffer, headerBuffer)) {
    return { valid: false, error: "CSRF token mismatch" };
  }

  // Verify the token is valid (not expired, proper signature)
  return verifyCsrfToken(cookieToken, userId);
}

/**
 * Middleware helper to validate CSRF for state-changing requests
 */
export async function requireCsrf(
  request: NextRequest,
  userId?: number
): Promise<NextResponse | null> {
  // Skip CSRF for safe methods
  const method = request.method.toUpperCase();
  if (["GET", "HEAD", "OPTIONS"].includes(method)) {
    return null;
  }

  // Skip CSRF for webhook endpoints (they use signature verification)
  const pathname = new URL(request.url).pathname;
  if (pathname.includes("/webhook")) {
    return null;
  }

  const result = await validateCsrfRequest(request, userId);
  
  if (!result.valid) {
    return NextResponse.json(
      { error: result.error || "CSRF validation failed" },
      { status: 403 }
    );
  }

  return null; // Valid - continue processing
}

/**
 * API endpoint helper to get a fresh CSRF token
 * Call this from client-side to get a token for subsequent requests
 */
export async function getCsrfTokenForClient(userId?: number): Promise<{
  token: string;
  expiresAt: number;
}> {
  const token = await generateCsrfToken(userId);
  const expiresAt = Date.now() + 60 * 60 * 1000; // 1 hour from now
  
  return { token, expiresAt };
}

/**
 * Server Component helper to get CSRF token from cookies
 */
export async function getServerCsrfToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(CSRF_COOKIE_NAME)?.value || null;
}

/**
 * Server Action helper to set a new CSRF token
 */
export async function refreshCsrfToken(userId?: number): Promise<string> {
  const cookieStore = await cookies();
  const token = await generateCsrfToken(userId);
  
  cookieStore.set(CSRF_COOKIE_NAME, token, {
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 60 * 60,
    path: "/",
  });

  return token;
}
