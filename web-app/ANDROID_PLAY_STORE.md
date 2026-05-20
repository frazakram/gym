# Publishing Gym Bro to the Google Play Store

This guide takes you from the APK you already built in Android Studio to a live
listing on Google Play. The app is a PWA (`public/manifest.json` → "Gym Bro -
AI Fitness Coach"), so the Android app is almost certainly a **TWA (Trusted Web
Activity)** wrapper. Steps below assume that; notes call out plain-WebView
differences.

> Fill in every `<PLACEHOLDER>` before you ship. Search this file for `<` to
> find them all.

| Placeholder | Example | Where to find it |
|---|---|---|
| `<PACKAGE_NAME>` | `ai.gymbro.app` | `applicationId` in `app/build.gradle` |
| `<PROD_DOMAIN>` | `gymbro.app` | Your Vercel custom domain (or `*.vercel.app`) |
| `<SHA256_FINGERPRINT>` | `AB:CD:…:EF` | From your signing key (see step 3) |

---

## 0. Pre-flight checklist

- [ ] Google Play Console account created (one-time **$25** fee) — https://play.google.com/console
- [ ] APK builds and runs on a physical device
- [ ] Production web app is live and reachable over HTTPS at `<PROD_DOMAIN>`
- [ ] `/privacy` and `/terms` pages are publicly reachable (they exist: `app/privacy`, `app/terms`)
- [ ] App name, icon, and screenshots ready (see section 5)

---

## 1. Build a release **AAB** (not APK)

Google Play requires an **Android App Bundle (`.aab`)**, not an APK, for new apps.
In Android Studio:

1. **Build → Generate Signed Bundle / APK**
2. Choose **Android App Bundle**
3. Create or select your **upload keystore** (see step 3 — do this first)
4. Build variant: **release**
5. Output: `app/release/app-release.aab`

CLI equivalent:

```bash
./gradlew bundleRelease
# → app/build/outputs/bundle/release/app-release.aab
```

---

## 2. App signing — the part you must not lose

Google Play uses **Play App Signing**. You upload with an *upload key*; Google
re-signs with the *app signing key* it holds.

1. Generate an upload keystore (once, keep forever):

   ```bash
   keytool -genkey -v -keystore upload-keystore.jks \
     -alias upload -keyalg RSA -keysize 2048 -validity 9125
   ```

2. **Back up `upload-keystore.jks` and its passwords offline.** Losing it means
   you can never update the app under the same listing.
3. Add to `gradle.properties` (do **not** commit — add to `.gitignore`):

   ```
   RELEASE_STORE_FILE=../upload-keystore.jks
   RELEASE_STORE_PASSWORD=<password>
   RELEASE_KEY_ALIAS=upload
   RELEASE_KEY_PASSWORD=<password>
   ```

---

## 3. Digital Asset Links (TWA only — required, app launches in a browser without it)

A TWA only runs full-screen (no browser address bar) if your domain proves it
trusts the app. This repo now includes the file to serve:

`public/.well-known/assetlinks.json`

Steps:

