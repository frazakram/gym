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

### 3.1) Razorpay (Premium subscriptions: ₹49/month)

To enable Premium Analytics payments, set:

- `RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`
- `RAZORPAY_PLAN_ID_ANALYTICS_MONTHLY` (create a ₹49/month plan in Razorpay dashboard, then paste its `plan_...` id)
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

### 3.4) Personal Coach booking (email notifications)

To notify the coach by email when a user books a session, configure SMTP.

Required:

- `SMTP_HOST`
- `SMTP_PORT` (default: 587; use 465 for Gmail SSL)
- `SMTP_SECURE` (`true` for port 465; otherwise omit/false)
- `SMTP_USER`
- `SMTP_PASS`
- `SMTP_FROM` (example: `GymBro AI <no-reply@yourdomain.com>`)

Optional:

- `APP_BASE_URL` (example: `https://YOUR_DOMAIN`) — used to include an admin link inside the email.

**Gmail example** (recommended for quick setup):
- Set `SMTP_HOST=smtp.gmail.com`
- Set `SMTP_PORT=465`
- Set `SMTP_SECURE=true`
- `SMTP_USER=your_gmail@gmail.com`
- `SMTP_PASS=your_gmail_app_password` (create an “App Password” in Google Account security)
- `SMTP_FROM=GymBro AI <your_gmail@gmail.com>`

### 3.5) Admin access (manage bookings inside the app)

Admin routes are protected server-side. Configure who is admin using ONE of:

- `ADMIN_USER_IDS` (recommended): comma-separated numeric IDs, e.g. `ADMIN_USER_IDS=1,2`
- `ADMIN_USER_ID`: single numeric ID, e.g. `ADMIN_USER_ID=1`
- `ADMIN_USERNAMES` (fallback): comma-separated usernames, e.g. `ADMIN_USERNAMES=admin,harshit`

### 3.6) Nutrition tracking (photo / barcode / search food logging)

The nutrition module uses two providers:

- **Open Food Facts** — food search + barcode lookup. **No key required.** It asks
  clients to send an identifying User-Agent and enforces per-IP rate limits
  (~15 product reads/min, ~10 searches/min). The app rate-limits per user and
  caches results in Redis (when configured) to stay within these limits.
  - `OFF_USER_AGENT` (optional): `YourApp/1.0 (contact@example.com)`
- **Photo meal recognition** runs through this engine priority:
  1. **LogMeal** if `LOGMEAL_API_KEY` is set (optional, paid — APIUser token from
     https://logmeal.com/api/, 30-day free trial; override base with `LOGMEAL_BASE_URL`).
  2. **OpenAI vision** using your existing `OPENAI_API_KEY` — the default engine.
     High quality (handles Indian dishes), no extra signup; costs a small amount
     of OpenAI usage per photo. Override the model with `OPENAI_VISION_MODEL`
     (default `gpt-4o`).
  3. **Manual search** fallback when neither key is present or recognition fails.

  So photo logging works out of the box as long as `OPENAI_API_KEY` is set.

Photos are sent to LogMeal **only transiently** for parsing and are **not stored**
server-side. Recognized meals are returned as an editable draft and are never
auto-logged without explicit user confirmation.

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
RATE_LIMIT_COACH_BOOK_PER_DAY=3
RATE_LIMIT_COACH_BOOK_PER_MINUTE=1
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=your_gmail@gmail.com
SMTP_PASS=your_app_password
SMTP_FROM=GymBro AI <your_gmail@gmail.com>
APP_BASE_URL=http://localhost:3000
ADMIN_USER_IDS=1
LOGMEAL_API_KEY=your_logmeal_apiuser_token
OFF_USER_AGENT=GymBroAI/1.0 (you@example.com)
```


