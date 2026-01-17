## Environment setup (local + production)

### 1) JWT secret (required)

Generate a random secret:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Set it as:

- `JWT_SECRET`

### 2) Google Sign-In (optional, enables “Sign in with Google”)

Set:

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`

Authorized redirect URIs in Google Cloud:

- `http://localhost:3000/api/auth/google/callback`
- `https://YOUR_DOMAIN/api/auth/google/callback`

### 3) Where to set env vars

- **Local dev**: create `gym/web-app/.env.local`
- **Vercel**: Project → Settings → Environment Variables

### 3.1) Razorpay (Premium subscriptions: ₹1/month)

To enable Premium Analytics payments, set:

- `RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`
- `RAZORPAY_PLAN_ID_ANALYTICS_MONTHLY` (create a ₹1/month plan in Razorpay dashboard, then paste its `plan_...` id)
- `RAZORPAY_WEBHOOK_SECRET` (from Razorpay webhook settings)

Webhook URL to configure in Razorpay:

- `https://YOUR_DOMAIN/api/billing/webhook`

### 3.2) Redis (optional, improves caching)

This project can optionally use **Upstash Redis** to cache small server responses (e.g. `/api/billing/status`) to reduce DB load and make the UI feel faster.

Set (from your Upstash Redis database “REST API” credentials):

- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`

Notes:
- If these env vars are **not set**, the app works normally (no Redis caching).
- Billing status is cached for a short TTL (~60s) and is invalidated on webhook/subscription updates.

### 3.3) Rate limiting (optional, requires Redis)

If Redis is configured, AI-heavy routes are rate-limited per-user to prevent accidental credit burn.
You can override defaults with:

- `RATE_LIMIT_ROUTINE_PER_HOUR` (default: 6)
- `RATE_LIMIT_ROUTINE_PER_MINUTE` (default: 2)
- `RATE_LIMIT_DIET_PER_HOUR` (default: 6)
- `RATE_LIMIT_DIET_PER_MINUTE` (default: 2)
- `RATE_LIMIT_NOTES_PER_HOUR` (default: 30)
- `RATE_LIMIT_NOTES_PER_MINUTE` (default: 10)
- `RATE_LIMIT_AUTH_PER_MINUTE_PER_IP` (default: 10)

### 4) Local dev example (DO NOT COMMIT)

```
JWT_SECRET=your_random_hex
GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_client_secret
RAZORPAY_KEY_ID=rzp_test_...
RAZORPAY_KEY_SECRET=...
RAZORPAY_PLAN_ID_ANALYTICS_MONTHLY=plan_...
RAZORPAY_WEBHOOK_SECRET=...
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...
RATE_LIMIT_ROUTINE_PER_HOUR=6
RATE_LIMIT_ROUTINE_PER_MINUTE=2
RATE_LIMIT_DIET_PER_HOUR=6
RATE_LIMIT_DIET_PER_MINUTE=2
RATE_LIMIT_NOTES_PER_HOUR=30
RATE_LIMIT_NOTES_PER_MINUTE=10
RATE_LIMIT_AUTH_PER_MINUTE_PER_IP=10
```


