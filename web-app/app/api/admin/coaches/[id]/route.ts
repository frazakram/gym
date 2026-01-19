import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { isAdminUser } from "@/lib/admin";
import { initializeDatabase, setCoachApplicationStatusAdmin } from "@/lib/db";

export const runtime = "nodejs";

const BodySchema = z.object({
  status: z.enum(["approved", "rejected", "pending"]),
  admin_notes: z.string().max(2000).optional().nullable(),
});

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!(await isAdminUser(session.userId))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { id } = await ctx.params;
    const coachId = Math.floor(Number(id));
    if (!Number.isFinite(coachId) || coachId <= 0) {
      return NextResponse.json({ error: "Invalid coach id" }, { status: 400 });
    }

    const raw = await req.json().catch(() => ({}));
    const body = BodySchema.parse(raw);

    await initializeDatabase();
    const ok = await setCoachApplicationStatusAdmin({
      coachId,
      status: body.status,
      adminNotes: body.admin_notes ?? null,
    });
    if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message || "Internal server error" }, { status: 500 });
  }
}

