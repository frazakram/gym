import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { requireCsrf } from "@/lib/csrf";
import { initializeDatabase, updateFoodEntry, deleteFoodEntry } from "@/lib/db";
import { FoodEntryUpdateSchema, safeParseWithError } from "@/lib/validations";

export const runtime = "nodejs";

function parseId(raw: string): number | null {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

/** PATCH — edit a logged entry (rename / adjust macros / quantity). */
export async function PATCH(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const csrfError = await requireCsrf(request, session.userId);
    if (csrfError) return csrfError;

    await initializeDatabase();

    const id = parseId((await ctx.params).id);
    if (id === null) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

    const parsed = safeParseWithError(FoodEntryUpdateSchema, await request.json().catch(() => ({})));
    if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 });

    const entry = await updateFoodEntry(session.userId, id, parsed.data);
    if (!entry) return NextResponse.json({ error: "Entry not found" }, { status: 404 });

    return NextResponse.json({ entry });
  } catch (error) {
    console.error("update food entry failed:", error);
    return NextResponse.json({ error: "Failed to update entry" }, { status: 500 });
  }
}

/** DELETE — remove a logged entry. */
export async function DELETE(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const csrfError = await requireCsrf(request, session.userId);
    if (csrfError) return csrfError;

    await initializeDatabase();

    const id = parseId((await ctx.params).id);
    if (id === null) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

    const ok = await deleteFoodEntry(session.userId, id);
    if (!ok) return NextResponse.json({ error: "Entry not found" }, { status: 404 });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("delete food entry failed:", error);
    return NextResponse.json({ error: "Failed to delete entry" }, { status: 500 });
  }
}
