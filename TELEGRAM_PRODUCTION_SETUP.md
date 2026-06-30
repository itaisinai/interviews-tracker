# Telegram Bot - Production Setup Guide

## Quick Setup for Render

### 1. Add Environment Variables in Render

Go to: **Render Dashboard → Your Service → Environment**

Add these 2 missing variables:

```bash
# Generate this secret
OPPORTUNITY_WEBHOOK_SECRET=<run: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))">

# Replace with your actual Render URL
TELEGRAM_BACKEND_WEBHOOK_URL=https://interviews-api.trackylab.com/webhooks/opportunities/telegram
```

You should already have:
- ✅ `TELEGRAM_BOT_TOKEN`
- ✅ `TELEGRAM_WEBHOOK_SECRET_TOKEN`
- ✅ `ALLOWED_EMAIL`

### 2. Deploy

Render will auto-deploy when you add environment variables, or:
- Click **Manual Deploy** → **Deploy latest commit**

### 3. Register Webhook

Once your API is deployed, run:

```bash
./register-webhook-production.sh
```

Or manually:

```bash
curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://interviews-api.trackylab.com/webhooks/telegram",
    "secret_token": "<YOUR_TELEGRAM_WEBHOOK_SECRET_TOKEN>"
  }'
```

### 4. Verify

```bash
curl "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getWebhookInfo"
```

Should show:
```json
{
  "ok": true,
  "result": {
    "url": "https://interviews-api.trackylab.com/webhooks/telegram",
    "pending_update_count": 0
  }
}
```

### 5. Test!

Send a message to your bot in Telegram. It should work immediately! 🎉

---

## Complete Environment Variables Checklist

Make sure you have all these in Render:

### Telegram Bot
- [ ] `TELEGRAM_BOT_TOKEN` - From BotFather
- [ ] `TELEGRAM_WEBHOOK_SECRET_TOKEN` - Random 32-byte hex
- [ ] `TELEGRAM_BACKEND_WEBHOOK_URL` - `https://interviews-api.trackylab.com/webhooks/opportunities/telegram`
- [ ] `OPPORTUNITY_WEBHOOK_SECRET` - Random 32-byte hex

### User
- [ ] `ALLOWED_EMAIL` - Your email (e.g., `itai.sinai@gmail.com`)

### Database
- [ ] `DATABASE_URL`
- [ ] `SOURCE_DATABASE_URL` (if separate)

### Auth
- [ ] `AUTH0_DOMAIN`
- [ ] `AUTH0_AUDIENCE`

### AI
- [ ] `AI_PROVIDER`
- [ ] `OPENAI_API_KEY`
- [ ] `OPENAI_MODEL`

### Other Integrations
- [ ] `COMPANY_RESEARCH_PROVIDER`
- [ ] `EXA_API_KEY`
- [ ] `GMAIL_CLIENT_ID`
- [ ] `GMAIL_CLIENT_SECRET`
- [ ] `GMAIL_REDIRECT_URI`
- [ ] `GMAIL_TOKEN_ENCRYPTION_KEY`

---

## Troubleshooting

### Bot doesn't respond in production

**Check webhook status:**
```bash
curl "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getWebhookInfo"
```

Look for:
- `url` matches your production URL
- `pending_update_count` is 0
- No `last_error_date` or `last_error_message`

**Check Render logs:**
- Go to Render Dashboard → Your Service → Logs
- Look for incoming webhook calls
- Check for errors

**Test API health:**
```bash
curl https://interviews-api.trackylab.com/health
```

Should return: `{"ok":true,"service":"api"}`

### "Invalid webhook secret" error

Your `TELEGRAM_WEBHOOK_SECRET_TOKEN` in Render doesn't match what you used to register the webhook.

**Fix:**
1. Check the value in Render
2. Re-register webhook with same value

### Webhook shows old URL

You need to update the webhook:
```bash
./register-webhook-production.sh
```

### Environment variable not found

After adding env vars in Render, you MUST redeploy:
- Manual Deploy → Deploy latest commit

---

## Switching Between Local and Production

### Local Development
- Uses ngrok tunnel
- Webhook: `https://xxx.ngrok-free.app/webhooks/telegram`
- Register with: `./register-webhook.sh`

### Production
- Uses Render URL
- Webhook: `https://interviews-api.trackylab.com/webhooks/telegram`
- Register with: `./register-webhook-production.sh`

**Note:** Telegram can only have ONE webhook URL at a time.

To switch back to local testing:
1. Stop production webhook: `curl -X POST "https://api.telegram.org/bot<TOKEN>/deleteWebhook"`
2. Register local webhook: `./register-webhook.sh`

To switch back to production:
1. Run: `./register-webhook-production.sh`

---

## Security Notes

🔒 **Keep these secret:**
- `TELEGRAM_BOT_TOKEN` - Anyone with this can control your bot
- `TELEGRAM_WEBHOOK_SECRET_TOKEN` - Validates requests are from Telegram
- `OPPORTUNITY_WEBHOOK_SECRET` - Validates internal webhook calls

✅ **Safe to use:**
- Render URLs are public
- Webhook endpoint `/webhooks/telegram` is public
- Security is via the secret tokens

---

## Next Steps

After production setup:
1. ✅ Test the bot by sending `/start`
2. ✅ Create a test opportunity
3. ✅ Check it appears in your web app
4. ✅ Celebrate! 🎉

