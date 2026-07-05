# Telegram Bot Authorization Fix

## Issue Summary

**Problem:** Telegram bot webhook was accepting requests but rejecting all messages with error:
```
Unauthorized: This bot can only be used by authorized users
```

**Root Cause:** The environment variable `TELEGRAM_ALLOWED_USER_IDS` was missing from AWS SSM Parameter Store. The authorization function (`isAuthorizedTelegramUser`) was correctly implemented but returned `false` as a fail-safe when no authorized users were configured.

## What Was Fixed

### 1. Enhanced Authorization Logging (`telegram-auth.ts`)
Added detailed logging to help diagnose authorization issues:
- Logs incoming `fromUserId` and `chatId`
- Logs configured allowed users/chats count
- Logs authorization decision (granted/denied) with reasoning
- Safe logging (no sensitive tokens/secrets)

### 2. Added Environment Variable Validation (`env-validation.ts`)
- Added `TELEGRAM_ALLOWED_USER_IDS` and `TELEGRAM_ALLOWED_CHAT_IDS` to optional variables list
- Added startup warning if Telegram bot is enabled but authorization not configured
- Shows count of authorized users/chats when properly configured

### 3. Updated Documentation (`telegram-query-feature.md`)
- Clarified how to find Telegram user ID (using @userinfobot or logs)
- Added production setup instructions with exact AWS CLI commands
- Explained SSM parameter setup and ECS restart requirement

### 4. Added Comprehensive Tests (`telegram-auth.test.ts`)
- 15 test cases covering all authorization scenarios
- Tests for single/multiple user IDs
- Tests for chat ID authorization
- Tests for edge cases (whitespace, empty strings, null values)
- All tests passing ✅

## Production Deployment Steps

### Step 1: Add the SSM Parameter

For the current user (Telegram user ID: `696472003`):

```bash
aws ssm put-parameter \
  --name /interviews-tracker/prod/TELEGRAM_ALLOWED_USER_IDS \
  --value "696472003" \
  --type String \
  --overwrite \
  --region eu-central-1
```

For multiple users (future-proof):
```bash
aws ssm put-parameter \
  --name /interviews-tracker/prod/TELEGRAM_ALLOWED_USER_IDS \
  --value "696472003,123456789,987654321" \
  --type String \
  --overwrite \
  --region eu-central-1
```

### Step 2: Verify the Parameter

```bash
aws ssm get-parameter \
  --name /interviews-tracker/prod/TELEGRAM_ALLOWED_USER_IDS \
  --region eu-central-1 \
  --query 'Parameter.Value' \
  --output text
```

Expected output: `696472003`

### Step 3: Restart ECS Service

Force ECS to restart tasks and pick up the new parameter:

```bash
aws ecs update-service \
  --cluster interviews-tracker \
  --service interviews-tracker \
  --force-new-deployment \
  --region eu-central-1
```

### Step 4: Verify in CloudWatch Logs

After restart, send a test message to the bot and check CloudWatch logs for:

```
✅ Success indicators:
- "Authorization check" with fromUserId: 696472003
- "Authorization granted via user ID"
- "Classified message intent"
- No "Unauthorized" errors

❌ Failure indicators (if still broken):
- "Authorization denied: User/chat not in allowed list"
- "Unauthorized: This bot can only be used by authorized users"
```

## How Authorization Works

1. **User sends message** → Telegram webhook calls `/webhooks/telegram`
2. **Webhook validates secret** → Ensures request is from Telegram
3. **Message handler extracts user info** → Gets `fromUserId` and `chatId`
4. **Authorization check** → `isAuthorizedTelegramUser()` validates:
   - Is `fromUserId` in `TELEGRAM_ALLOWED_USER_IDS`? ✓
   - OR is `chatId` in `TELEGRAM_ALLOWED_CHAT_IDS`? ✓
5. **Access granted/denied** → Continues or returns error

## Environment Variables

| Variable | Purpose | Example | Required |
|----------|---------|---------|----------|
| `TELEGRAM_ALLOWED_USER_IDS` | Comma-separated Telegram user IDs authorized to use queries | `696472003,123456789` | Yes (if bot enabled) |
| `TELEGRAM_ALLOWED_CHAT_IDS` | Comma-separated chat IDs (alternative to user IDs) | `696472003` | No |

**Note:** At least ONE of these must be configured when `TELEGRAM_BOT_TOKEN` is set, otherwise all query requests are denied as a security fail-safe.

## Finding Your Telegram User ID

### Method 1: Use @userinfobot (Recommended)
1. Open Telegram
2. Search for [@userinfobot](https://t.me/userinfobot)
3. Start a chat and click "Start"
4. Bot replies with your user ID (e.g., `696472003`)

### Method 2: Check Application Logs
Send any message to your bot and check CloudWatch logs for:
```
Received message
...
fromUserId: 696472003
username: YourUsername
```

## Security Notes

- **Fail-safe by default:** If no users/chats configured, all requests denied
- **User ID preferred over username:** Usernames can change; user IDs are permanent
- **Webhook secret separate from user auth:** Webhook validation protects endpoint; user auth protects data access
- **Safe logging:** Never logs bot token or webhook secret
- **SSM encryption:** Parameters stored as `String` type (or use `SecureString` for extra security)

## Testing Locally

### 1. Set environment variable:
```bash
export TELEGRAM_ALLOWED_USER_IDS=696472003
```

### 2. Start dev server:
```bash
npm run dev
```

### 3. Send test message to bot

### 4. Check terminal logs for:
```
✅ Telegram authorization configured: 1 allowed user(s), 0 allowed chat(s)
Authorization check
Authorization granted via user ID
```

## Troubleshooting

### "Unauthorized" still appearing after SSM update

**Cause:** ECS tasks haven't restarted to load new parameter

**Fix:** Force restart:
```bash
aws ecs update-service \
  --cluster interviews-tracker \
  --service interviews-tracker \
  --force-new-deployment \
  --region eu-central-1
```

### "Authorization denied: No allowed users or chats configured"

**Cause:** Parameter not in SSM or app didn't load it

**Check:**
```bash
# 1. Verify parameter exists
aws ssm get-parameter --name /interviews-tracker/prod/TELEGRAM_ALLOWED_USER_IDS --region eu-central-1

# 2. Check CloudWatch logs for SSM loading
# Look for: "Retrieved X parameters from SSM"
```

### Wrong user ID in logs

**Cause:** User ID typo or testing with different Telegram account

**Fix:** Get correct user ID from @userinfobot and update SSM parameter

## Files Changed

- ✅ `apps/api/src/services/telegram/telegram-auth.ts` - Enhanced logging
- ✅ `apps/api/src/config/env-validation.ts` - Added variables and startup warning
- ✅ `docs/telegram-query-feature.md` - Updated configuration section
- ✅ `apps/api/src/services/telegram/telegram-auth.test.ts` - New test file (15 tests)

## References

- [Telegram Bot API - Getting Updates](https://core.telegram.org/bots/api#getting-updates)
- [AWS SSM Parameter Store](https://docs.aws.amazon.com/systems-manager/latest/userguide/systems-manager-parameter-store.html)
- [Project Secrets Reference](./SECRETS_REFERENCE.md)
- [Telegram Query Feature Docs](./telegram-query-feature.md)

---

**Last Updated:** 2026-07-02
**Status:** Ready for deployment
