# Environment Variables Strategy

This document explains how environment variables are loaded and managed across different environments.

---

## Loading Strategy

Environment variables are loaded in this order (later sources override earlier ones):

```
1. .env.dev        (development defaults, committed to git)
2. .env            (local overrides, gitignored)
3. Parameter Store (production fallback for missing variables)
```

### Development

```
.env.dev    → Contains minimal dev defaults
.env        → Your local secrets (DATABASE_URL, API keys, etc.)
```

If a variable exists in `.env`, it overrides `.env.dev`.

### Production

```
.env.dev          → Ignored (not deployed)
.env              → Ignored (not deployed)
Parameter Store   → Source of truth for ALL production secrets
```

**In production**, the API automatically loads missing variables from AWS Parameter Store at `/interviews-tracker/prod/*`.

---

## File Purposes

### `.env.dev` (Committed to Git)

**Purpose:** Minimal development defaults that work for most developers

**Contains:**

- `DATABASE_URL` - Neon database (shared dev database)
- `ALLOWED_EMAIL` - Your email
- `FRONTEND_ORIGIN` - `http://localhost:5173`
- `PORT` - `4000`
- `VITE_API_BASE_URL` - `http://localhost:4000/api`
- Basic config that's safe to share

**Does NOT contain:**

- API keys (OpenAI, etc.)
- OAuth secrets (Gmail, Telegram)
- Encryption keys
- Production URLs

**Why commit this?**

- Gets new developers started quickly
- Documents required variables
- No secrets = safe to commit

### `.env` (Gitignored, Local Only)

**Purpose:** Your personal local overrides and secrets

**Contains:**

- API keys you need for local development
- OAuth credentials
- Any overrides to `.env.dev` values

**Example:**

```bash
# Override database if you want local PostgreSQL
DATABASE_URL="postgresql://jobcrm:jobcrm@localhost:5433/jobcrm"

# Your API keys for AI features
OPENAI_API_KEY="sk-proj-your-key"
EXA_API_KEY="your-key"

# OAuth credentials for Gmail integration
GMAIL_CLIENT_SECRET="your-secret"
GMAIL_TOKEN_ENCRYPTION_KEY="your-key"
```

**Never commit this file** - it contains your personal secrets.

### `.env.prod` (Committed to Git)

**Purpose:** Template/documentation showing what production needs

**Contains:** Placeholder values only

```bash
DATABASE_URL="postgresql://user:pass@host:5432/db"
OPENAI_API_KEY="sk-proj-xxxxx"
# ... etc with fake values
```

**This is documentation**, not actual config. Real production values are in Parameter Store.

### `.env.prod.secrets` (Gitignored, Local Only)

**Purpose:** Real production values for bulk uploading to Parameter Store

**Contains:** Actual production secrets (if you need them locally)

**Usage:**

```bash
# Create from template
cp .env.prod .env.prod.secrets

# Edit with real production values
nano .env.prod.secrets

# Upload to Parameter Store
yarn secrets:upload
```

**Never commit this file** - it contains real production secrets.

---

## How It Works

### Development (Local)

```typescript
// apps/api/src/server.ts
await loadEnvironment();
```

This loads:

1. `.env.dev` - Gets basic defaults
2. `.env` - Overrides with your secrets

Result: `process.env` has everything you need.

### Production (AWS Lightsail)

```typescript
// apps/api/src/server.ts
await loadEnvironment();
```

This loads:

1. `.env.dev` - Skipped (not deployed)
2. `.env` - Skipped (not deployed)
3. **AWS Parameter Store** - Fetches all variables from `/interviews-tracker/prod/*`

Result: `process.env` has all production secrets from Parameter Store.

---

## Adding a New Environment Variable

### For Development

1. Add to `.env.dev` if it's safe to share (e.g., `PORT=4000`)
2. Or add to your local `.env` if it's a secret (e.g., `OPENAI_API_KEY`)

### For Production

1. Add to AWS Parameter Store:

   ```bash
   # Via AWS Console
   Parameter Store → Create parameter
   Name: /interviews-tracker/prod/NEW_VARIABLE
   Value: actual-value

   # Or via CLI
   aws ssm put-parameter \
     --name /interviews-tracker/prod/NEW_VARIABLE \
     --value "actual-value" \
     --type SecureString \
     --region eu-central-1
   ```

2. Restart the API:
   ```bash
   ssh ubuntu@18.159.88.141 "pm2 restart interviews-api"
   ```

