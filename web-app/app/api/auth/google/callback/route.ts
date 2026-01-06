import { NextRequest, NextResponse } from "next/server";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { createSession } from "@/lib/auth";
import { createUserWithRandomPassword, getUserIdByUsername, initializeDatabase } from "@/lib/db";

export const runtime = "nodejs";

const GOOGLE_JWKS = createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"));

export async function GET(request: NextRequest) {
  try {
    const clientId = process.env.GOOGLE_CLIENT_ID || "";
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET || "";

    const origin = request.nextUrl.origin;
    const redirectUri = `${origin}/api/auth/google/callback`;

    const code = request.nextUrl.searchParams.get("code");
    const state = request.nextUrl.searchParams.get("state");
    const error = request.nextUrl.searchParams.get("error");

    const redirectToLogin = (reason: string) => {
      const url = new URL("/login", origin);
      url.searchParams.set("error", reason);
      return NextResponse.redirect(url);
    };

    if (error) return redirectToLogin(`google_${error}`);
    if (!clientId || !clientSecret) return redirectToLogin("google_not_configured");
    if (!code || !state) return redirectToLogin("google_missing_code");

    const stateCookie = request.cookies.get("google_oauth_state")?.value;
    if (!stateCookie || stateCookie !== state) return redirectToLogin("google_state_mismatch");

    const returnTo = request.cookies.get("google_oauth_return_to")?.value || "/dashboard";

    // Exchange code -> tokens
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }).toString(),
    });

    if (!tokenRes.ok) {
      const t = await tokenRes.text().catch(() => "");
      throw new Error(`Google token exchange failed: HTTP ${tokenRes.status} ${t}`);
    }

    const tokenJson = (await tokenRes.json()) as any;
    const idToken: string | undefined = tokenJson?.id_token;
    if (!idToken) throw new Error("Google response missing id_token");

    // Verify ID token
    const { payload } = await jwtVerify(idToken, GOOGLE_JWKS, {
      issuer: ["https://accounts.google.com", "accounts.google.com"],
      audience: clientId,
    });

    const email = typeof payload.email === "string" ? payload.email : "";
    const emailVerified = payload.email_verified === true;
    if (!email) throw new Error("Google token missing email");
    if (!emailVerified) throw new Error("Google email is not verified");

    // Ensure DB exists, then upsert user by email (username == email)
    await initializeDatabase();

    let userId = await getUserIdByUsername(email);
    if (!userId) {
      const created = await createUserWithRandomPassword(email);
      userId = created?.id ?? null;
    }
    if (!userId) throw new Error("Failed to create user");

    const sessionToken = await createSession(userId);

    const res = NextResponse.redirect(new URL(returnTo, origin));
    // Set session cookie (same options as setSessionCookie)
    res.cookies.set("session", sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });
    // Cleanup
    res.cookies.set("google_oauth_state", "", { path: "/", maxAge: 0 });
    res.cookies.set("google_oauth_return_to", "", { path: "/", maxAge: 0 });
    return res;
  } catch (err: unknown) {
    const origin = request.nextUrl.origin;
    const url = new URL("/login", origin);
    url.searchParams.set("error", "google_failed");
    return NextResponse.redirect(url);
  }
}


