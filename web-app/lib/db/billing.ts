// Premium status and Razorpay subscriptions.
import { MOCK_USER_ID, allowMockAuth, pool } from './core';

// ============= BILLING / SUBSCRIPTIONS (PREMIUM) =============

export type PremiumStatus = {
  /** Paid subscription active (or cancelled but still within current_end) */
  premium: boolean;
  /** Access to analytics (paid OR trial) */
  access: boolean;
  /** 7-day trial is currently active */
  trial_active: boolean;
  /** Trial end timestamp (if known) */
  trial_end: Date | null;
  status: string | null;
  subscription_id: string | null;
  current_end: Date | null;
};

export async function getPremiumStatus(userId: number): Promise<PremiumStatus> {
  // Check if PREMIUM environment variable is set to "true" - grants premium to everyone
  const premiumEnvEnabled = process.env.PREMIUM === "true";
  if (premiumEnvEnabled) {
    // Grant premium access to everyone when PREMIUM=true
    // Set current_end far in the future (10 years) so premium lasts as long as env var is set
    const farFuture = new Date(Date.now() + 10 * 365 * 24 * 60 * 60 * 1000);
    return {
      premium: true,
      access: true,
      trial_active: false, // Not a trial, it's full premium
      trial_end: null,
      status: "active",
      subscription_id: "env_premium",
      current_end: farFuture,
    };
  }

  try {
    const res = await pool.query(
      `SELECT subscription_id, status, current_end
       FROM subscriptions
       WHERE user_id = $1
       ORDER BY updated_at DESC
       LIMIT 1`,
      [userId]
    );

    const row = res.rows?.[0] as { subscription_id?: string; status?: string; current_end?: Date | string } | undefined;
    const status = typeof row?.status === "string" ? row.status : null;
    const subscription_id = typeof row?.subscription_id === "string" ? row.subscription_id : null;
    const current_end_raw = row?.current_end ?? null;
    const current_end =
      current_end_raw instanceof Date
        ? current_end_raw
        : typeof current_end_raw === "string"
          ? new Date(current_end_raw)
          : null;

    const now = Date.now();
    const currentEndOk = current_end ? current_end.getTime() > now : false;
    const premium = status === "active" || (status === "cancelled" && currentEndOk);

    // 7-day free trial (persisted).
    // - New users: analytics_trial_start defaults to created time.
    // - Existing users: first time we check status, we set analytics_trial_start = NOW to grant a one-time 7-day trial.
    let trial_end: Date | null = null;
    let trial_active = false;
    try {
      const u = await pool.query<{ analytics_trial_start?: Date | string | null }>(
        `SELECT analytics_trial_start FROM users WHERE id = $1 LIMIT 1`,
        [userId]
      );
      let trial_start_raw = u.rows?.[0]?.analytics_trial_start ?? null;
      if (trial_start_raw == null) {
        // Initialize for existing users
        const upd = await pool.query<{ analytics_trial_start?: Date | string | null }>(
          `UPDATE users SET analytics_trial_start = CURRENT_TIMESTAMP WHERE id = $1 RETURNING analytics_trial_start`,
          [userId]
        );
        trial_start_raw = upd.rows?.[0]?.analytics_trial_start ?? null;
      }
      const trial_start =
        trial_start_raw instanceof Date
          ? trial_start_raw
          : typeof trial_start_raw === 'string'
            ? new Date(trial_start_raw)
            : null;
      if (trial_start && !Number.isNaN(trial_start.getTime())) {
        trial_end = new Date(trial_start.getTime() + 7 * 24 * 60 * 60 * 1000);
        trial_active = trial_end.getTime() > now;
      }
    } catch {
      // If we can't read/write trial_start, treat trial as inactive.
    }

    const access = premium || trial_active;

    return { premium, access, trial_active, trial_end, status, subscription_id, current_end };
  } catch (error) {
    console.error("getPremiumStatus DB failed:", error);
    return {
      premium: false,
      access: false,
      trial_active: false,
      trial_end: null,
      status: null,
      subscription_id: null,
      current_end: null,
    };
  }
}

/** True if this Razorpay webhook event id was already processed successfully. */
export async function hasProcessedRazorpayEvent(eventId: string): Promise<boolean> {
  const result = await pool.query('SELECT 1 FROM razorpay_webhook_events WHERE event_id = $1', [eventId]);
  return result.rows.length > 0;
}

/** Records a successfully processed Razorpay webhook event (idempotent). */
export async function recordProcessedRazorpayEvent(input: {
  eventId: string;
  event: string;
  subscriptionId: string | null;
}): Promise<void> {
  await pool.query(
    `INSERT INTO razorpay_webhook_events (event_id, event, subscription_id)
     VALUES ($1, $2, $3)
     ON CONFLICT (event_id) DO NOTHING`,
    [input.eventId, input.event, input.subscriptionId]
  );
}

export async function upsertSubscriptionFromRazorpay(input: {
  userId: number | null;
  provider: "razorpay";
  planId?: string | null;
  subscriptionId: string;
  status: string;
  currentStart?: number | null; // unix seconds
  currentEnd?: number | null; // unix seconds
  /** Webhook event creation time (unix seconds). Older events than the last applied one are ignored. */
  eventCreatedAt?: number | null;
}): Promise<void> {
  // Never try to save mock user subscriptions to the real DB
  if (input.userId === MOCK_USER_ID && allowMockAuth()) {
    console.log("Mock Mode: Skipping DB save for mock user subscription");
    return;
  }

  try {
    const start = typeof input.currentStart === "number" ? new Date(input.currentStart * 1000) : null;
    const end = typeof input.currentEnd === "number" ? new Date(input.currentEnd * 1000) : null;
    const eventAt = typeof input.eventCreatedAt === "number" ? new Date(input.eventCreatedAt * 1000) : null;

    // An update without an event time (e.g. subscription creation) always applies;
    // an event only applies if it is not older than the last applied event.
    if (input.userId == null) {
      await pool.query(
        `UPDATE subscriptions
         SET status = $2, plan_id = COALESCE($3, plan_id), current_start = COALESCE($4, current_start), current_end = COALESCE($5, current_end),
             last_event_at = COALESCE($6, last_event_at),
             updated_at = CURRENT_TIMESTAMP
         WHERE subscription_id = $1
           AND ($6::timestamptz IS NULL OR last_event_at IS NULL OR last_event_at <= $6::timestamptz)`,
        [input.subscriptionId, input.status, input.planId ?? null, start, end, eventAt]
      );
      return;
    }

    await pool.query(
      `INSERT INTO subscriptions (user_id, provider, plan_id, subscription_id, status, current_start, current_end, last_event_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (subscription_id) DO UPDATE
       SET user_id = EXCLUDED.user_id,
           plan_id = COALESCE(EXCLUDED.plan_id, subscriptions.plan_id),
           status = EXCLUDED.status,
           current_start = COALESCE(EXCLUDED.current_start, subscriptions.current_start),
           current_end = COALESCE(EXCLUDED.current_end, subscriptions.current_end),
           last_event_at = COALESCE(EXCLUDED.last_event_at, subscriptions.last_event_at),
           updated_at = CURRENT_TIMESTAMP
       WHERE EXCLUDED.last_event_at IS NULL
          OR subscriptions.last_event_at IS NULL
          OR subscriptions.last_event_at <= EXCLUDED.last_event_at`,
      [input.userId, input.provider, input.planId ?? null, input.subscriptionId, input.status, start, end, eventAt]
    );
  } catch (error) {
    console.error("upsertSubscriptionFromRazorpay DB failed:", error);
    throw error;
  }
}