That's it! The API will automatically load it from Parameter Store on startup.

---

## Fallback Behavior

### Variable Missing in Development

```
Error: Missing required environment variable: OPENAI_API_KEY

In development: Add to .env.dev or .env
In production: Add to AWS Parameter Store at /interviews-tracker/prod/OPENAI_API_KEY
```

The API will **fail to start** with a clear error message.

### Variable Missing in Production

The API tries to load from Parameter Store. If still missing:

```
Error: Missing required environment variable: OPENAI_API_KEY

In production: Add to AWS Parameter Store at /interviews-tracker/prod/OPENAI_API_KEY
```

The API will **fail to start**.

---

## Migration from Old Approach

### Before (Manual `.env` file on server)

```bash
# On server
/home/ubuntu/interviews-tracker/shared/.env.production
```

Problem: Easy to get out of sync, no version control, manual edits.

### After (Parameter Store with automatic loading)

```bash
# In AWS
/interviews-tracker/prod/DATABASE_URL
/interviews-tracker/prod/OPENAI_API_KEY
...
```

Benefit: Source of truth, encrypted, audited, automatically loaded.

### You Don't Need `.env.production` Anymore!

The `scripts/secrets-download.sh` script still exists for backward compatibility, but **the API no longer needs it**.

The API loads directly from Parameter Store at startup.

**You can still use it** if you want to generate a file for inspection:

```bash
yarn secrets:download
ssh ubuntu@18.159.88.141 "cat /home/ubuntu/interviews-tracker/shared/.env.production"
```

---

## Best Practices

### ✅ Do

- **Commit** `.env.dev` with safe defaults
- **Commit** `.env.prod` as a template (placeholders only)
- **Use** `.env` for your local secrets
- **Store** production secrets in Parameter Store
- **Document** new variables in `.env.prod` template

### ❌ Don't

- **Don't** commit `.env` (gitignored)
- **Don't** commit `.env.prod.secrets` (gitignored)
- **Don't** put real secrets in `.env.dev` or `.env.prod`
- **Don't** manually edit `/home/ubuntu/interviews-tracker/shared/.env.production` on the server
- **Don't** rely on environment variables being loaded manually

---

## Examples

### Example: Adding Gmail OAuth

**Development:**

```bash
# In your local .env
GMAIL_CLIENT_ID="your-dev-client-id"
GMAIL_CLIENT_SECRET="your-dev-secret"
GMAIL_REDIRECT_URI="http://localhost:4000/api/gmail/callback"
```

**Production:**

```bash
# In AWS Parameter Store
/interviews-tracker/prod/GMAIL_CLIENT_ID = "your-prod-client-id"
/interviews-tracker/prod/GMAIL_CLIENT_SECRET = "your-prod-secret"
/interviews-tracker/prod/GMAIL_REDIRECT_URI = "https://interviews-api.trackylab.com/api/gmail/callback"
```

**Template (in `.env.prod`):**

```bash
GMAIL_CLIENT_ID="your-oauth-client-id"
GMAIL_CLIENT_SECRET="your-oauth-client-secret"
GMAIL_REDIRECT_URI="https://your-api.com/api/gmail/callback"
```

### Example: Different Database per Environment

**Development:**

```bash
# .env.dev (shared dev database)
DATABASE_URL="xxxxx"

# Your local .env (override with local PostgreSQL)
DATABASE_URL="postgresql://jobcrm:jobcrm@localhost:5433/jobcrm"
```

**Production:**

```bash
# Parameter Store
/interviews-tracker/prod/DATABASE_URL = "postgresql://neondb_owner:PROD_PASSWORD@ep-fancy-king-aq885qs5.c-8.us-east-1.aws.neon.tech/neondb?sslmode=require"
```

---

## Summary

| Environment  | Source              | Committed?         | Encrypted?            |
| ------------ | ------------------- | ------------------ | --------------------- |
| **Dev**      | `.env.dev`          | ✅ Yes             | ❌ No (no secrets)    |
| **Dev**      | `.env`              | ❌ No (gitignored) | ❌ No                 |
| **Prod**     | Parameter Store     | N/A                | ✅ Yes (SecureString) |
| **Template** | `.env.prod`         | ✅ Yes             | ❌ No (placeholders)  |
| **Upload**   | `.env.prod.secrets` | ❌ No (gitignored) | ❌ No                 |

**Key insight:** Development uses files, production uses Parameter Store with automatic loading.

---

**Last Updated:** 2026-06-30
