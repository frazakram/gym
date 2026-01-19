import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { createCoachBooking, getPremiumStatus, initializeDatabase } from "@/lib/db";
import { HARD_CODED_COACH } from "@/lib/coach";
import { rateLimit, RATE_LIMITS } from "@/lib/rate-limit";

export const runtime = "nodejs";

const BodySchema = z.object({
  preferredAt: z.string().datetime().optional().nullable(),
  message: z.string().max(1000).optional().nullable(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await initializeDatabase();
    const premium = await getPremiumStatus(session.userId);
    if (!premium.access) {
      return NextResponse.json({ error: "Personal Coach is a premium feature." }, { status: 403 });
    }

    // Rate limit (no-op if Redis not configured)
    {
      const burst = await rateLimit({
        key: `rl:coach_book:minute:${session.userId}`,
        limit: RATE_LIMITS.coachBookPerMinute(),
        windowSeconds: 60,
      });
      if (!burst.allowed) {
        return NextResponse.json(
          { error: `Too many requests. Try again in ${burst.retryAfterSeconds}s.` },
          {
            status: 429,
            headers: {
              "Retry-After": String(burst.retryAfterSeconds),
              "X-RateLimit-Limit": String(burst.limit),
              "X-RateLimit-Remaining": String(burst.remaining),
            },
          }
        );
      }

      const dayKey = new Date().toISOString().slice(0, 10); // YYYY-MM-DD UTC
      const rl = await rateLimit({
        key: `rl:coach_book:day:${dayKey}:${session.userId}`,
        limit: RATE_LIMITS.coachBookPerDay(),
        windowSeconds: 60 * 60 * 24,
      });
      if (!rl.allowed) {
        return NextResponse.json(
          { error: `Too many booking requests. Try again in ${rl.retryAfterSeconds}s.` },
          {
            status: 429,
            headers: {
              "Retry-After": String(rl.retryAfterSeconds),
              "X-RateLimit-Limit": String(rl.limit),
              "X-RateLimit-Remaining": String(rl.remaining),
            },
          }
        );
      }
    }

    const raw = await req.json().catch(() => ({}));
    const body = BodySchema.parse(raw);

    const booking = await createCoachBooking({
      userId: session.userId,
      coach: { name: HARD_CODED_COACH.name, phone: HARD_CODED_COACH.phone, email: HARD_CODED_COACH.email },
      preferredAt: body.preferredAt ?? null,
      message: body.message ?? null,
    });

    return NextResponse.json(
      {
        bookingId: booking.id,
        status: booking.status,
        createdAt: booking.created_at instanceof Date ? booking.created_at.toISOString() : String(booking.created_at),
        coach: HARD_CODED_COACH,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message || "Internal server error" }, { status: 500 });
  }
}

