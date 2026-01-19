import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getPremiumStatus, initializeDatabase } from "@/lib/db";
import { HARD_CODED_COACH } from "@/lib/coach";

export const runtime = "nodejs";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await initializeDatabase();
  const premium = await getPremiumStatus(session.userId);
  if (!premium.access) {
    return NextResponse.json({ error: "Personal Coach is a premium feature." }, { status: 403 });
  }

  return NextResponse.json({ coach: HARD_CODED_COACH }, { status: 200 });
}

