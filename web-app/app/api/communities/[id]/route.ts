import { withCors } from "@/lib/corsMiddleware";
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { initializeDatabase, getCommunityById, getCommunityLeaderboard, getMyCommunity } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) {
      return withCors(NextResponse.json({ error: "Unauthorized" }, { status: 401 }));
    }
    await initializeDatabase();

    const { id } = await ctx.params;
    const communityId = Number(id);
    if (!Number.isFinite(communityId) || communityId <= 0) {
      return withCors(NextResponse.json({ error: "Invalid community id" }, { status: 400 }));
    }

    const community = await getCommunityById(communityId);
    if (!community) {
      return withCors(NextResponse.json({ error: "Community not found" }, { status: 404 }));
    }

    // Visibility rule: only members can view custom community leaderboards.
    // Worldwide communities are always visible.
    if (community.type === 'custom') {
      const my = await getMyCommunity(session.userId);
      if (!my || my.id !== community.id) {
        return withCors(NextResponse.json(
          { error: "You must be a member to view this community" },
          { status: 403 }
        ));
      }
    }

    const members = await getCommunityLeaderboard(community.id, 100);
    return withCors(NextResponse.json({ community, members }));
  } catch (error) {
    console.error("GET /api/communities/[id] failed:", error);
    return withCors(NextResponse.json({ error: "Internal server error" }, { status: 500 }));
  }
}
