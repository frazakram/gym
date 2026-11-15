import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getBodyPhotos, initializeDatabase } from "@/lib/db";
import { toErrorResponse } from "@/lib/api-errors";

export const runtime = "nodejs";

/**
 * GET /api/body/photos - the signed-in user's body photos, decrypted.
 * Served separately from /api/profile so the sensitive, large photo data is
 * only sent when the Body view needs it, and never cached with the profile.
 */
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    await initializeDatabase();
    const bodyPhotos = await getBodyPhotos(session.userId);
    return NextResponse.json({ body_photos: bodyPhotos }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return toErrorResponse(error, "body/photos");
  }
}
