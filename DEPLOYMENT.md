# Railway Deployment Guide

This guide walks you through deploying The Daily Flake to Railway.

## Prerequisites

- Railway account (sign up at https://railway.app)
- GitHub repository with your code
- All API keys ready (Clerk, Twilio, Claude)

## Step 1: Create Railway Project

1. Go to https://railway.app
2. Click **"New Project"**
3. Select **"Deploy from GitHub repo"**
4. Connect your GitHub account and select this repository
5. Railway will automatically detect Next.js and start building

## Step 2: Add Volume for SQLite Database

Since we're using SQLite, we need persistent storage:

1. In your Railway project, click **"+ New"** → **"Volume"**
2. **Mount Path**: `/data`
3. **Size**: 1 GB (sufficient for MVP)
4. Click **"Add"**

The database file will be stored at `/data/prod.db` instead of `./dev.db`

## Step 3: Set Environment Variables

In Railway project settings → **"Variables"**, add:

### Database
```
DATABASE_URL=file:/data/prod.db
```

### Clerk Authentication
```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
CLERK_SECRET_KEY=sk_live_...
CLERK_WEBHOOK_SECRET=whsec_...
```

### Twilio SMS
```
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=+1...
TWILIO_VERIFY_SERVICE_SID=VA...
```

### Claude AI
```
ANTHROPIC_API_KEY=sk-ant-...
```

### Resend Email
```
RESEND_API_KEY=re_...
```

Get your API key from:
1. Sign up at https://resend.com
2. Go to API Keys → Create API Key
3. Copy the key (starts with `re_`)

### App Configuration
```
NEXT_PUBLIC_APP_URL=https://your-app.railway.app
ADMIN_USER_IDS=user_xxx
NODE_ENV=production
```

**Important:** Replace `your-app.railway.app` with your actual Railway domain (found in project settings).

## Step 4: Configure Clerk Production Settings

### Update Clerk Redirect URLs

1. Go to Clerk Dashboard → Your Application → **"Paths"**
2. Update URLs to use your Railway domain:
   - **Sign-in URL**: `https://your-app.railway.app/sign-in`
   - **Sign-up URL**: `https://your-app.railway.app/sign-up`
   - **After sign-in**: `https://your-app.railway.app/dashboard`
   - **After sign-up**: `https://your-app.railway.app/dashboard`

### Setup Clerk Webhook

1. Clerk Dashboard → **"Webhooks"** → **"Add Endpoint"**
2. **Endpoint URL**: `https://your-app.railway.app/api/auth/webhook`
3. **Subscribe to events**:
   - ✅ `user.created`
   - ✅ `user.deleted`
4. Copy the **Signing Secret** and add it to Railway env vars as `CLERK_WEBHOOK_SECRET`

## Step 5: Deploy

Railway will automatically deploy after adding environment variables. Monitor the deployment:

1. Click on your deployment to view logs
2. Wait for build to complete (~3-5 minutes)
3. Look for: `✓ Ready in XXXms`

## Step 6: Initialize Database

After first deployment:

1. Open Railway **"Logs"**
2. You should see migrations running automatically via `start:production` script
3. Database will be seeded with 5 Colorado resorts

If migrations didn't run, manually trigger them:
```bash
railway run npx prisma migrate deploy
railway run npx prisma db seed
```

## Step 7: Test the Scheduler

The scheduler should auto-start when the app boots. Verify:

1. Visit: `https://your-app.railway.app/api/health`
2. Check `scheduler.running` should be `true`

If not running, manually trigger bootstrap:
```bash
curl https://your-app.railway.app/api/bootstrap
```

## Step 8: Complete A2P 10DLC Registration

For SMS to work in production, register your Twilio messages:

1. **Twilio Console** → **Messaging** → **Regulatory Compliance**
2. **Register Business Profile**
3. **Register Campaign** with sample messages:
   - "Your Daily Flake verification code is: 123456"
   - "Vail: 8\" fresh, 45\" base, 12/15 lifts, excellent conditions"
   - "Vail mountain data not available"
4. Wait 1-5 business days for approval

## Step 9: Test End-to-End

1. Visit your Railway URL
2. Sign up with a new account
3. Verify your phone number (should receive SMS via Twilio Verify)
4. Add a resort subscription
5. Wait for scheduled notification time
6. Check Railway logs for scraper/notifier activity
7. Receive your first snow report SMS!

## Monitoring

### View Logs
```bash
railway logs
```

### Check Health
```bash
curl https://your-app.railway.app/api/health
```

### Admin Dashboard
Visit `https://your-app.railway.app/admin` to:
- View system metrics
- Manage resorts
- Monitor SMS deliveries
- Track subscriptions

## Troubleshooting

### Scheduler Not Running
**Solution:** Visit `/api/bootstrap` to manually start it

### Database Not Initialized
**Solution:**
```bash
railway run npx prisma migrate deploy
railway run npx prisma db seed
```

### SMS Not Sending
**Verify:**
- Twilio Verify Service is configured
- A2P 10DLC registration is complete (for production SMS)
- Phone numbers are in E.164 format

### Build Failures
**Check:**
- All dependencies in package.json
- Prisma schema is valid
- Environment variables are set

## Cost Estimate

**Railway**: ~$5-20/month (Hobby tier with 1GB volume)
**Twilio**: ~$1/month phone + ~$0.0079/SMS
**Claude AI**: ~$0.30/month (Haiku for 10 resorts)
**Clerk**: Free (up to 10,000 MAU)

**Total MVP**: ~$6-25/month depending on SMS volume

## Scaling

To handle more users:
1. Upgrade Railway plan for more resources
2. Switch from SQLite to PostgreSQL for better concurrency
3. Add Redis caching for scraped reports
4. Implement rate limiting on API routes

## Support

If you encounter issues:
1. Check Railway logs: `railway logs`
2. Review health endpoint: `/api/health`
3. Check Clerk dashboard for auth issues
4. Verify Twilio console for SMS issues
