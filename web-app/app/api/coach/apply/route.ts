import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { createCoachApplication, initializeDatabase } from "@/lib/db";

export const runtime = "nodejs";

const BodySchema = z.object({
  display_name: z.string().min(2).max(80),
  bio: z.string().max(1200).optional().nullable(),
  experience_years: z.coerce.number().int().min(0).max(80).optional().nullable(),
  certifications: z.string().max(1200).optional().nullable(),
  specialties: z.array(z.string().min(1).max(50)).max(20).optional().nullable(),
  languages: z.array(z.string().min(1).max(30)).max(20).optional().nullable(),
  timezone: z.string().max(64).optional().nullable(),
  phone: z.string().min(7).max(20).optional().nullable(),
  email: z.string().email().optional().nullable(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const raw = await req.json().catch(() => ({}));
    const body = BodySchema.parse(raw);

    await initializeDatabase();
    const out = await createCoachApplication({
      userId: session.userId,
      profile: {
        display_name: body.display_name.trim(),
        bio: body.bio ?? null,
        experience_years: body.experience_years ?? null,
        certifications: body.certifications ?? null,
        specialties: body.specialties ?? null,
        languages: body.languages ?? null,
        timezone: body.timezone ?? "Asia/Kolkata",
        phone: body.phone ?? null,
        email: body.email ?? null,
      },
    });

    return NextResponse.json({ coachId: out.coachId, status: out.status }, { status: 200 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message || "Internal server error" }, { status: 500 });
  }
}

