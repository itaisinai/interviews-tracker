# Production Deployment Refactor - Summary

**Date:** 2026-06-30  
**Goal:** Make production deployments deterministic and transparent

---

## What Changed

### 1. Environment Management

**Before:**
- Multiple `.env` files scattered across releases
- No single source of truth
- Easy for configuration drift

**After:**
- Shared production environment file: `/home/ubuntu/interviews-tracker-shared/.env.production`
- Template files committed to repo: `.env.dev`, `.env.prod`
- Releases are immutable (no .env inside)

### 2. Release Structure

**Before:**
```
releases/20260628-220026/
  - PM2 runs from this timestamped directory
  - .env file copied here
  - Hard to tell which release is active
```

**After:**
```
releases/
  ├── 20260630-120000/  # Immutable releases
  ├── 20260630-130000/
  └── 20260630-140000/
shared/
  └── .env.production    # Shared environment
current -> releases/20260630-140000/  # Stable symlink
```

**PM2 always runs from `current/`**, never a timestamped folder.

### 3. Environment Validation

**Added:** Startup validation that fails immediately if:
- Required variables missing
- Invalid DATABASE_URL (catches `aws.neo.tech` typo)
- Malformed Auth0 configuration
- Invalid email format

**File:** `apps/api/src/config/env-validation.ts`

### 4. Runtime Diagnostics

**Added:** Protected endpoint for debugging:

```bash
GET /api/admin/runtime
```

Returns (no secrets exposed):
- Which release is running
- Git SHA and branch
- Node version
- Memory usage
- Database provider
- Configuration status

### 5. Automated Deployment

**Added:** Deployment script: `scripts/deploy-lightsail.sh`

**Features:**
- Builds locally
- Creates timestamped release
- Uploads via rsync
- Updates symlink
- Restarts PM2
- Verifies health
- Cleans old releases (keeps 5)

**Usage:**
```bash
yarn deploy
# or
./scripts/deploy-lightsail.sh
```

### 6. PM2 Ecosystem Configuration

**Added:** `ecosystem.config.js`

**Key features:**
- Always runs from `current/` directory
- Loads env from shared production file
- Configured logging paths
- Auto-restart on crash

### 7. Render Removed

**Deleted:**
- `render.yaml`

**Updated:**
- README.md - Changed URLs to Lightsail
- TELEGRAM_PRODUCTION_SETUP.md - Changed URLs
- All references to `onrender.com` replaced with `trackylab.com`

---

## File Changes Summary

### New Files

```
.env.dev                              # Development environment template
.env.prod                             # Production environment template (NO SECRETS)
ecosystem.config.js                   # PM2 configuration
apps/api/src/config/env-validation.ts # Startup validation
apps/api/src/routes/admin.ts          # Runtime diagnostics endpoint
scripts/deploy-lightsail.sh           # Automated deployment
scripts/setup-production-server.sh    # One-time server setup
docs/deployment.md                    # Comprehensive deployment guide
docs/deployment-refactor.md           # This file
```

### Modified Files

```
.gitignore                    # Exclude .env.local but allow .env.dev/.env.prod
package.json                  # Added deploy scripts
apps/api/src/server.ts        # Added env validation, admin route
README.md                     # Updated production URLs
TELEGRAM_PRODUCTION_SETUP.md  # Updated production URLs
```

### Deleted Files

```
render.yaml                   # Render deployment config
```

---

## Migration Steps

### For First-Time Setup

1. **On the server**, create directory structure:
```bash
ssh ubuntu@18.159.88.141
mkdir -p /home/ubuntu/interviews-tracker/releases
mkdir -p /home/ubuntu/interviews-tracker/shared
```

2. **Create production environment file**:
```bash
# Copy .env.prod to server
scp .env.prod ubuntu@18.159.88.141:/home/ubuntu/interviews-tracker/shared/.env.production

# Edit with production values
ssh ubuntu@18.159.88.141
nano /home/ubuntu/interviews-tracker/shared/.env.production
```

3. **Deploy**:
```bash
./scripts/deploy-lightsail.sh
```

### For Existing Deployments

1. **Create shared directory**:
```bash
ssh ubuntu@18.159.88.141
mkdir -p /home/ubuntu/interviews-tracker/shared
```

2. **Copy current .env to shared location**:
```bash
cp /home/ubuntu/interviews-tracker-releases/current/.env \
   /home/ubuntu/interviews-tracker/shared/.env.production
```

3. **Update PM2 to use ecosystem config**:
```bash
cd /home/ubuntu/interviews-tracker/current
pm2 delete interviews-api
pm2 start ecosystem.config.js
pm2 save
```

4. **Future deployments** will use the new structure automatically

---

## Benefits

### Before This Refactor

❌ Hard to tell which `.env` is active  
❌ Each release had its own `.env` copy  
❌ PM2 ran from timestamped directories  
❌ No validation of environment variables  
❌ No visibility into what's deployed  
❌ Manual deployment steps  
❌ Configuration drift risk  

### After This Refactor

✅ Single source of truth for environment  
✅ Immutable releases  
✅ Stable `current/` symlink  
✅ Startup fails on bad config  
✅ Runtime diagnostics endpoint  
✅ Automated deployment script  
✅ Clear rollback procedure  
✅ Deterministic deployments  

---

## Common Operations

### Deploy
```bash
yarn deploy
```

### Rollback
```bash
ssh ubuntu@18.159.88.141
ln -snf /home/ubuntu/interviews-tracker/releases/20260630-120000 \
        /home/ubuntu/interviews-tracker/current
pm2 restart interviews-api
```

### Update Environment Variables
```bash
# Option 1: Edit in place
ssh ubuntu@18.159.88.141
nano /home/ubuntu/interviews-tracker/shared/.env.production
pm2 restart interviews-api

# Option 2: Upload from local
scp .env.prod ubuntu@18.159.88.141:/home/ubuntu/interviews-tracker/shared/.env.production
ssh ubuntu@18.159.88.141 "pm2 restart interviews-api"
```

### Check What's Running
```bash
# Via SSH
ssh ubuntu@18.159.88.141 "readlink /home/ubuntu/interviews-tracker/current"

# Via API
curl https://interviews-api.trackylab.com/api/admin/runtime \
  -H "Authorization: Bearer <token>"
```

### View Logs
```bash
ssh ubuntu@18.159.88.141 "pm2 logs interviews-api --lines 100"
```

---

## Next Steps (Optional Future Improvements)

1. **CI/CD**: GitHub Actions workflow to automate deployment on push to `main`
2. **Database Keepalive**: Cron job to prevent Neon free tier from sleeping
3. **Monitoring**: Sentry alerts, uptime monitoring
4. **Staging Environment**: Separate Lightsail instance for pre-production testing
5. **Blue-Green Deployments**: Zero-downtime deployments with traffic switching
6. **Database Migrations**: Automated migration runs during deployment

---

**Documentation:**
- See `docs/deployment.md` for comprehensive deployment guide
- See `scripts/deploy-lightsail.sh` for deployment automation
- See `ecosystem.config.js` for PM2 configuration

---

**Result:** Production deployments are now deterministic. You'll never again wonder which `.env` is active, which release is running, or which commit is deployed. Everything has a single obvious source of truth.
