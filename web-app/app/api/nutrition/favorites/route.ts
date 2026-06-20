import { withCors } from "@/lib/corsMiddleware";
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { requireCsrf } from "@/lib/csrf";
import { initializeDatabase, getFavoriteFoods, addFavoriteFood } from "@/lib/db";
import { FavoriteCreateSchema, safeParseWithError } from "@/lib/validations";

export const runtime = "nodejs";

/** GET — the user's saved foods for quick re-logging. */
export async function GET() {
  try {
    const session = await getSession();
    if (!session) return withCors(NextResponse.json({ error: "Unauthorized" }, { status: 401 }));

    await initializeDatabase();
    const favorites = await getFavoriteFoods(session.userId);
    return withCors(NextResponse.json({ favorites }));
  } catch (error) {
    console.error("list favorites failed:", error);
    return withCors(NextResponse.json({ error: "Failed to load favorites" }, { status: 500 }));
  }
}

/** POST — save a food as a favorite (idempotent on name+quantity+unit). */
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return withCors(NextResponse.json({ error: "Unauthorized" }, { status: 401 }));

    const csrfError = await requireCsrf(request, session.userId);
    if (csrfError) return csrfError;

    await initializeDatabase();

    const parsed = safeParseWithError(FavoriteCreateSchema, await request.json().catch(() => ({})));
    if (!parsed.success) return withCors(NextResponse.json({ error: parsed.error }, { status: 400 }));

    const favorite = await addFavoriteFood(session.userId, parsed.data);
    if (!favorite) return withCors(NextResponse.json({ error: "Failed to save favorite" }, { status: 500 }));

    return withCors(NextResponse.json({ favorite }, { status: 201 }));
  } catch (error) {
    console.error("create favorite failed:", error);
    return withCors(NextResponse.json({ error: "Failed to save favorite" }, { status: 500 }));
  }
}
