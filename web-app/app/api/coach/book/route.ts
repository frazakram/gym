import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  createCoachBooking,
  getActiveCoachBookingForUser,
  getApprovedCoachPublicById,
  getPremiumStatus,
  initializeDatabase,
} from "@/lib/db";
import { HARD_CODED_COACH } from "@/lib/coach";
import { rateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { sendEmail } from "@/lib/email";
import { CoachBookingSchema, safeParseWithError } from "@/lib/validations";
import { requireCsrf } from "@/lib/csrf";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // CSRF validation for state-changing request
    const csrfError = await requireCsrf(req, session.userId);
    if (csrfError) return csrfError;

    await initializeDatabase();
    const premium = await getPremiumStatus(session.userId);
    if (!premium.access) {
      return NextResponse.json({ error: "Personal Coach is a premium feature." }, { status: 403 });
    }

    // Enforce: user can have only ONE active booking at a time (pending/confirmed)
    {
      const active = await getActiveCoachBookingForUser(session.userId);
      if (active) {
        return NextResponse.json(
          {
            error: `You already have an active coach booking (#${active.id}, ${active.status}). Cancel it before booking again.`,
            activeBooking: {
              id: active.id,
              status: active.status,
              coachName: active.coach_name,
              preferredAt: active.preferred_at ? active.preferred_at.toISOString() : null,
              createdAt: active.created_at.toISOString(),
            },
          },
          { status: 409 }
        );
      }
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

    // Validate input with Zod
    const raw = await req.json().catch(() => ({}));
    const parsed = safeParseWithError(CoachBookingSchema, raw);
    
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error },
        { status: 400 }
      );
    }

    const body = parsed.data;

    // Resolve coach: either selected approved coach, or fallback to the hard-coded coach.
    const selectedCoach =
      typeof body.coachId === "number" ? await getApprovedCoachPublicById(body.coachId) : null;
    const coach = selectedCoach
      ? {
          id: String(selectedCoach.coach_id),
          name: selectedCoach.display_name,
          phone: selectedCoach.phone || "",
          email: selectedCoach.email || "",
        }
      : HARD_CODED_COACH;

    if (selectedCoach && (!coach.email || !coach.phone)) {
      return NextResponse.json(
        { error: "Selected coach is missing contact info. Ask the coach to update their profile." },
        { status: 409 }
      );
    }

    const booking = await createCoachBooking({
      userId: session.userId,
      coach: { name: coach.name, phone: coach.phone, email: coach.email },
      user: { name: body.userName, email: body.userEmail, phone: body.userPhone },
      coachId: selectedCoach ? selectedCoach.coach_id : null,
      preferredAt: body.preferredAt ?? null,
      message: body.message ?? null,
    });

    // Notify coach via email (real SMTP)
    // IMPORTANT: Do NOT include user phone/email until booking is confirmed by admin.
    {
      const preferred =
        body.preferredAt != null
          ? new Date(body.preferredAt).toLocaleString()
          : "Not specified";
      const appBase = (process.env.APP_BASE_URL || "").replace(/\/+$/, "");
      // Coach may not be admin; keep link optional and generic.
      const adminLink = appBase ? `${appBase}/admin/coach-bookings` : "";

      const subject = `New coach booking request #${booking.id}`;
      const text = [
        `A new Personal Coach booking request was created.`,
        ``,
        `Booking ID: ${booking.id}`,
        `User ID: ${session.userId}`,
        `User Name: ${body.userName}`,
        `Preferred time: ${preferred}`,
        body.message ? `Message: ${body.message}` : `Message: (none)`,
        ``,
        `NOTE: User contact details are shared after admin confirms the booking.`,
        adminLink ? `` : ``,
        adminLink ? `Admin page: ${adminLink}` : ``,
      ]
        .filter(Boolean)
        .join("\n");

      const html = `
        <div style="font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial; line-height: 1.5;">
          <h2 style="margin: 0 0 12px;">New coach booking request</h2>
          <p style="margin: 0 0 12px;">A user just requested a 1:1 coach session.</p>
          <table style="border-collapse: collapse; width: 100%; max-width: 640px;">
            <tr><td style="padding: 6px 0; color:#64748b;">Booking ID</td><td style="padding: 6px 0;"><b>#${booking.id}</b></td></tr>
            <tr><td style="padding: 6px 0; color:#64748b;">User ID</td><td style="padding: 6px 0;">${session.userId}</td></tr>
            <tr><td style="padding: 6px 0; color:#64748b;">Name</td><td style="padding: 6px 0;">${escapeHtml(body.userName)}</td></tr>
            <tr><td style="padding: 6px 0; color:#64748b;">Preferred time</td><td style="padding: 6px 0;">${escapeHtml(preferred)}</td></tr>
          </table>
          <p style="margin-top:12px; color:#94a3b8; font-size:12px;">
            Note: User contact details are shared after admin confirms the booking.
          </p>
          ${
            body.message
              ? `<div style="margin-top:12px;"><div style="color:#64748b; font-size:12px;">Message</div><div style="white-space:pre-wrap; background:#0b1220; color:#e2e8f0; border:1px solid rgba(255,255,255,0.08); padding:12px; border-radius:12px;">${escapeHtml(body.message)}</div></div>`
              : ""
          }
          ${
            adminLink
              ? `<p style="margin-top:16px;"><a href="${adminLink}">Open Admin Coach Bookings</a></p>`
              : ""
          }
        </div>
      `.trim();

      // Do not set replyTo to user's email before confirmation (privacy).
      try {
        await sendEmail({
          to: coach.email,
          subject,
          text,
          html,
        });
      } catch (e) {
        console.error("Coach booking email failed:", e instanceof Error ? e.message : String(e));
        // Booking should still succeed even if notification fails.
      }
    }

    return NextResponse.json(
      {
        bookingId: booking.id,
        status: booking.status,
        createdAt: booking.created_at instanceof Date ? booking.created_at.toISOString() : String(booking.created_at),
        coach,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message || "Internal server error" }, { status: 500 });
  }
}

function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

