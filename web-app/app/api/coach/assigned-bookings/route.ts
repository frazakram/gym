import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getApprovedCoachIdByUserId, initializeDatabase, listAssignedCoachBookings } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const limit = Math.max(1, Math.min(100, Number(searchParams.get("limit") ?? 50) || 50));

  await initializeDatabase();
  const coachId = await getApprovedCoachIdByUserId(session.userId);
  if (!coachId) return NextResponse.json({ error: "Not a coach (or not approved)" }, { status: 403 });

  const bookings = await listAssignedCoachBookings(coachId, limit);

  // Privacy enforcement: share user email/phone only when booking is confirmed.
  const out = bookings.map((b) => ({
    id: b.id,
    status: b.status,
    coach_id: b.coach_id,
    coach_name: b.coach_name,
    preferred_at: b.preferred_at ? b.preferred_at.toISOString() : null,
    message: b.message,
    user_name: b.user_name,
    user_email: b.status === "confirmed" ? b.user_email : null,
    user_phone: b.status === "confirmed" ? b.user_phone : null,
    created_at: b.created_at.toISOString(),
  }));

  return NextResponse.json({ bookings: out }, { status: 200 });
}

