import crypto from "node:crypto";
import { describe, expect, it } from "vitest";
import { GET as billingStatus } from "@/app/api/billing/status/route";
import { POST as webhook } from "@/app/api/billing/webhook/route";
import { asHandler, call, newUser } from "./helpers";

const SECRET = "integration-webhook-secret";

function sign(raw: string, secret = SECRET) {
  return crypto.createHmac("sha256", secret).update(raw).digest("hex");
}

function postWebhook(payload: unknown, signature?: string) {
  const raw = JSON.stringify(payload);
  return call(asHandler(webhook), {
    method: "POST",
    path: "/api/billing/webhook",
    rawBody: raw,
    headers: { "x-razorpay-signature": signature ?? sign(raw), "content-type": "application/json" },
    csrf: false,
  });
}

function subscriptionEvent(event: string, userId: number, subId: string, status: string, currentEnd: number) {
  return {
    event,
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
    const days = (new Date(r.body.trial_end).getTime() - Date.now()) / 86400000;
    expect(days).toBeGreaterThan(6.9);
    expect(days).toBeLessThanOrEqual(7);
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

  it("applies events in arrival order: a late older event overwrites a newer status (current behaviour)", async () => {
    const { id } = await newUser("bill");
    const end = Math.floor(Date.now() / 1000) + 30 * 86400;
    await postWebhook(subscriptionEvent("subscription.activated", id, `sub_o${id}`, "active", end));
    await postWebhook(subscriptionEvent("subscription.authenticated", id, `sub_o${id}`, "authenticated", end));
    // Audit P1-7: no event ordering/idempotency, so premium is lost here.
    expect((await status(id)).body).toMatchObject({ premium: false, status: "authenticated" });
  });
});
