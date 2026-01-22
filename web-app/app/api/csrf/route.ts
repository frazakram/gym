import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { generateCsrfToken } from "@/lib/csrf";

/**
 * GET /api/csrf
 * 
 * Returns a fresh CSRF token for the client.
 * The token is also set as a cookie for double-submit validation.
 */
export async function GET(request: NextRequest) {
  try {
    // Get session (optional - token works with or without auth)
    const session = await getSession();
    const userId = session?.userId;

    // Generate new CSRF token
    const token = await generateCsrfToken(userId);
    const expiresAt = Date.now() + 60 * 60 * 1000; // 1 hour

    const response = NextResponse.json({
      token,
      expiresAt,
    });

    // Set the token as a cookie for double-submit pattern
    response.cookies.set("csrf_token", token, {
      httpOnly: false, // Must be readable by client JS
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 60 * 60, // 1 hour
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("CSRF token generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate CSRF token" },
      { status: 500 }
    );
  }
}
