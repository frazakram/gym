import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { isAdminUser } from "@/lib/admin";
import { initializeDatabase, getCoachBookingByIdAdmin, updateCoachBookingStatusAdmin } from "@/lib/db";
import { sendEmail } from "@/lib/email";

export const runtime = "nodejs";

const BodySchema = z.object({
  status: z.enum(["pending", "confirmed", "cancelled", "completed"]),
});

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const ok = await isAdminUser(session.userId);
    if (!ok) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { id } = await ctx.params;
    const bookingId = Math.floor(Number(id));
    if (!Number.isFinite(bookingId) || bookingId <= 0) {
      return NextResponse.json({ error: "Invalid booking id" }, { status: 400 });
    }

    const raw = await req.json().catch(() => ({}));
    const body = BodySchema.parse(raw);

    await initializeDatabase();
    const updated = await updateCoachBookingStatusAdmin({ id: bookingId, status: body.status });
    if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // If booking is confirmed, share contact details with coach + notify user.
    if (body.status === "confirmed") {
      const b = await getCoachBookingByIdAdmin(bookingId);
      if (b && b.coach_email) {
        const preferred = b.preferred_at ? b.preferred_at.toLocaleString() : "Not specified";
        const appBase = (process.env.APP_BASE_URL || "").replace(/\/+$/, "");
        const adminLink = appBase ? `${appBase}/admin/coach-bookings` : "";

        const coachText = [
          `Booking confirmed.`,
          ``,
          `Booking ID: ${b.id}`,
          `Preferred time: ${preferred}`,
          b.message ? `Message: ${b.message}` : `Message: (none)`,
          ``,
          `User Name: ${b.user_name || "(not provided)"}`,
          `User Email: ${b.user_email || "(not provided)"}`,
          `User Phone: ${b.user_phone || "(not provided)"}`,
          adminLink ? `` : ``,
          adminLink ? `Admin page: ${adminLink}` : ``,
        ]
          .filter(Boolean)
          .join("\n");

        const coachHtml = `
          <div style="font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial; line-height: 1.5;">
            <h2 style="margin:0 0 12px;">Booking confirmed</h2>
            <p style="margin:0 0 12px;">Here are the user contact details for the confirmed booking.</p>
            <table style="border-collapse: collapse; width: 100%; max-width: 640px;">
              <tr><td style="padding: 6px 0; color:#64748b;">Booking ID</td><td style="padding: 6px 0;"><b>#${b.id}</b></td></tr>
              <tr><td style="padding: 6px 0; color:#64748b;">Preferred time</td><td style="padding: 6px 0;">${escapeHtml(preferred)}</td></tr>
              <tr><td style="padding: 6px 0; color:#64748b;">User Name</td><td style="padding: 6px 0;">${escapeHtml(b.user_name || "")}</td></tr>
              <tr><td style="padding: 6px 0; color:#64748b;">User Email</td><td style="padding: 6px 0;"><a href="mailto:${encodeURIComponent(b.user_email || "")}">${escapeHtml(b.user_email || "")}</a></td></tr>
              <tr><td style="padding: 6px 0; color:#64748b;">User Phone</td><td style="padding: 6px 0;"><a href="tel:${escapeHtml(b.user_phone || "")}">${escapeHtml(b.user_phone || "")}</a></td></tr>
            </table>
            ${
              b.message
                ? `<div style="margin-top:12px;"><div style="color:#64748b; font-size:12px;">Message</div><div style="white-space:pre-wrap; background:#0b1220; color:#e2e8f0; border:1px solid rgba(255,255,255,0.08); padding:12px; border-radius:12px;">${escapeHtml(
                    b.message
                  )}</div></div>`
                : ""
            }
            ${adminLink ? `<p style="margin-top:16px;"><a href="${adminLink}">Open Admin Coach Bookings</a></p>` : ""}
          </div>
        `.trim();

        try {
          await sendEmail({
            to: b.coach_email,
            subject: `Booking confirmed #${b.id}`,
            text: coachText,
            html: coachHtml,
            replyTo: b.user_email || undefined,
          });
        } catch (e) {
          console.error("Coach confirmation email failed:", e instanceof Error ? e.message : String(e));
        }
      }

      // Notify user (if email available)
      if (b?.user_email) {
        const preferred = b.preferred_at ? b.preferred_at.toLocaleString() : "Not specified";
        const userText = [
          `Your coach booking has been confirmed.`,
          ``,
          `Booking ID: ${b.id}`,
          `Coach: ${b.coach_name}`,
          `Coach Phone: ${b.coach_phone}`,
          `Coach Email: ${b.coach_email}`,
          `Preferred time: ${preferred}`,
        ].join("\n");

        const userHtml = `
          <div style="font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial; line-height: 1.5;">
            <h2 style="margin:0 0 12px;">Booking confirmed</h2>
            <p style="margin:0 0 12px;">Your booking is confirmed. Here are your coach details:</p>
            <table style="border-collapse: collapse; width: 100%; max-width: 640px;">
              <tr><td style="padding: 6px 0; color:#64748b;">Booking ID</td><td style="padding: 6px 0;"><b>#${b.id}</b></td></tr>
              <tr><td style="padding: 6px 0; color:#64748b;">Coach</td><td style="padding: 6px 0;">${escapeHtml(b.coach_name)}</td></tr>
              <tr><td style="padding: 6px 0; color:#64748b;">Coach Email</td><td style="padding: 6px 0;"><a href="mailto:${encodeURIComponent(b.coach_email)}">${escapeHtml(b.coach_email)}</a></td></tr>
              <tr><td style="padding: 6px 0; color:#64748b;">Coach Phone</td><td style="padding: 6px 0;"><a href="tel:${escapeHtml(b.coach_phone)}">${escapeHtml(b.coach_phone)}</a></td></tr>
              <tr><td style="padding: 6px 0; color:#64748b;">Preferred time</td><td style="padding: 6px 0;">${escapeHtml(preferred)}</td></tr>
            </table>
          </div>
        `.trim();

        try {
          await sendEmail({
            to: b.user_email,
            subject: `Your coach booking is confirmed (#${b.id})`,
            text: userText,
            html: userHtml,
          });
        } catch (e) {
          console.error("User confirmation email failed:", e instanceof Error ? e.message : String(e));
        }
      }
    }

    return NextResponse.json({ ok: true }, { status: 200 });
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

