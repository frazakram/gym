import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getPremiumStatus, initializeDatabase } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await initializeDatabase();
  const status = await getPremiumStatus(session.userId);
  return NextResponse.json(status, { status: 200 });
}

