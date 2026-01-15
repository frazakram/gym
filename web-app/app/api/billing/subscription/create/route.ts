import { NextRequest, NextResponse } from "next/server";
import Razorpay from "razorpay";
import { getSession } from "@/lib/auth";
import { getPremiumStatus, initializeDatabase, upsertSubscriptionFromRazorpay } from "@/lib/db";

export const runtime = "nodejs";

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v || !v.trim()) throw new Error(`${name} is not set`);
  return v.trim();
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await initializeDatabase();

    const current = await getPremiumStatus(session.userId);
    if (current.premium) {
      return NextResponse.json(
        { error: "You already have an active subscription." },
        { status: 409 }
      );
    }

    const keyId = requireEnv("RAZORPAY_KEY_ID");
    const keySecret = requireEnv("RAZORPAY_KEY_SECRET");
    const planId = requireEnv("RAZORPAY_PLAN_ID_ANALYTICS_MONTHLY");

    const razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });

    // Notes let us map webhook events back to the correct user securely.
    void req; // (keeps signature stable; payload not needed)

    const params = {
      plan_id: planId,
      total_count: 1200, // ~100 years monthly (effectively "until cancel")
      quantity: 1,
      customer_notify: false,
      notes: {
        userId: String(session.userId),
        product: "analytics_pro",
        billing: "monthly",
      },
    };

    const subscription = await razorpay.subscriptions.create(
      params as unknown as Parameters<typeof razorpay.subscriptions.create>[0]
    );

    await upsertSubscriptionFromRazorpay({
      userId: session.userId,
      provider: "razorpay",
      planId,
      subscriptionId: subscription.id,
      status: subscription.status || "created",
      currentStart: subscription.current_start ?? null,
      currentEnd: subscription.current_end ?? null,
    });

    // Client uses keyId + subscriptionId to open Razorpay Checkout.
    return NextResponse.json(
      {
        keyId,
        subscriptionId: subscription.id,
        status: subscription.status,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Create subscription error:", message);
    return NextResponse.json({ error: message || "Internal server error" }, { status: 500 });
  }
}

