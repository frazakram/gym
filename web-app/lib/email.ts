import nodemailer from "nodemailer";

function required(name: string): string {
  const v = process.env[name];
  if (!v || !v.trim()) throw new Error(`${name} is not set`);
  return v.trim();
}

function intEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  const n = raw ? Number(raw) : NaN;
  return Number.isFinite(n) ? Math.floor(n) : fallback;
}

export type SendEmailInput = {
  to: string;
  subject: string;
  text: string;
  html?: string;
  replyTo?: string;
};

/**
 * SMTP email sender.
 *
 * Required env:
 * - SMTP_HOST
 * - SMTP_PORT (default: 587)
 * - SMTP_USER
 * - SMTP_PASS
 * - SMTP_FROM (e.g. "GymBro AI <no-reply@yourdomain.com>")
 *
 * Optional:
 * - SMTP_SECURE=true (for 465)
 */
export async function sendEmail(input: SendEmailInput): Promise<void> {
  const host = required("SMTP_HOST");
  const port = intEnv("SMTP_PORT", 587);
  const secure = String(process.env.SMTP_SECURE || "").toLowerCase() === "true";
  const user = required("SMTP_USER");
  const pass = required("SMTP_PASS");
  const from = required("SMTP_FROM");

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });

  await transporter.sendMail({
    from,
    to: input.to,
    subject: input.subject,
    text: input.text,
    html: input.html,
    replyTo: input.replyTo,
  });
}

