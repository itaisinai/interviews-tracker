#!/bin/bash

#
# Lightsail Deployment Script
#
# Deploys the interviews-tracker API to AWS Lightsail with immutable releases
# and deterministic environment management.
#

set -e  # Exit on error

# Configuration
REMOTE_USER="ubuntu"
REMOTE_HOST="18.159.88.141"
REMOTE_BASE="/home/ubuntu/interviews-tracker"
REMOTE_RELEASES="${REMOTE_BASE}/releases"
REMOTE_SHARED="${REMOTE_BASE}/shared"
REMOTE_CURRENT="${REMOTE_BASE}/current"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
RELEASE_DIR="${REMOTE_RELEASES}/${TIMESTAMP}"

echo "======================================"
echo "Interviews Tracker - Lightsail Deploy"
echo "======================================"
echo ""
echo "Deployment Info:"
echo "  Target: ${REMOTE_USER}@${REMOTE_HOST}"
echo "  Release: ${TIMESTAMP}"
echo "  Directory: ${RELEASE_DIR}"
echo ""

# Get current git info
GIT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
GIT_SHA=$(git rev-parse --short HEAD)
GIT_DIRTY=$(git diff --quiet || echo "-dirty")

echo "Git Info:"
echo "  Branch: ${GIT_BRANCH}"
echo "  Commit: ${GIT_SHA}${GIT_DIRTY}"
echo ""

# Confirm deployment
read -p "Deploy to production? [y/N] " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Deployment cancelled"
    exit 1
fi

echo ""
echo "Step 1: Building application locally..."
yarn build:api

echo ""
echo "Step 2: Creating release directory on remote..."
ssh ${REMOTE_USER}@${REMOTE_HOST} "mkdir -p ${RELEASE_DIR}"

echo ""
echo "Step 3: Uploading application files..."
rsync -avz --delete \
  --exclude='node_modules' \
  --exclude='.git' \
  --exclude='.env*' \
  --exclude='dist' \
  --exclude='apps/web' \
  --exclude='apps/linkedin-extension' \
  --exclude='.turbo' \
  ./ ${REMOTE_USER}@${REMOTE_HOST}:${RELEASE_DIR}/

echo ""
echo "Step 4: Installing dependencies on remote..."
ssh ${REMOTE_USER}@${REMOTE_HOST} << ENDSSH
cd ${RELEASE_DIR}
corepack enable
corepack prepare yarn@4.9.2 --activate
corepack yarn install --immutable
corepack yarn build:api
ENDSSH

echo ""
echo "Step 5: Checking shared environment file..."
ssh ${REMOTE_USER}@${REMOTE_HOST} << ENDSSH
if [ ! -f "${REMOTE_SHARED}/.env.production" ]; then
    echo "ERROR: ${REMOTE_SHARED}/.env.production does not exist!"
    echo "Please create it before deploying."
    exit 1
fi
echo "✓ Environment file exists"
ENDSSH

echo ""
echo "Step 6: Creating git metadata..."
ssh ${REMOTE_USER}@${REMOTE_HOST} << ENDSSH
cat > ${RELEASE_DIR}/.deployment-info << EOF
TIMESTAMP=${TIMESTAMP}
GIT_BRANCH=${GIT_BRANCH}
GIT_SHA=${GIT_SHA}
DEPLOYED_AT=\$(date -u +"%Y-%m-%dT%H:%M:%SZ")
DEPLOYED_BY=\$(whoami)
EOF
ENDSSH

echo ""
echo "Step 7: Updating 'current' symlink..."
ssh ${REMOTE_USER}@${REMOTE_HOST} << ENDSSH
ln -snf ${RELEASE_DIR} ${REMOTE_CURRENT}
echo "✓ Symlink updated: ${REMOTE_CURRENT} -> ${RELEASE_DIR}"
ENDSSH

echo ""
echo "Step 8: Restarting PM2..."
ssh ${REMOTE_USER}@${REMOTE_HOST} << 'ENDSSH'
cd /home/ubuntu/interviews-tracker/current
pm2 restart interviews-api || pm2 start ecosystem.config.cjs
pm2 save
ENDSSH

echo ""
echo "Step 9: Verifying deployment..."
sleep 3
HEALTH_CHECK=$(curl -s https://interviews-api.trackylab.com/health | grep -o '"ok":true' || echo "")
if [ -n "$HEALTH_CHECK" ]; then
    echo "✓ Health check passed"
else
    echo "⚠ Warning: Health check failed"
fi

echo ""
echo "Step 10: Cleaning old releases (keeping last 5)..."
ssh ${REMOTE_USER}@${REMOTE_HOST} << 'ENDSSH'
cd /home/ubuntu/interviews-tracker/releases
ls -t | tail -n +6 | xargs -I {} rm -rf {}
echo "✓ Old releases cleaned"
ENDSSH

echo ""
echo "======================================"
echo "✅ Deployment Complete"
echo "======================================"
echo ""
echo "  Release: ${TIMESTAMP}"
echo "  Commit: ${GIT_SHA}"
echo "  Health: https://interviews-api.trackylab.com/health"
echo "  Runtime: https://interviews-api.trackylab.com/api/admin/runtime"
echo ""
echo "To rollback:"
echo "  ssh ${REMOTE_USER}@${REMOTE_HOST}"
echo "  ln -snf /home/ubuntu/interviews-tracker/releases/<previous-timestamp> /home/ubuntu/interviews-tracker/current"
echo "  pm2 restart interviews-api"
echo ""
