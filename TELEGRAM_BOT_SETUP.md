# Telegram Bot Setup Guide

## Overview

The Telegram bot allows you to create job opportunities by sending messages to your bot. The bot extracts company name, role title, and other details using AI.

## Architecture

```
Telegram → /webhooks/telegram → telegram-service → /webhooks/opportunities/telegram → opportunity-text-ingestion-service → Database
```

1. Telegram sends updates to `/webhooks/telegram`
2. `telegram-service` validates and extracts the message
3. Forwards to internal webhook `/webhooks/opportunities/telegram`
4. AI extracts opportunity details from text
5. Opportunity created in database
6. Bot replies with confirmation

## Required Environment Variables

Add these to your `.env` file:

```bash
# Telegram Bot Configuration
TELEGRAM_BOT_TOKEN=<your-bot-token-from-botfather>
TELEGRAM_WEBHOOK_SECRET_TOKEN=<generate-a-random-secret>
TELEGRAM_BACKEND_WEBHOOK_URL=http://localhost:4000/webhooks/opportunities/telegram
OPPORTUNITY_WEBHOOK_SECRET=<generate-another-random-secret>
```

### How to Get Values

1. **TELEGRAM_BOT_TOKEN**
   - Already got from BotFather
   - Format: `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`

2. **TELEGRAM_WEBHOOK_SECRET_TOKEN**
   - Generate a random secret (will be sent to Telegram)
   - Example: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
   - This validates that webhook calls come from Telegram

3. **TELEGRAM_BACKEND_WEBHOOK_URL**
   - **Local testing**: `http://localhost:4000/webhooks/opportunities/telegram`
   - **Production**: `https://your-api-domain.com/webhooks/opportunities/telegram`

4. **OPPORTUNITY_WEBHOOK_SECRET**
   - Generate another random secret (internal use)
   - Example: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
   - This validates internal webhook calls

## Local Testing Setup

### Step 1: Add Environment Variables

Edit your `.env` file:

```bash
# Generate secrets
TELEGRAM_BOT_TOKEN=<paste-from-botfather>
TELEGRAM_WEBHOOK_SECRET_TOKEN=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
TELEGRAM_BACKEND_WEBHOOK_URL=http://localhost:4000/webhooks/opportunities/telegram
OPPORTUNITY_WEBHOOK_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
```

### Step 2: Expose Local Server (using ngrok)

Since Telegram needs a public URL, use ngrok:

```bash
# Install ngrok if you haven't
brew install ngrok  # macOS
# or download from https://ngrok.com/download

# Start ngrok tunnel
ngrok http 4000
```

You'll get a URL like: `https://abc123.ngrok.io`

### Step 3: Register Webhook with Telegram

Use this curl command (replace values):

```bash
# Set your webhook
curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://abc123.ngrok.io/webhooks/telegram",
    "secret_token": "<YOUR_TELEGRAM_WEBHOOK_SECRET_TOKEN>"
  }'

# Verify webhook is set
curl "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getWebhookInfo"
```

### Step 4: Start Your Local Server

```bash
# Terminal 1: Start the API
yarn dev:api

# Terminal 2: Keep ngrok running
ngrok http 4000
```

### Step 5: Test!

1. Open Telegram and find your bot
2. Send a message like:
   ```
   Senior Software Engineer at Google
   Remote position
   $180k-$220k
   Applied through LinkedIn
   ```
3. Bot should reply: `✅ Created Google — Senior Software Engineer.`
4. Check your database - opportunity should be created!

## Checking Logs

```bash
# API logs will show:
# ✅ telegram: Webhook update accepted
# ✅ telegram: Received opportunity text
# ✅ webhook: create opportunity from text
# ✅ opportunity created
```

## Troubleshooting

### Bot doesn't respond

**Check webhook status:**
```bash
curl "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getWebhookInfo"
```

Look for:
- `url`: Should be your ngrok URL
- `has_custom_certificate`: false
- `pending_update_count`: 0 (if > 0, messages are queued)
- `last_error_date`: Should be empty

**Check API logs:**
```bash
yarn dev:api
# Look for incoming webhook calls
```

**Check ngrok:**
```bash
# Visit http://localhost:4040 to see ngrok dashboard
# Shows all incoming requests
```

### "TELEGRAM_BOT_TOKEN is required"

