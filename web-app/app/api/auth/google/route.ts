import { NextRequest, NextResponse } from "next/server";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { createSession } from "@/lib/auth";
import {
  createUserWithRandomPassword,
  getProfile,
  getSessionVersion,
  getUser,
  getUserIdByUsername,
  initializeDatabase,
} from "@/lib/db";

export const runtime = "nodejs";

/**
 * Native Google sign-in for the Android app: the app's account picker returns a
 * Google ID token, which it posts here as { idToken } and exchanges for a
 * session token: { token, user: { id, email, name }, profileComplete }.
 *
 * The response format is a contract with released APKs; do not change it.
 * (The website uses the redirect flow in ./start and ./callback instead.)
 */
const GOOGLE_JWKS = createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"));

const authenticationFailed = () => NextResponse.json({ error: "Authentication failed" }, { status: 401 });

export async function POST(request: NextRequest) {
  try {
    const clientId = process.env.GOOGLE_CLIENT_ID || "";
    if (!clientId) return authenticationFailed();

    const body = await request.json().catch(() => ({}));
    const idToken: unknown = body?.idToken;
    if (typeof idToken !== "string" || !idToken) return authenticationFailed();

    const { payload } = await jwtVerify(idToken, GOOGLE_JWKS, {
      issuer: ["https://accounts.google.com", "accounts.google.com"],
      audience: clientId,
    });

    const email = typeof payload.email === "string" ? payload.email : "";
    const emailVerified = payload.email_verified === true;
    const name = typeof payload.name === "string" ? payload.name : email;
    const subject = typeof payload.sub === "string" ? payload.sub : "";
    if (!email || !emailVerified || !subject) return authenticationFailed();

    await initializeDatabase();

    let userId = await getUserIdByUsername(email);
    if (!userId) {
      const created = await createUserWithRandomPassword(email);
      userId = created?.id ?? null;
    }
    if (!userId) return authenticationFailed();

    const [sessionVersion, dbUser, profile] = await Promise.all([
      getSessionVersion(userId),
      getUser(userId),
      getProfile(userId),
    ]);
    // Session tokens carry the account's session version (see lib/auth.ts);
    // without it getSession rejects the token.
    const token = await createSession(userId, sessionVersion ?? 0);
    const profileComplete = Boolean(profile?.name && profile?.goal && profile?.level);

    return NextResponse.json(
      {
        token,
        user: {
          id: userId,
          email,
          name: dbUser?.username === email ? name : (dbUser?.username ?? email),
        },
        profileComplete,
      },
      { status: 200 },
    );
  } catch (error) {
    console.warn("[auth/google] native sign-in failed:", error);
    return authenticationFailed();
  }
}
