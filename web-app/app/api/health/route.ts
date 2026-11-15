import { NextResponse } from "next/server";
import { getHealthReport } from "@/lib/health";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Public liveness/readiness check for an uptime monitor: 200 when the app can
 * serve users (status "ok", or "degraded" when only the optional Redis is
 * down), 503 when the database is unreachable. No session: monitors are
 * anonymous, and the response contains no user data or error details.
 */
export async function GET() {
  const report = await getHealthReport();
  return NextResponse.json(report, {
    status: report.status === "down" ? 503 : 200,
    headers: { "Cache-Control": "no-store" },
  });
}
