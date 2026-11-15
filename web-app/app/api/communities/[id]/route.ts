import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { initializeDatabase, getCommunityById, getCommunityLeaderboard, getMyCommunity } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    await initializeDatabase();

    const { id } = await ctx.params;
    const communityId = Number(id);
    if (!Number.isFinite(communityId) || communityId <= 0) {
      return NextResponse.json({ error: "Invalid community id" }, { status: 400 });
    }

    const community = await getCommunityById(communityId);
    if (!community) {
      return NextResponse.json({ error: "Community not found" }, { status: 404 });
    }

    // Visibility rule: only members can view custom community leaderboards.
    // Worldwide communities are always visible.
    if (community.type === 'custom') {
      const my = await getMyCommunity(session.userId);
      if (!my || my.id !== community.id) {
        return NextResponse.json(
          { error: "You must be a member to view this community" },
          { status: 403 }
        );
      }
    }

    const { searchParams } = new URL(req.url);
    const limit = Math.max(1, Math.min(500, Number(searchParams.get("limit") ?? 100) || 100));
    const offset = Math.max(0, Number(searchParams.get("offset") ?? 0) || 0);

    const members = await getCommunityLeaderboard(community.id, limit, offset);
    return NextResponse.json({ community, members, limit, offset });
  } catch (error) {
    console.error("GET /api/communities/[id] failed:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
