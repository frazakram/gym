import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { isAdminUser } from "@/lib/admin";
import { initializeDatabase, updateCoachBookingStatusAdmin } from "@/lib/db";

export const runtime = "nodejs";

const BodySchema = z.object({
  status: z.enum(["pending", "confirmed", "cancelled", "completed"]),
});

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const ok = await isAdminUser(session.userId);
    if (!ok) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { id } = await ctx.params;
    const bookingId = Math.floor(Number(id));
    if (!Number.isFinite(bookingId) || bookingId <= 0) {
      return NextResponse.json({ error: "Invalid booking id" }, { status: 400 });
    }

    const raw = await req.json().catch(() => ({}));
    const body = BodySchema.parse(raw);

    await initializeDatabase();
    const updated = await updateCoachBookingStatusAdmin({ id: bookingId, status: body.status });
    if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message || "Internal server error" }, { status: 500 });
  }
}

