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

### 4) Local dev example (DO NOT COMMIT)

```
JWT_SECRET=your_random_hex
GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_client_secret
RAZORPAY_KEY_ID=rzp_test_...
RAZORPAY_KEY_SECRET=...
RAZORPAY_PLAN_ID_ANALYTICS_MONTHLY=plan_...
RAZORPAY_WEBHOOK_SECRET=...
```


