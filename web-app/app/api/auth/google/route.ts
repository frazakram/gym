import { NextRequest, NextResponse } from "next/server";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { createSession } from "@/lib/auth";
import {
  createUserWithRandomPassword,
  getUserIdByUsername,
  getUser,
  getProfile,
  initializeDatabase,
} from "@/lib/db";

export const runtime = "nodejs";

const GOOGLE_JWKS = createRemoteJWKSet(
  new URL("https://www.googleapis.com/oauth2/v3/certs")
);

export async function POST(request: NextRequest) {
  try {
    const clientId = process.env.GOOGLE_CLIENT_ID || "";
    if (!clientId) {
      return NextResponse.json({ error: "Authentication failed" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const idToken: string | undefined = body?.idToken;
    if (!idToken) {
      return NextResponse.json({ error: "Authentication failed" }, { status: 401 });
    }

    const { payload } = await jwtVerify(idToken, GOOGLE_JWKS, {
      issuer: ["https://accounts.google.com", "accounts.google.com"],
      audience: clientId,
    });

    const email = typeof payload.email === "string" ? payload.email : "";
    const emailVerified = payload.email_verified === true;
    const name = typeof payload.name === "string" ? payload.name : email;
    const sub = typeof payload.sub === "string" ? payload.sub : "";

    if (!email || !emailVerified || !sub) {
      return NextResponse.json({ error: "Authentication failed" }, { status: 401 });
    }

    await initializeDatabase();

    let userId = await getUserIdByUsername(email);
    if (!userId) {
      const created = await createUserWithRandomPassword(email);
      userId = created?.id ?? null;
    }
    if (!userId) {
      return NextResponse.json({ error: "Authentication failed" }, { status: 401 });
    }

    const [token, dbUser, profile] = await Promise.all([
      createSession(userId),
      getUser(userId),
      getProfile(userId),
    ]);

    const profileComplete = !!(profile?.name && profile?.goal && profile?.level);

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
        { status: 200 }
      );
  } catch {
    return NextResponse.json({ error: "Authentication failed" }, { status: 401 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
