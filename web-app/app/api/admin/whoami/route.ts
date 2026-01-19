import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { isAdminUser } from "@/lib/admin";

export const runtime = "nodejs";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const isAdmin = await isAdminUser(session.userId);
  return NextResponse.json({ isAdmin }, { status: 200 });
}

