import { withCors } from "@/lib/corsMiddleware";
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { initializeDatabase, createCustomCommunity, listWorldwideCommunities } from "@/lib/db";
import { requireCsrf } from "@/lib/csrf";
import { CommunityCreateSchema, safeParseWithError } from "@/lib/validations";

export const runtime = "nodejs";

// GET — list worldwide communities (so user can browse regions)
export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return withCors(NextResponse.json({ error: "Unauthorized" }, { status: 401 }));
    }
    await initializeDatabase();
    const worldwide = await listWorldwideCommunities();
    return withCors(NextResponse.json({ worldwide }));
  } catch (error) {
    console.error("GET /api/communities failed:", error);
    return withCors(NextResponse.json({ error: "Failed to list communities" }, { status: 500 }));
  }
}

// POST — create a custom community (joins creator immediately)
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return withCors(NextResponse.json({ error: "Unauthorized" }, { status: 401 }));
    }
    const csrfError = await requireCsrf(req, session.userId);
    if (csrfError) return csrfError;

    await initializeDatabase();

    const rawBody = await req.json().catch(() => ({}));
    const parsed = safeParseWithError(CommunityCreateSchema, rawBody);
    if (!parsed.success) {
      return withCors(NextResponse.json({ error: parsed.error }, { status: 400 }));
    }

    const result = await createCustomCommunity(session.userId, parsed.data.name, parsed.data.description ?? null);
    if (!result.community) {
      const status =
        result.error === 'already_in_community' ? 409 :
        result.error === 'cooldown' ? 429 : 500;
      const message =
        result.error === 'already_in_community' ? 'You are already in a community. Leave it first.' :
        result.error === 'cooldown' ? 'You must wait 6 hours after leaving a community before joining a new one.' :
        'Failed to create community';
      return withCors(NextResponse.json({ error: message, code: result.error }, { status }));
    }

    return withCors(NextResponse.json({ community: result.community }, { status: 201 }));
  } catch (error) {
    console.error("POST /api/communities failed:", error);
    return withCors(NextResponse.json({ error: "Internal server error" }, { status: 500 }));
  }
}
