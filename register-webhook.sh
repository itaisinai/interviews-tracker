#!/bin/bash

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Telegram Webhook Registration"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Load .env file
if [ -f .env ]; then
  export $(cat .env | grep -v '^#' | xargs)
else
  echo "❌ .env file not found!"
  exit 1
fi

# Check required variables
if [ -z "$TELEGRAM_BOT_TOKEN" ]; then
  echo "❌ TELEGRAM_BOT_TOKEN not set in .env"
  exit 1
fi

if [ -z "$TELEGRAM_WEBHOOK_SECRET_TOKEN" ]; then
  echo "❌ TELEGRAM_WEBHOOK_SECRET_TOKEN not set in .env"
  exit 1
fi

# Get ngrok URL from user
echo "Enter your ngrok URL (e.g., https://abc123.ngrok.io):"
read NGROK_URL

if [ -z "$NGROK_URL" ]; then
  echo "❌ No URL provided"
  exit 1
fi

# Remove trailing slash
NGROK_URL=${NGROK_URL%/}

echo ""
echo "Registering webhook..."
echo "URL: $NGROK_URL/webhooks/telegram"
echo ""

# Register webhook
RESPONSE=$(curl -s -X POST "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/setWebhook" \
  -H "Content-Type: application/json" \
  -d "{
    \"url\": \"$NGROK_URL/webhooks/telegram\",
    \"secret_token\": \"$TELEGRAM_WEBHOOK_SECRET_TOKEN\"
  }")

echo "Response:"
echo "$RESPONSE" | jq .

# Check webhook info
echo ""
echo "Verifying webhook..."
echo ""

WEBHOOK_INFO=$(curl -s "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/getWebhookInfo")
echo "$WEBHOOK_INFO" | jq .

# Check if successful
if echo "$WEBHOOK_INFO" | jq -e '.result.url' | grep -q "$NGROK_URL"; then
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "✅ Webhook registered successfully!"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  echo "Next steps:"
  echo "1. Make sure your API is running: yarn dev:api"
  echo "2. Send a message to your bot!"
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
