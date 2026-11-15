import crypto from "node:crypto";
import { describe, expect, it } from "vitest";
import { Client } from "pg";
import { GET as billingStatus } from "@/app/api/billing/status/route";
import { POST as webhook } from "@/app/api/billing/webhook/route";
import { asHandler, call, newUser } from "./helpers";

const SECRET = "integration-webhook-secret";

function sign(raw: string, secret = SECRET) {
  return crypto.createHmac("sha256", secret).update(raw).digest("hex");
}

function postWebhook(payload: unknown, signature?: string, eventId?: string) {
  const raw = JSON.stringify(payload);
  const headers: Record<string, string> = {
    "x-razorpay-signature": signature ?? sign(raw),
    "content-type": "application/json",
  };
  if (eventId) headers["x-razorpay-event-id"] = eventId;
  return call(asHandler(webhook), {
    method: "POST",
    path: "/api/billing/webhook",
    rawBody: raw,
    headers,
    csrf: false,
  });
}

const nowSeconds = () => Math.floor(Date.now() / 1000);

function subscriptionEvent(
  event: string,
  userId: number,
  subId: string,
  status: string,
  currentEnd: number,
  createdAt = nowSeconds(),
) {
  return {
    event,
    created_at: createdAt,
    payload: {
      subscription: {
        entity: {
          id: subId,
          plan_id: "plan_test",
          status,
          current_start: currentEnd - 30 * 86400,
          current_end: currentEnd,
          notes: { userId: String(userId) },
        },
      },
    },
  };
}

const status = (userId: number) => call(asHandler(billingStatus), { path: "/api/billing/status", userId });

describe("GET /api/billing/status", () => {
  it("gives a new user a 7-day analytics trial and no premium", async () => {
    const { id } = await newUser("bill");
    const r = await status(id);
    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({
      premium: false,
      access: true,
      trial_active: true,
      status: null,
      subscription_id: null,
      current_end: null,
    });
    // Compare with the trial start the database recorded (not Node's clock, which
    // can drift from the database container's clock).
    const db = new Client({ connectionString: process.env.POSTGRES_URL });
    await db.connect();
    const trialStart: Date = (await db.query("SELECT analytics_trial_start FROM users WHERE id = $1", [id])).rows[0]
      .analytics_trial_start;
    await db.end();
    const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
    expect(new Date(r.body.trial_end).getTime() - trialStart.getTime()).toBe(SEVEN_DAYS_MS);
  });

  it("requires a session", async () => {
    expect((await call(asHandler(billingStatus), { path: "/api/billing/status" })).status).toBe(401);
  });
});

describe("POST /api/billing/webhook", () => {
  it("rejects a bad or missing signature with 401", async () => {
    const payload = { event: "subscription.activated" };
    expect((await postWebhook(payload, "deadbeef")).status).toBe(401);
    expect((await postWebhook(payload, sign(JSON.stringify(payload), "wrong-secret"))).status).toBe(401);
  });

  it("acknowledges but ignores events without a subscription id", async () => {
    const r = await postWebhook({ event: "payment.captured", payload: { payment: { entity: { id: "pay_1" } } } });
    expect(r).toMatchObject({ status: 200, body: { ok: true, ignored: true } });
  });

  it("activates premium from a signed subscription event", async () => {
    const { id } = await newUser("bill");
    const end = Math.floor(Date.now() / 1000) + 30 * 86400;
    const r = await postWebhook(subscriptionEvent("subscription.activated", id, `sub_${id}`, "active", end));
    expect(r).toMatchObject({ status: 200, body: { ok: true } });

    const s = await status(id);
    expect(s.body).toMatchObject({ premium: true, access: true, status: "active", subscription_id: `sub_${id}` });
  });

  it("keeps premium for a cancelled subscription until current_end, then drops it", async () => {
    const future = await newUser("bill");
    const past = await newUser("bill");
    const now = Math.floor(Date.now() / 1000);
    await postWebhook(subscriptionEvent("subscription.cancelled", future.id, `sub_f${future.id}`, "cancelled", now + 86400));
    await postWebhook(subscriptionEvent("subscription.cancelled", past.id, `sub_p${past.id}`, "cancelled", now - 86400));

    expect((await status(future.id)).body.premium).toBe(true);
    expect((await status(past.id)).body.premium).toBe(false);
  });

  it("ignores an event that is older than the last one applied (out-of-order delivery)", async () => {
    const { id } = await newUser("bill");
    const end = nowSeconds() + 30 * 86400;
    const activatedAt = nowSeconds();
    await postWebhook(subscriptionEvent("subscription.activated", id, `sub_o${id}`, "active", end, activatedAt));
    const lateOlderEvent = await postWebhook(
      subscriptionEvent("subscription.authenticated", id, `sub_o${id}`, "authenticated", end, activatedAt - 60),
    );

    expect(lateOlderEvent).toMatchObject({ status: 200, body: { ok: true } });
    expect((await status(id)).body).toMatchObject({ premium: true, status: "active" });
  });

  it("still applies a newer event (e.g. a later cancellation)", async () => {
    const { id } = await newUser("bill");
    const now = nowSeconds();
    await postWebhook(subscriptionEvent("subscription.activated", id, `sub_n${id}`, "active", now + 86400, now - 120));
    await postWebhook(subscriptionEvent("subscription.halted", id, `sub_n${id}`, "halted", now + 86400, now));
    expect((await status(id)).body).toMatchObject({ premium: false, status: "halted" });
  });

  it("acknowledges a redelivered event (same x-razorpay-event-id) without processing it again", async () => {
    const { id } = await newUser("bill");
    const subscriptionId = `sub_d${id}`;
    const activated = subscriptionEvent("subscription.activated", id, subscriptionId, "active", nowSeconds() + 86400);
    expect((await postWebhook(activated, undefined, `evt_${id}`)).body).toEqual({ ok: true });

    // Simulate a later, legitimate state change recorded by another event.
    const db = new Client({ connectionString: process.env.POSTGRES_URL });
    await db.connect();
    await db.query("UPDATE subscriptions SET status = 'cancelled', current_end = now() - interval '1 day' WHERE subscription_id = $1", [subscriptionId]);
    await db.end();

    const redelivery = await postWebhook(activated, undefined, `evt_${id}`);
    expect(redelivery).toMatchObject({ status: 200, body: { ok: true, duplicate: true } });
    expect((await status(id)).body).toMatchObject({ premium: false, status: "cancelled" });
  });
});
