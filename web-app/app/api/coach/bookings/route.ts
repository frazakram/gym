import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { initializeDatabase, listCoachBookings } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const limit = Math.max(1, Math.min(50, Number(searchParams.get("limit") ?? 10) || 10));

  await initializeDatabase();
  const bookings = await listCoachBookings(session.userId, limit);
  return NextResponse.json(
    {
      bookings: bookings.map((b) => ({
        ...b,
        preferred_at: b.preferred_at ? b.preferred_at.toISOString() : null,
        created_at: b.created_at.toISOString(),
      })),
    },
    { status: 200 }
  );
}

