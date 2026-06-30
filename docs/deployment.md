# Production Deployment Guide

This document explains the deployment architecture and procedures for the Interviews Tracker API on AWS Lightsail.

## Architecture Overview

### Deployment Structure

```
/home/ubuntu/interviews-tracker/
├── releases/
│   ├── 20260630-120000/    # Timestamped immutable releases
│   ├── 20260630-130000/
│   └── 20260630-140000/
├── shared/
│   └── .env.production      # Shared production environment file
└── current -> releases/20260630-140000/  # Symlink to active release
```

**Key Principles:**
- **Immutable releases**: Each deployment creates a new timestamped directory
- **Stable symlink**: PM2 always runs from `current/`, never a timestamped folder
- **Shared environment**: Single source of truth for environment variables
- **Easy rollback**: Change symlink and restart PM2

### PM2 Configuration

PM2 uses the `ecosystem.config.js` file to run the API:

```javascript
{
  name: 'interviews-api',
  script: 'apps/api/dist/index.js',
  cwd: '/home/ubuntu/interviews-tracker/current',  // Always uses current symlink
  env_file: '/home/ubuntu/interviews-tracker-shared/.env.production'  // Shared env
}
```

---

## Environment Management

### Environment Files

The repository contains two template environment files:

- `.env.dev` - Local development template
- `.env.prod` - Production template (DO NOT commit secrets to this)

**Production environment file location:**
```
/home/ubuntu/interviews-tracker-shared/.env.production
```

### Required Environment Variables

The API validates these variables at startup and will fail immediately if any are missing or invalid:

**Required:**
- `DATABASE_URL` - PostgreSQL connection string (Neon database)
- `AUTH0_DOMAIN` - Auth0 tenant domain (without protocol)
- `AUTH0_AUDIENCE` - Auth0 API audience identifier
- `ALLOWED_EMAIL` - Email address allowed to authenticate
- `CHROME_EXTENSION_ORIGIN` - Chrome extension origin for CORS

**Optional but recommended:**
- `PORT` - API port (default: 4000)
- `FRONTEND_ORIGIN` - Frontend URL for CORS
- `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET` - Gmail OAuth
- `TELEGRAM_BOT_TOKEN` - Telegram bot integration
- `OPENAI_API_KEY` - AI features
- `SENTRY_DSN` - Error tracking

### Common Environment Mistakes

The startup validation will catch:

❌ `DATABASE_URL` contains `aws.neo.tech` (should be `aws.neon.tech`)  
❌ Missing protocol in DATABASE_URL  
❌ `AUTH0_DOMAIN` includes `https://` (should be domain only)  
❌ Invalid email format  
❌ Chrome extension origin without `chrome-extension://` prefix

---

## Deployment Procedure

### Prerequisites

1. **SSH access** to Lightsail instance: `ssh ubuntu@18.159.88.141`
2. **Shared environment file exists**: `/home/ubuntu/interviews-tracker-shared/.env.production`
3. **Clean git state**: Commit or stash local changes

### Automated Deployment

Use the deployment script:

```bash
./scripts/deploy-lightsail.sh
```

**What it does:**
1. Builds the application locally
2. Creates a new timestamped release directory
3. Uploads application files via rsync
4. Installs dependencies on the server
5. Runs the build on the server
6. Updates the `current` symlink
7. Restarts PM2
8. Verifies health check
9. Cleans old releases (keeps last 5)

**Output example:**
```
======================================
Interviews Tracker - Lightsail Deploy
======================================

Deployment Info:
  Target: ubuntu@18.159.88.141
  Release: 20260630-140530
  Directory: /home/ubuntu/interviews-tracker/releases/20260630-140530

Git Info:
  Branch: master
  Commit: a7b3c8f

Deploy to production? [y/N] y

...

✅ Deployment Complete

  Release: 20260630-140530
  Commit: a7b3c8f
  Health: https://interviews-api.trackylab.com/health
  Runtime: https://interviews-api.trackylab.com/api/admin/runtime
```

### Manual Deployment (if script fails)

```bash
# 1. SSH into server
ssh ubuntu@18.159.88.141

# 2. Create release directory
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
mkdir -p /home/ubuntu/interviews-tracker/releases/${TIMESTAMP}

# 3. From local machine, upload files
rsync -avz --delete \
  --exclude='node_modules' \
  --exclude='.git' \
  --exclude='.env*' \
  ./ ubuntu@18.159.88.141:/home/ubuntu/interviews-tracker/releases/${TIMESTAMP}/

# 4. Back on server, install and build
cd /home/ubuntu/interviews-tracker/releases/${TIMESTAMP}
corepack enable
corepack yarn install --immutable
corepack yarn build:api

# 5. Update symlink
ln -snf /home/ubuntu/interviews-tracker/releases/${TIMESTAMP} /home/ubuntu/interviews-tracker/current

# 6. Restart PM2
cd /home/ubuntu/interviews-tracker/current
pm2 restart interviews-api
pm2 save

# 7. Verify
curl https://interviews-api.trackylab.com/health
```

---

## Rollback Procedure

To rollback to a previous release:

```bash
# 1. SSH into server
ssh ubuntu@18.159.88.141

# 2. List available releases
ls -lt /home/ubuntu/interviews-tracker/releases

# 3. Update symlink to previous release
ln -snf /home/ubuntu/interviews-tracker/releases/20260630-120000 /home/ubuntu/interviews-tracker/current

# 4. Restart PM2
pm2 restart interviews-api

# 5. Verify
curl https://interviews-api.trackylab.com/health
```

