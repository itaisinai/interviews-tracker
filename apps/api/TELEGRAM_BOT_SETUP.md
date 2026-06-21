
## How User Association Works

**Important**: The Telegram bot creates opportunities for the user specified in `ALLOWED_EMAIL`.

### Authentication Flow

1. **Telegram webhook is unauthenticated** - Telegram doesn't use Auth0 tokens
2. **Security is via shared secrets**:
   - `TELEGRAM_WEBHOOK_SECRET_TOKEN` - Validates requests come from Telegram
   - `OPPORTUNITY_WEBHOOK_SECRET` - Validates internal webhook calls
3. **User assignment**: Opportunities are created for `ALLOWED_EMAIL` user

```bash
# This is the user who will own all bot-created opportunities
ALLOWED_EMAIL=itai.sinai@gmail.com
```

### Why This Design?

- **Single-user app**: The app is designed for one user (`ALLOWED_EMAIL`)
- **Simple security**: Shared secrets instead of per-user auth
- **Private bot**: Your Telegram bot is for your personal use only

### Multi-User Support (Future)

If you want multiple users to use the bot:

1. **Option A**: Create separate bots per user
   - Each bot has its own `TELEGRAM_BOT_TOKEN`
   - Each bot configured with different `ALLOWED_EMAIL`

2. **Option B**: Add Telegram user ID mapping (requires code changes)
   - Map Telegram user IDs to email addresses
   - Lookup owner based on `message.from.id`
   - See `extractTelegramTextMessage` in `telegram-service.ts`

### Security Note

🔒 **Keep your bot token private!** Anyone with your bot token can send messages to your bot. The `TELEGRAM_WEBHOOK_SECRET_TOKEN` validates that webhook calls come from Telegram's servers, not random attackers.

