# Vercel Deployment Guide for Gym Bro

## Quick Start (3 Steps)

### 1. Install Vercel CLI
```bash
npm install -g vercel
```

### 2. Login to Vercel
```bash
vercel login
```

### 3. Deploy
```bash
cd /Users/ejaz/Desktop/new_pj/web-app
vercel --prod
```

That's it! Vercel will:
- Detect Next.js automatically
- Build and deploy your application
- Provide you with a live URL

---

## Complete Setup Guide

### Prerequisites
- [ ] Vercel account (sign up at https://vercel.com)
- [ ] GitHub repository (optional, but recommended)
- [ ] Anthropic or OpenAI API key (users enter in UI)

### Step 1: Set Up Database

1. **Create Vercel Postgres Database**
   ```bash
   # After first deployment, go to your project dashboard
   # Navigate to: Storage → Create Database → Select "Postgres"
   ```

2. **Automatic Configuration**
   - Vercel automatically sets up these environment variables:
     - `POSTGRES_URL`
     - `POSTGRES_PRISMA_URL`  
     - `POSTGRES_URL_NON_POOLING`

### Step 2: Configure Environment Variables

1. **In Vercel Dashboard**
   - Go to your project → Settings → Environment Variables
   
2. **Add Required Variables**
   ```
   JWT_SECRET = [Generate a random secure string]
   ```
   
   To generate a secure JWT secret:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
   ```

### Step 3: Deploy from GitHub (Recommended)

1. **Push to GitHub**
   ```bash
   cd /Users/ejaz/Desktop/new_pj
   git add web-app/
   git commit -m "Add Next.js web app for Vercel deployment"
   git push origin main
   ```

2. **Import on Vercel**
   - Go to https://vercel.com/new
   - Select your repository (`GYM_BRO`)
   - Root Directory: `web-app`
   - Framework Preset: Next.js (auto-detected)
   - Click "Deploy"

### Step 4: Post-Deployment

1. **Initialize Database**
   - Visit your deployed URL
   - The first request will automatically create database tables

2. **Test the Application**
   - Register a new account
   - Complete your profile
   - Enter an API key and generate a routine

---

## Deployment Options Comparison

### Option A: Vercel CLI (Fastest)
```bash
cd web-app
vercel --prod
```
**Pros**: Quick, simple
**Cons**: Manual process

### Option B: GitHub Integration (Recommended)
**Pros**: Auto-deploy on git push, preview deployments, rollbacks
**Cons**: Requires GitHub repo

### Option C: Vercel Dashboard
**Pros**: Visual interface
**Cons**: Slower for updates

---

## Environment Variables Reference

| Variable | Where to Set | Value |
|----------|--------------|-------|
| `POSTGRES_URL` | Auto-set by Vercel | Vercel Postgres connection string |
| `POSTGRES_PRISMA_URL` | Auto-set by Vercel | Prisma-compatible URL |
| `POSTGRES_URL_NON_POOLING` | Auto-set by Vercel | Direct connection URL |
| `JWT_SECRET` | Manual in dashboard | Random secure string |

**Note**: API keys (Anthropic/OpenAI) are entered by users in the UI, NOT stored as environment variables.

---

## Monitoring & Troubleshooting

### Check Deployment Status
```bash
vercel ls
```

### View Logs
```bash
vercel logs [deployment-url]
```

### Common Issues

#### Build Failed
```bash
# Test build locally first
npm run build

# Check for TypeScript errors
npm run lint
```

#### Database Connection Error
- Ensure Postgres database is created in Vercel
- Check environment variables are properly set
- Visit Vercel dashboard → Storage → Your Database → Connect

#### JWT/Session Issues
- Verify `JWT_SECRET` is set in environment variables
- Regenerate secret if needed

---

## Custom Domain (Optional)

1. Go to Vercel dashboard → Your Project → Settings → Domains
2. Add your custom domain
3. Follow DNS configuration instructions

---

## Cost Estimate

**Vercel Free Tier Includes:**
- ✅ Unlimited deployments
- ✅ 100 GB bandwidth/month
- ✅ Serverless functions
- ✅ Automatic HTTPS
- ✅ Preview deployments

**Vercel Postgres Free Tier:**
- ✅ 256 MB storage
- ✅ 60 compute hours/month
- ✅ Perfect for personal projects

**AI API Costs** (User pays for their own usage):
- Anthropic Claude: ~$3-15 per million tokens
- OpenAI GPT-4: ~$10-30 per million tokens
- Users enter their own API keys

---

## Next Steps After Deployment

1. ✅ Test registration and login
2. ✅ Create a profile
3. ✅ Generate a workout routine
4. ✅ Share your deployment URL!

Your Gym Bro app is now live! 🎉

---

For more help, visit: https://vercel.com/docs
