import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { isAdminUser } from "@/lib/admin";
import { initializeDatabase, listAllCoachBookingsAdmin } from "@/lib/db";

export const runtime = "nodejs";

const QuerySchema = z.object({
  status: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ok = await isAdminUser(session.userId);
  if (!ok) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const parsed = QuerySchema.safeParse({
    status: searchParams.get("status") ?? undefined,
    limit: searchParams.get("limit") ?? undefined,
    offset: searchParams.get("offset") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid query" }, { status: 400 });
  }

  await initializeDatabase();
  const rows = await listAllCoachBookingsAdmin(parsed.data);

  return NextResponse.json(
    {
      bookings: rows.map((b) => ({
        ...b,
        preferred_at: b.preferred_at ? b.preferred_at.toISOString() : null,
        created_at: b.created_at.toISOString(),
      })),
    },
    { status: 200 }
  );
}

