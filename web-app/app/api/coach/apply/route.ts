import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { createCoachApplication, initializeDatabase } from "@/lib/db";
import { CoachApplySchema, safeParseWithError } from "@/lib/validations";
import { requireCsrf } from "@/lib/csrf";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // CSRF validation for state-changing request
    const csrfError = await requireCsrf(req, session.userId);
    if (csrfError) return csrfError;

    // Validate input with Zod
    const raw = await req.json().catch(() => ({}));
    const parsed = safeParseWithError(CoachApplySchema, raw);
    
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const body = parsed.data;

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

