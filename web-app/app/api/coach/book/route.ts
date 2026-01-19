import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import {
  createCoachBooking,
  getApprovedCoachPublicById,
  getPremiumStatus,
  initializeDatabase,
} from "@/lib/db";
import { HARD_CODED_COACH } from "@/lib/coach";
import { rateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { sendEmail } from "@/lib/email";

export const runtime = "nodejs";

const BodySchema = z.object({
  userName: z.string().min(2).max(80),
  userEmail: z.string().email(),
  userPhone: z.string().min(7).max(20),
  coachId: z.coerce.number().int().positive().optional().nullable(),
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
    {
      const preferred =
        body.preferredAt != null
          ? new Date(body.preferredAt).toLocaleString()
          : "Not specified";
      const appBase = (process.env.APP_BASE_URL || "").replace(/\/+$/, "");
      const adminLink = appBase ? `${appBase}/admin/coach-bookings` : "";

      const subject = `New coach booking request #${booking.id}`;
      const text = [
        `A new Personal Coach booking request was created.`,
        ``,
        `Booking ID: ${booking.id}`,
        `User ID: ${session.userId}`,
        `User Name: ${body.userName}`,
        `User Email: ${body.userEmail}`,
        `User Phone: ${body.userPhone}`,
        `Preferred time: ${preferred}`,
        body.message ? `Message: ${body.message}` : `Message: (none)`,
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
            <tr><td style="padding: 6px 0; color:#64748b;">Email</td><td style="padding: 6px 0;"><a href="mailto:${encodeURIComponent(body.userEmail)}">${escapeHtml(body.userEmail)}</a></td></tr>
            <tr><td style="padding: 6px 0; color:#64748b;">Phone</td><td style="padding: 6px 0;"><a href="tel:${escapeHtml(body.userPhone)}">${escapeHtml(body.userPhone)}</a></td></tr>
            <tr><td style="padding: 6px 0; color:#64748b;">Preferred time</td><td style="padding: 6px 0;">${escapeHtml(preferred)}</td></tr>
          </table>
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

      await sendEmail({
        to: coach.email,
        subject,
        text,
        html,
        replyTo: body.userEmail,
      });
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

