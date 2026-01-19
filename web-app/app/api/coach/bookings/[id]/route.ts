import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import {
  deleteCoachBookingForUser,
  getCoachBookingByIdForUser,
  initializeDatabase,
  updateCoachBookingStatusForUser,
} from "@/lib/db";

export const runtime = "nodejs";

const PatchSchema = z.object({
  action: z.enum(["cancel"]),
});

function minutesUntil(d: Date): number {
  return Math.floor((d.getTime() - Date.now()) / (60 * 1000));
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await initializeDatabase();

  const params = await ctx.params;
  const id = Number(params.id);
  if (!Number.isFinite(id) || id <= 0) return NextResponse.json({ error: "Invalid booking id" }, { status: 400 });

  const raw = await req.json().catch(() => ({}));
  const body = PatchSchema.safeParse(raw);
  if (!body.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const booking = await getCoachBookingByIdForUser(session.userId, id);
  if (!booking) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (body.data.action === "cancel") {
    if (booking.status !== "pending" && booking.status !== "confirmed") {
      return NextResponse.json({ error: "Only pending/confirmed bookings can be cancelled." }, { status: 409 });
    }

    // Rule: user cannot cancel within 60 minutes of scheduled time.
    if (booking.preferred_at) {
      const mins = minutesUntil(booking.preferred_at);
      if (mins <= 60) {
        return NextResponse.json(
          { error: `You can't cancel within 60 minutes of the scheduled time. (${mins} minutes left)` },
          { status: 409 }
        );
      }
    }

    const ok = await updateCoachBookingStatusForUser({ userId: session.userId, id, status: "cancelled" });
    if (!ok) return NextResponse.json({ error: "Failed to cancel booking" }, { status: 500 });

    return NextResponse.json({ ok: true, status: "cancelled" }, { status: 200 });
  }

  return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await initializeDatabase();

  const params = await ctx.params;
  const id = Number(params.id);
  if (!Number.isFinite(id) || id <= 0) return NextResponse.json({ error: "Invalid booking id" }, { status: 400 });

  const booking = await getCoachBookingByIdForUser(session.userId, id);
  if (!booking) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Only allow deleting past bookings (industry-friendly audit: user can delete their history AFTER completion/cancel).
  if (booking.status !== "cancelled" && booking.status !== "completed") {
    return NextResponse.json({ error: "Only cancelled/completed bookings can be deleted." }, { status: 409 });
  }

  if (booking.status === "completed" && booking.preferred_at && booking.preferred_at.getTime() > Date.now()) {
    return NextResponse.json({ error: "This booking is not in the past yet." }, { status: 409 });
  }

  const ok = await deleteCoachBookingForUser({ userId: session.userId, id });
  if (!ok) return NextResponse.json({ error: "Failed to delete booking" }, { status: 500 });
  return NextResponse.json({ ok: true }, { status: 200 });
}

