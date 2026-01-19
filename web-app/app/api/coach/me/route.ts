import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import {
  getCoachApplicationByUserId,
  getCoachProfileByCoachId,
  initializeDatabase,
  updateCoachProfileByUser,
} from "@/lib/db";

export const runtime = "nodejs";

const PatchSchema = z.object({
  display_name: z.string().min(2).max(80).optional(),
  bio: z.string().max(1200).optional().nullable(),
  experience_years: z.coerce.number().int().min(0).max(80).optional().nullable(),
  certifications: z.string().max(1200).optional().nullable(),
  specialties: z.array(z.string().min(1).max(50)).max(20).optional().nullable(),
  languages: z.array(z.string().min(1).max(30)).max(20).optional().nullable(),
  timezone: z.string().max(64).optional().nullable(),
  phone: z.string().min(7).max(20).optional().nullable(),
  email: z.string().email().optional().nullable(),
});

export async function GET(req: NextRequest) {
  void req;
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await initializeDatabase();
  const app = await getCoachApplicationByUserId(session.userId);
  if (!app) return NextResponse.json({ application: null }, { status: 200 });

  const profile = await getCoachProfileByCoachId(app.id);
  return NextResponse.json(
    {
      application: {
        id: app.id,
        status: app.status,
        admin_notes: app.admin_notes,
        approved_at: app.approved_at ? app.approved_at.toISOString() : null,
        rejected_at: app.rejected_at ? app.rejected_at.toISOString() : null,
        created_at: app.created_at ? new Date(app.created_at as any).toISOString() : null,
      },
      profile,
    },
    { status: 200 }
  );
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const raw = await req.json().catch(() => ({}));
    const body = PatchSchema.parse(raw);

    await initializeDatabase();
    const ok = await updateCoachProfileByUser({ userId: session.userId, profile: body });
    if (!ok) return NextResponse.json({ error: "No coach application found" }, { status: 404 });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message || "Internal server error" }, { status: 500 });
  }
}

