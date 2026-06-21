#!/bin/bash

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Telegram Bot Environment Setup"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Generate secrets
TELEGRAM_WEBHOOK_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
OPPORTUNITY_WEBHOOK_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")

echo "Generated secrets! Add these to your .env file:"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "# Telegram Bot Configuration"
echo "TELEGRAM_BOT_TOKEN=<paste-your-token-from-botfather>"
echo "TELEGRAM_WEBHOOK_SECRET_TOKEN=$TELEGRAM_WEBHOOK_SECRET"
echo "TELEGRAM_BACKEND_WEBHOOK_URL=http://localhost:4000/webhooks/opportunities/telegram"
echo "OPPORTUNITY_WEBHOOK_SECRET=$OPPORTUNITY_WEBHOOK_SECRET"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Next steps:"
echo "1. Copy the above to your .env file"
echo "2. Replace <paste-your-token-from-botfather> with your actual bot token"
echo "3. Run: ngrok http 4000"
echo "4. Run the register-webhook.sh script with your ngrok URL"
echo ""
