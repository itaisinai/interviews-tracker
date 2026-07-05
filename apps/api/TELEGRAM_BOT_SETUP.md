# Telegram Bot Setup

The Telegram bot is implemented inside the API and is intended for the current single-owner deployment model.

## User association

Telegram webhooks do not carry Auth0 user tokens. Bot-created opportunities are assigned to the owner configured by `ALLOWED_EMAIL`.

```text
ALLOWED_EMAIL=<owner email>
```

## Security model

Requests are protected by shared secrets and allow-lists:

- `TELEGRAM_WEBHOOK_SECRET_TOKEN` validates requests sent by Telegram.
- `OPPORTUNITY_WEBHOOK_SECRET` protects internal opportunity-creation webhook paths.
- `TELEGRAM_ALLOWED_USER_IDS` and/or `TELEGRAM_ALLOWED_CHAT_IDS` restrict who can use the bot.

Authorization fails closed when no allowed user/chat configuration exists.

## Production checklist

1. Store Telegram and internal webhook secrets in AWS SSM Parameter Store.
2. Configure at least one allowed Telegram user ID or chat ID.
3. Configure the webhook URL to point at the API Telegram webhook route.
4. Restart or redeploy the API so it reloads SSM-backed environment variables.
5. Send `/start` from an allowed account.
6. Check API logs for authorization and handler decisions.

For the full operational runbook, see [Deployment and operations](../../docs/deployment-and-operations.md). For workflow behavior, see [Application workflows](../../docs/application-workflows.md).
