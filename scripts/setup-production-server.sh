#!/bin/bash

#
# Production Server Setup Script
#
# Run this ONCE on a fresh Lightsail instance to set up the deployment structure
#

set -e

echo "=========================================="
echo "Interviews Tracker - Production Setup"
echo "=========================================="
echo ""

# Check if running on the server
if [ ! -d "/home/ubuntu" ]; then
    echo "ERROR: This script must be run on the Lightsail server"
    echo "Run: ssh ubuntu@18.159.88.141 'bash -s' < ./scripts/setup-production-server.sh"
    exit 1
fi

echo "Step 1: Creating directory structure..."
mkdir -p /home/ubuntu/interviews-tracker/releases
mkdir -p /home/ubuntu/interviews-tracker/shared
echo "✓ Directories created"

echo ""
echo "Step 2: Checking for production environment file..."
if [ -f "/home/ubuntu/interviews-tracker/shared/.env.production" ]; then
    echo "✓ Environment file already exists"
else
    echo "⚠ Creating placeholder environment file"
    cat > /home/ubuntu/interviews-tracker/shared/.env.production << 'EOF'
# PRODUCTION ENVIRONMENT VARIABLES
# Copy from .env.prod and update with production values

DATABASE_URL="postgresql://user:pass@host:5432/db?sslmode=require"
AUTH0_DOMAIN="your-tenant.us.auth0.com"
AUTH0_AUDIENCE="https://interviews-tracker-api.com"
ALLOWED_EMAIL="your@email.com"
FRONTEND_ORIGIN="https://interviews-tracker.vercel.app"
PORT=4000

# Add other required variables...
# See .env.prod for full template
EOF
    echo ""
    echo "⚠ WARNING: Placeholder environment file created!"
    echo "You must edit it before deploying:"
    echo "  nano /home/ubuntu/interviews-tracker/shared/.env.production"
    echo ""
fi

echo ""
echo "Step 3: Installing Node.js (if needed)..."
if command -v node &> /dev/null; then
    echo "✓ Node.js already installed: $(node --version)"
else
    echo "Installing Node.js 20..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
    echo "✓ Node.js installed"
fi

echo ""
echo "Step 4: Enabling Corepack..."
sudo corepack enable
echo "✓ Corepack enabled"

echo ""
echo "Step 5: Installing PM2..."
if command -v pm2 &> /dev/null; then
    echo "✓ PM2 already installed: $(pm2 --version)"
else
    sudo npm install -g pm2
    pm2 startup
    echo "✓ PM2 installed"
    echo "  Run the command above to enable PM2 on system startup"
fi

echo ""
echo "=========================================="
echo "✅ Server Setup Complete"
echo "=========================================="
echo ""
echo "Next steps:"
echo ""
echo "1. Edit the production environment file:"
echo "   nano /home/ubuntu/interviews-tracker/shared/.env.production"
echo ""
echo "2. Deploy the application:"
echo "   (From your local machine)"
echo "   ./scripts/deploy-lightsail.sh"
echo ""
echo "3. Verify deployment:"
echo "   curl https://interviews-api.trackylab.com/health"
echo ""
