#!/bin/bash

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Telegram Production Webhook Registration"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Get production API URL
echo "Enter your production API URL (e.g., https://your-api.onrender.com):"
read PROD_URL

if [ -z "$PROD_URL" ]; then
  echo "❌ No URL provided"
  exit 1
fi

# Remove trailing slash
PROD_URL=${PROD_URL%/}

echo ""
echo "Enter your TELEGRAM_BOT_TOKEN:"
read -s BOT_TOKEN
echo ""

if [ -z "$BOT_TOKEN" ]; then
  echo "❌ No bot token provided"
  exit 1
fi

echo "Enter your TELEGRAM_WEBHOOK_SECRET_TOKEN:"
read -s SECRET_TOKEN
echo ""

if [ -z "$SECRET_TOKEN" ]; then
  echo "❌ No secret token provided"
  exit 1
fi

echo ""
echo "Registering webhook..."
echo "URL: $PROD_URL/webhooks/telegram"
echo ""

# Register webhook
RESPONSE=$(curl -s -X POST "https://api.telegram.org/bot$BOT_TOKEN/setWebhook" \
  -H "Content-Type: application/json" \
  -d "{
    \"url\": \"$PROD_URL/webhooks/telegram\",
    \"secret_token\": \"$SECRET_TOKEN\"
  }")

echo "Response:"
echo "$RESPONSE" | jq .

# Check webhook info
echo ""
echo "Verifying webhook..."
echo ""

WEBHOOK_INFO=$(curl -s "https://api.telegram.org/bot$BOT_TOKEN/getWebhookInfo")
echo "$WEBHOOK_INFO" | jq .

# Check if successful
if echo "$WEBHOOK_INFO" | jq -e '.result.url' | grep -q "$PROD_URL"; then
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "✅ Production webhook registered successfully!"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  echo "Your bot is now live in production! 🚀"
  echo "Test by sending a message to your bot in Telegram."
  echo ""
else
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "⚠️  Webhook registration may have failed"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  echo "Check the response above for errors."
  echo ""
fi