**Rollback is instant** - just change the symlink and restart PM2.

---

## Updating Production Environment Variables

### Option 1: Edit in place (Quick fix)

```bash
ssh ubuntu@18.159.88.141
nano /home/ubuntu/interviews-tracker-shared/.env.production
# Make changes
# Save and exit

# Restart to apply changes
pm2 restart interviews-api
```

### Option 2: Upload from local (Recommended)

1. Update `.env.prod` locally (DO NOT commit secrets)
2. Upload to server:
```bash
scp .env.prod ubuntu@18.159.88.141:/home/ubuntu/interviews-tracker-shared/.env.production
```
3. Restart PM2:
```bash
ssh ubuntu@18.159.88.141 "pm2 restart interviews-api"
```

---

## Verification & Diagnostics

### Health Check

```bash
curl https://interviews-api.trackylab.com/health
```

Expected response:
```json
{
  "ok": true,
  "service": "api",
  "version": "0.1.0",
  "uptimeSeconds": 3600,
  "timestamp": "2026-06-30T14:05:30.000Z"
}
```

### Runtime Diagnostics

```bash
curl https://interviews-api.trackylab.com/api/admin/runtime \
  -H "Authorization: Bearer <your-auth0-token>"
```

Expected response:
```json
{
  "deployment": {
    "release": "20260630-140530",
    "isSymlink": true,
    "symlinkTarget": "releases/20260630-140530",
    "cwd": "/home/ubuntu/interviews-tracker/current",
    "gitSha": "a7b3c8f",
    "gitBranch": "master",
    "nodeVersion": "v20.11.0"
  },
  "runtime": {
    "startedAt": "2026-06-30T14:05:35.000Z",
    "uptimeSeconds": 1234,
    "memoryUsage": {
      "heapUsed": "45MB",
      "heapTotal": "67MB",
      "rss": "123MB"
    }
  },
  "configuration": {
    "database": {
      "configured": true,
      "host": "ep-fancy-king-aq885qs5.c-8.us-east-1.aws.neon.tech",
      "provider": "Neon"
    },
    "auth": {
      "domainConfigured": true,
      "audienceConfigured": true
    },
    "chromeExtension": {
      "originConfigured": true
    }
  }
}
```

### Check Which Release is Running

```bash
ssh ubuntu@18.159.88.141 "readlink /home/ubuntu/interviews-tracker/current"
```

### View PM2 Status

```bash
ssh ubuntu@18.159.88.141 "pm2 status"
```

### View PM2 Logs

```bash
ssh ubuntu@18.159.88.141 "pm2 logs interviews-api --lines 50"
```

---

## Troubleshooting

### API Won't Start

**Check logs:**
```bash
ssh ubuntu@18.159.88.141 "pm2 logs interviews-api --err --lines 50"
```

**Common causes:**
- Missing environment variables (check startup validation errors)
- Database connection issues (Neon sleeping)
- Port already in use
- Build failed

**Fix:**
```bash
# Verify environment file exists
ssh ubuntu@18.159.88.141 "cat /home/ubuntu/interviews-tracker-shared/.env.production"

# Check if port is in use
ssh ubuntu@18.159.88.141 "lsof -i :4000"

# Restart PM2
ssh ubuntu@18.159.88.141 "pm2 restart interviews-api"
```

### Database Connection Timeouts

**Symptom:** `Can't reach database server` errors in logs

**Cause:** Neon free tier database auto-sleeps after inactivity

**Fix:** Upgrade Neon or add keepalive cron:
```bash
# Add cron job to ping API every 4 minutes
ssh ubuntu@18.159.88.141
crontab -e
# Add line:
*/4 * * * * curl -s https://interviews-api.trackylab.com/health > /dev/null
```

### Wrong Environment Variables Active

**Symptom:** Wrong DATABASE_URL or other config being used

**Check which env file is loaded:**
```bash
ssh ubuntu@18.159.88.141 "pm2 env interviews-api | grep -i database"
```

**Fix:**
- Verify `ecosystem.config.js` points to correct env file
- Check `/home/ubuntu/interviews-tracker-shared/.env.production` exists
- Restart PM2: `pm2 restart interviews-api`

### Can't Determine Which Release is Running

**Check symlink:**
```bash
ssh ubuntu@18.159.88.141 "ls -la /home/ubuntu/interviews-tracker/current"
```

**Check deployment info:**
```bash
ssh ubuntu@18.159.88.141 "cat /home/ubuntu/interviews-tracker/current/.deployment-info"
```

**Check via API:**
```bash
curl https://interviews-api.trackylab.com/api/admin/runtime \
  -H "Authorization: Bearer <token>"
```

---

## Production URL

**API Base:** `https://interviews-api.trackylab.com`  
**Frontend:** `https://interviews-tracker.vercel.app`

---

## CI/CD (Future)

Currently deployments are manual. To automate:

1. Create GitHub Actions workflow
2. Trigger on push to `main` branch
3. Run tests
4. Execute `deploy-lightsail.sh` via SSH
5. Notify on Slack/Email

Example workflow skeleton:
```yaml
name: Deploy to Lightsail
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: yarn install
      - run: yarn test
      - run: ./scripts/deploy-lightsail.sh
```

---

**Last Updated:** 2026-06-30
