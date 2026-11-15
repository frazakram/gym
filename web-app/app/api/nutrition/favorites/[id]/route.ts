import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { requireCsrf } from "@/lib/csrf";
import { initializeDatabase, deleteFavoriteFood } from "@/lib/db";

export const runtime = "nodejs";

/** DELETE — remove a saved favorite food. */
export async function DELETE(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const csrfError = await requireCsrf(request, session.userId);
    if (csrfError) return csrfError;

    await initializeDatabase();

    const id = Number((await ctx.params).id);
    if (!Number.isInteger(id) || id <= 0) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    const ok = await deleteFavoriteFood(session.userId, id);
    if (!ok) return NextResponse.json({ error: "Favorite not found" }, { status: 404 });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("delete favorite failed:", error);
    return NextResponse.json({ error: "Failed to delete favorite" }, { status: 500 });
  }
}
