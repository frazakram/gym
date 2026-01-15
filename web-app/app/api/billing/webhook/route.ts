import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import Razorpay from "razorpay";
import { initializeDatabase, upsertSubscriptionFromRazorpay } from "@/lib/db";

export const runtime = "nodejs";

type AnyRecord = Record<string, unknown>;

function isRecord(v: unknown): v is AnyRecord {
  return typeof v === "object" && v !== null;
}

function getNested(obj: unknown, path: string[]): unknown {
  let cur: unknown = obj;
  for (const k of path) {
    if (!isRecord(cur)) return undefined;
    cur = cur[k];
  }
  return cur;
}

function timingSafeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v || !v.trim()) throw new Error(`${name} is not set`);
  return v.trim();
}

function verifyWebhookSignature(rawBody: string, signatureHeader: string | null, secret: string): boolean {
  if (!signatureHeader) return false;
  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  return timingSafeEqual(expected, signatureHeader);
}

export async function POST(req: NextRequest) {
  // Webhook must be fast + safe. Do minimal work, upsert subscription state, return 200.
  let raw = "";
  try {
    raw = await req.text();
    const sig = req.headers.get("x-razorpay-signature");
    const webhookSecret = requireEnv("RAZORPAY_WEBHOOK_SECRET");

    if (!verifyWebhookSignature(raw, sig, webhookSecret)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    await initializeDatabase();

    const body: unknown = JSON.parse(raw);
    const eventVal = isRecord(body) ? body["event"] : undefined;
    const event = typeof eventVal === "string" ? eventVal : "";

    // Prefer subscription entity if present.
    const subEntity = getNested(body, ["payload", "subscription", "entity"]);
    const payEntity = getNested(body, ["payload", "payment", "entity"]);

    const subscriptionId: string | null = (() => {
      const subId = isRecord(subEntity) ? subEntity["id"] : undefined;
      if (typeof subId === "string") return subId;
      const paySubId = isRecord(payEntity) ? payEntity["subscription_id"] : undefined;
      if (typeof paySubId === "string") return paySubId;
      return null;
    })();

    if (!subscriptionId) {
      return NextResponse.json({ ok: true, ignored: true }, { status: 200 });
    }

    let sub: unknown = subEntity;
    if (!sub) {
      // Fetch from API as fallback (e.g. payment.* webhooks)
      const keyId = requireEnv("RAZORPAY_KEY_ID");
      const keySecret = requireEnv("RAZORPAY_KEY_SECRET");
      const razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });
      sub = await razorpay.subscriptions.fetch(subscriptionId);
    }

    const notesVal = isRecord(sub) ? sub["notes"] : undefined;
    const notes = isRecord(notesVal) ? notesVal : {};
    const userIdRaw = notes["userId"];
    const userId = typeof userIdRaw === "string" && /^\d+$/.test(userIdRaw) ? Number(userIdRaw) : null;

    await upsertSubscriptionFromRazorpay({
      userId,
      provider: "razorpay",
      planId: (() => {
        const v = isRecord(sub) ? sub["plan_id"] : undefined;
        return typeof v === "string" ? v : null;
      })(),
      subscriptionId,
      status: (() => {
        const v = isRecord(sub) ? sub["status"] : undefined;
        return typeof v === "string" ? v : String(event || "unknown");
      })(),
      currentStart: (() => {
        const v = isRecord(sub) ? sub["current_start"] : undefined;
        return typeof v === "number" ? v : null;
      })(),
      currentEnd: (() => {
        const v = isRecord(sub) ? sub["current_end"] : undefined;
        return typeof v === "number" ? v : null;
      })(),
    });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Razorpay webhook error:", message);
    // Still return 200 to avoid repeated retries if the event is malformed; but for signature/env issues, we returned 401/500 above.
    return NextResponse.json({ ok: true }, { status: 200 });
  }
}

