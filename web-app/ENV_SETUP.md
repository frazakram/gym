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

### 4) Local dev example (DO NOT COMMIT)

```
JWT_SECRET=your_random_hex
GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_client_secret
```


