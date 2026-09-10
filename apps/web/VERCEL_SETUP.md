# Vercel Environment Variables Setup

## ⚠️ Important Notes

1. **Environment File Location**: Vite is configured to load `.env` files from the **repository root**, not from `apps/web/`. 
   - ✅ Correct: `/.env.production`
   - ❌ Wrong: `/apps/web/.env.production`

2. **HTTPS Required**: The frontend is served over HTTPS, so the API must also use HTTPS to avoid mixed content blocking by browsers.

## Required Environment Variables

The following environment variables must be configured in Vercel project settings:

### Production

Go to: https://vercel.com/[your-team]/interviews-tracker/settings/environment-variables

Add these variables for **Production** environment:

```
VITE_API_BASE_URL=https://api.interviews.trackylab.com
VITE_AUTH0_DOMAIN=dev-c1s005zh8spezp0e.us.auth0.com
VITE_AUTH0_CLIENT_ID=hlI5kn4lePStXeHJohsGqyKnyoBHJtTW
VITE_AUTH0_AUDIENCE=https://interviews-tracker-api.com
VITE_ALLOWED_EMAIL=itai.sinai@gmail.com
VITE_DEV_MODE_BYPASS_AUTH=false
```

### Preview (Optional)

For preview deployments, you can use the same values or point to a staging API if available.

## Quick Setup via Vercel CLI

```bash
# Install Vercel CLI if needed
npm i -g vercel

# Set environment variables
vercel env add VITE_API_BASE_URL production
# When prompted, enter: https://api.interviews.trackylab.com

vercel env add VITE_AUTH0_DOMAIN production
# When prompted, enter: dev-c1s005zh8spezp0e.us.auth0.com

vercel env add VITE_AUTH0_CLIENT_ID production
# When prompted, enter: hlI5kn4lePStXeHJohsGqyKnyoBHJtTW

vercel env add VITE_AUTH0_AUDIENCE production
# When prompted, enter: https://interviews-tracker-api.com

vercel env add VITE_ALLOWED_EMAIL production
# When prompted, enter: itai.sinai@gmail.com

vercel env add VITE_DEV_MODE_BYPASS_AUTH production
# When prompted, enter: false
```

## After Setting Environment Variables

Trigger a new deployment to apply the changes:

```bash
vercel --prod
```

Or push a new commit to trigger automatic deployment.

## Verification

After deployment, check the browser console network tab. API requests should go to:
- ✅ `https://api.interviews.trackylab.com/*`
- ❌ NOT `http://localhost:4000/api/*`
- ❌ NOT using HTTP (must be HTTPS to avoid mixed content errors)

## Local Development

For local development, copy `.env.local.example` to `.env.local`:

```bash
cp .env.local.example .env.local
```

This will use `localhost:4000` for the API during development.
