import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  initializeDatabase,
  joinCommunity,
  getCommunityByJoinCode,
  getCommunityById,
  getProfile,
  getOrCreateRegionalCommunityId,
  countryToRegion,
} from "@/lib/db";
import { requireCsrf } from "@/lib/csrf";
import { safeParseWithError } from "@/lib/validations";
import { z } from "zod";

export const runtime = "nodejs";

const JoinSchema = z.union([
  z.object({ code: z.string().min(4).max(16) }),
  z.object({ community_id: z.coerce.number().int().positive() }),
  z.object({ worldwide: z.literal(true) }),
]);

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const csrfError = await requireCsrf(req, session.userId);
    if (csrfError) return csrfError;

    await initializeDatabase();

    const rawBody = await req.json().catch(() => ({}));
    const parsed = safeParseWithError(JoinSchema, rawBody);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    let communityId: number | null = null;

    if ('code' in parsed.data) {
      const c = await getCommunityByJoinCode(parsed.data.code);
      if (!c) return NextResponse.json({ error: "Invalid join code" }, { status: 404 });
      communityId = c.id;
    } else if ('community_id' in parsed.data) {
      const c = await getCommunityById(parsed.data.community_id);
      if (!c) return NextResponse.json({ error: "Community not found" }, { status: 404 });
      communityId = c.id;
    } else if ('worldwide' in parsed.data) {
      // Auto-join worldwide regional community based on user's region
      const profile = await getProfile(session.userId);
      const region = profile?.region ?? countryToRegion(profile?.nationality);
      if (!region) {
        return NextResponse.json(
          { error: "Set your country in profile first to join the worldwide community" },
          { status: 400 }
        );
      }
      communityId = await getOrCreateRegionalCommunityId(region);
      if (!communityId) {
        return NextResponse.json({ error: "Could not resolve regional community" }, { status: 500 });
      }
    }

    if (!communityId) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const result = await joinCommunity(session.userId, communityId);
    if (result === null) {
      const c = await getCommunityById(communityId);
      return NextResponse.json({ community: c }, { status: 200 });
    }

    const status =
      result === 'already_in_community' ? 409 :
      result === 'cooldown' ? 429 :
      result === 'community_full' ? 409 :
      result === 'not_found' ? 404 : 500;
    const message =
      result === 'already_in_community' ? 'You are already in a community. Leave it first.' :
      result === 'cooldown' ? 'You must wait 6 hours after leaving a community before joining a new one.' :
      result === 'community_full' ? 'This community is full (100 members max).' :
      result === 'not_found' ? 'Community not found.' :
      'Failed to join community';
    return NextResponse.json({ error: message, code: result }, { status });
  } catch (error) {
    console.error("POST /api/communities/join failed:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