1. Get your app's SHA-256 signing certificate fingerprint. **Use the one Google
   shows you** under *Play Console → Your app → Setup → App signing* after your
   first upload (that's the real signing key). For local testing use:

   ```bash
   keytool -list -v -keystore upload-keystore.jks -alias upload
   ```

2. Put that value in `public/.well-known/assetlinks.json` (replace
   `<SHA256_FINGERPRINT>` and `<PACKAGE_NAME>`).
3. Deploy. Verify it is live and JSON:

   ```bash
   curl -s https://<PROD_DOMAIN>/.well-known/assetlinks.json
   ```

   Next.js serves anything in `public/` at the site root, so this needs no
   route or config — just deploy.
4. Confirm with Google's tester:
   `https://digitalassetlinks.googleapis.com/v1/statements:list?source.web.site=https://<PROD_DOMAIN>&relation=delegate_permission/common.handle_all_urls`

---

## 4. Create the app in Play Console

1. **Create app** → name `Gym Bro`, language, **App**, **Free**.
2. Complete **Dashboard → Set up your app**:
   - **App access**: provide test login credentials (the app requires auth).
     Create a demo account or point them at `/demo` (no auth) and explain it in
     the notes.
   - **Ads**: declare whether the app shows ads (No, unless you add them).
   - **Content rating**: fill the IARC questionnaire (fitness app → typically
     "Everyone").
   - **Target audience**: 18+ recommended (or 13+; avoid <13 to skip strict
     Families policy).
   - **Data safety**: see section 6 — this is the most error-prone form.
   - **Government apps / Financial features**: declare Razorpay subscriptions if
     asked (in-app purchases via web are allowed for a TWA, but disclose them).
   - **Privacy policy URL**: `https://<PROD_DOMAIN>/privacy`

---

## 5. Store listing assets (create these — specs below)

Put source files in `web-app/play-store/assets/`. Required by Google:

| Asset | Spec | Notes |
|---|---|---|
| App icon | 512×512 PNG, 32-bit, <1 MB | Derive from `public/logo.png` |
| Feature graphic | 1024×500 PNG/JPG, no alpha | Banner shown at top of listing |
| Phone screenshots | 2–8 images, 16:9 or 9:16, min 320 px, max 3840 px | Use `public/dashboard-screenshot.png` + capture more |
| 7" tablet screenshots | optional but recommended | |
| Short description | ≤ 80 chars | See `play-store/store-listing.md` |
| Full description | ≤ 4000 chars | See `play-store/store-listing.md` |

Drafted listing copy is in **`web-app/play-store/store-listing.md`**.

---

## 6. Data Safety form (declare honestly — this app collects a lot)

Based on the codebase, declare at minimum:

| Data type | Collected | Shared | Why |
|---|---|---|---|
| Email address | Yes | No | Account / auth (`lib/auth.ts`) |
| Name / username | Yes | No | Profile |
| Photos | Yes | No | Body & gym photo analysis (`body/analyze`, `gym/analyze`) — sent to AI provider |
| Health & fitness info | Yes | No | Workouts, measurements, diet |
| Purchase history | Yes | No | Razorpay subscription state |
| App interactions / analytics | Yes | No | Usage analytics |

- **Data is encrypted in transit**: Yes (HTTPS).
- **Encryption at rest**: Yes if `DB_ENCRYPTION_KEY` is set (`lib/fieldEncryption.ts`); declare accordingly.
- **Users can request deletion**: provide a deletion path/URL. Google requires
  a working **account deletion** link if you collect accounts — add one or link
  to `/privacy` instructions.
- **Photos sent to third-party AI** (Anthropic/OpenAI): this is data processing
  by a service provider, not "shared" for ads — but your privacy policy must
  state it. Confirm `app/privacy/page.tsx` mentions AI processing of photos.

---

## 7. Release to a testing track first

1. **Testing → Internal testing → Create release**
2. Upload `app-release.aab`
3. Add testers by email, share the opt-in link, install from Play, verify:
   - App opens **without a browser URL bar** (proves Asset Links works)
   - Login, routine generation, photo upload, payments all work
4. Promote: **Internal → Closed → Open / Production**

---

## 8. Submit for production review

1. **Production → Create release** → upload AAB → release notes
2. **Send for review.** First review typically 1–7 days.
3. Watch **Policy status** for rejections (common: missing account-deletion,
   inaccurate Data Safety, broken test credentials).

---

## 9. Updating later

- Increment `versionCode` (integer, must go up) and `versionName` in
  `app/build.gradle` every release.
- Rebuild the AAB, sign with the **same upload key**, upload a new release.
- PWA content updates (anything served from `web-app/`) ship instantly on
  deploy with **no Play release needed** — only native shell changes require a
  new AAB.

---

## Quick reference: non-TWA (plain WebView) differences

- Skip section 3 (Asset Links) — a WebView app shows your site without it but
  Google scrutinizes "webview-only" apps; ensure it adds real value (offline,
  push, native integration) or it may be rejected under the **minimum
  functionality** policy. TWA is the recommended path for a PWA.