Add to `.env`:
```bash
TELEGRAM_BOT_TOKEN=<your-token>
```

### "TELEGRAM_WEBHOOK_SECRET_TOKEN is not configured"

Add to `.env`:
```bash
TELEGRAM_WEBHOOK_SECRET_TOKEN=<your-secret>
```

### "Backend opportunity webhook failed"

Check:
1. `TELEGRAM_BACKEND_WEBHOOK_URL` is correct
2. `OPPORTUNITY_WEBHOOK_SECRET` is set
3. API server is running

### Bot replies but no opportunity created

Check:
1. AI provider (OpenAI) is configured
2. Database connection works
3. `ALLOWED_EMAIL` is set correctly
4. Check API logs for AI extraction errors

## Testing Locally Without ngrok

If you want to test without ngrok, you can send webhook calls manually:

```bash
# 1. Start API
yarn dev:api

# 2. Send test webhook
curl -X POST "http://localhost:4000/webhooks/telegram" \
  -H "Content-Type: application/json" \
  -H "x-telegram-bot-api-secret-token: <YOUR_TELEGRAM_WEBHOOK_SECRET_TOKEN>" \
  -d '{
    "update_id": 123456,
    "message": {
      "message_id": 1,
      "chat": { "id": 12345 },
      "text": "Senior Engineer at Stripe, $200k, applied via referral",
      "from": { "id": 12345, "username": "testuser" }
    }
  }'
```

Note: Bot won't reply (no real Telegram chat), but opportunity will be created.

## Production Setup (Later)

For production deployment:

1. **Set production webhook URL:**
   ```bash
   TELEGRAM_BACKEND_WEBHOOK_URL=https://your-production-api.com/webhooks/opportunities/telegram
   ```

2. **Register production webhook:**
   ```bash
   curl -X POST "https://api.telegram.org/bot<BOT_TOKEN>/setWebhook" \
     -H "Content-Type: application/json" \
     -d '{
       "url": "https://your-production-api.com/webhooks/telegram",
       "secret_token": "<PROD_SECRET_TOKEN>"
     }'
   ```

3. **Add to CI/CD secrets:**
   - `TELEGRAM_BOT_TOKEN`
   - `TELEGRAM_WEBHOOK_SECRET_TOKEN`
   - `OPPORTUNITY_WEBHOOK_SECRET`

## Environment Variables Reference

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `TELEGRAM_BOT_TOKEN` | Yes | Bot token from BotFather | `123456:ABC...` |
| `TELEGRAM_WEBHOOK_SECRET_TOKEN` | Yes | Secret for Telegram webhook validation | Random 32-byte hex |
| `TELEGRAM_BACKEND_WEBHOOK_URL` | Yes | Internal webhook URL | `http://localhost:4000/webhooks/opportunities/telegram` |
| `OPPORTUNITY_WEBHOOK_SECRET` | Yes | Secret for internal webhook | Random 32-byte hex |

## Quick Start Commands

```bash
# 1. Generate secrets
echo "TELEGRAM_WEBHOOK_SECRET_TOKEN=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")"
echo "OPPORTUNITY_WEBHOOK_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")"

# 2. Add to .env (with your bot token)

# 3. Start ngrok
ngrok http 4000

# 4. Register webhook (replace <TOKEN>, <SECRET>, <NGROK_URL>)
curl -X POST "https://api.telegram.org/bot<TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{"url": "<NGROK_URL>/webhooks/telegram", "secret_token": "<SECRET>"}'

# 5. Start API
yarn dev:api

# 6. Send message to bot!
```

## Message Format

The bot expects natural language job descriptions. Examples:

✅ **Good messages:**
```
Senior Backend Engineer at Stripe
$180k-$220k, Remote
Applied through referral
```

```
Google - Staff SWE
Mountain View, CA
$250k base + equity
Recruiter reached out
```

✅ **Minimal message:**
```
Software Engineer role at Amazon
```

The AI will extract:
- Company name (required)
- Role title (required)
- Location (optional)
- Compensation (optional)
- How you heard about it (optional)

## Next Steps

1. ✅ Get bot token from BotFather (done)
2. ⬜ Add environment variables to `.env`
3. ⬜ Generate secrets
4. ⬜ Start ngrok tunnel
5. ⬜ Register webhook with Telegram
6. ⬜ Start local API
7. ⬜ Test by sending message to bot!
