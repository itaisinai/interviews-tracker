#!/bin/bash

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  🔐 Generate Secrets for Production"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Generate secrets
OPPORTUNITY_WEBHOOK_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
TELEGRAM_WEBHOOK_SECRET_TOKEN=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")

echo "Copy these to your Render environment variables:"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "OPPORTUNITY_WEBHOOK_SECRET=$OPPORTUNITY_WEBHOOK_SECRET"
echo ""
echo "TELEGRAM_WEBHOOK_SECRET_TOKEN=$TELEGRAM_WEBHOOK_SECRET_TOKEN"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "✅ Secrets generated!"
echo ""
echo "Note: These are cryptographically secure random strings."
echo "Keep them secret and don't commit them to git."
echo ""
