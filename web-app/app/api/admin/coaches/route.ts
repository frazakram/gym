import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { isAdminUser } from "@/lib/admin";
import { initializeDatabase, listCoachApplicationsAdmin } from "@/lib/db";

export const runtime = "nodejs";

const QuerySchema = z.object({
  status: z.enum(["pending", "approved", "rejected"]).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
});

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await isAdminUser(session.userId))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const parsed = QuerySchema.safeParse({
    status: searchParams.get("status") ?? undefined,
    limit: searchParams.get("limit") ?? undefined,
  });
  if (!parsed.success) return NextResponse.json({ error: "Invalid query" }, { status: 400 });

  await initializeDatabase();
  const rows = await listCoachApplicationsAdmin({
    status: parsed.data.status ?? "pending",
    limit: parsed.data.limit ?? 50,
  });

  return NextResponse.json({ coaches: rows }, { status: 200 });
}

