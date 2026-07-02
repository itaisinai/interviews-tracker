# Secrets Reference - ECS Deployment

This document lists all secrets and environment variables needed for ECS deployment.

## Source of Truth

All environment variables are defined in:
- **Development:** `.env.dev`
- **Production:** `.env.prod` (template - real values in AWS SSM Parameter Store)

## Required AWS SSM Parameters

All parameters must exist at path: `/interviews-tracker/prod/*`

### Core Application

```bash
# Database
/interviews-tracker/prod/DATABASE_URL
/interviews-tracker/prod/PORT

# Auth0
/interviews-tracker/prod/AUTH0_DOMAIN
/interviews-tracker/prod/AUTH0_AUDIENCE
/interviews-tracker/prod/ALLOWED_EMAIL

# Frontend
/interviews-tracker/prod/FRONTEND_ORIGIN
```

### AI Services

```bash
# OpenAI (required)
/interviews-tracker/prod/OPENAI_API_KEY
/interviews-tracker/prod/OPENAI_MODEL
/interviews-tracker/prod/AI_PROVIDER

# Optional AI services
/interviews-tracker/prod/PERPLEXITY_API_KEY
/interviews-tracker/prod/EXA_API_KEY
/interviews-tracker/prod/COMPANY_RESEARCH_PROVIDER
```

### Gmail Integration

```bash
/interviews-tracker/prod/GMAIL_CLIENT_ID
/interviews-tracker/prod/GMAIL_CLIENT_SECRET
/interviews-tracker/prod/GMAIL_REDIRECT_URI
/interviews-tracker/prod/GMAIL_TOKEN_ENCRYPTION_KEY
```

### Telegram Bot

```bash
/interviews-tracker/prod/TELEGRAM_BOT_TOKEN
/interviews-tracker/prod/TELEGRAM_WEBHOOK_SECRET_TOKEN
/interviews-tracker/prod/TELEGRAM_BACKEND_WEBHOOK_URL
/interviews-tracker/prod/OPPORTUNITY_WEBHOOK_SECRET
/interviews-tracker/prod/TELEGRAM_ALLOWED_USER_IDS
/interviews-tracker/prod/TELEGRAM_ALLOWED_CHAT_IDS
```

### Frontend Environment Variables

These are passed to the frontend build:

```bash
/interviews-tracker/prod/VITE_API_BASE_URL
/interviews-tracker/prod/VITE_AUTH0_DOMAIN
/interviews-tracker/prod/VITE_AUTH0_CLIENT_ID
/interviews-tracker/prod/VITE_AUTH0_AUDIENCE
/interviews-tracker/prod/VITE_ALLOWED_EMAIL
```

### Optional Services

```bash
# Sentry error tracking (optional)
/interviews-tracker/prod/SENTRY_DSN
/interviews-tracker/prod/SENTRY_ENVIRONMENT

# Chrome extension (if used)
/interviews-tracker/prod/CHROME_EXTENSION_ORIGIN
```

---

## GitHub Actions Secrets

Required for deployment workflow (`.github/workflows/deploy-api-ecs.yml`):

### Option 1: OIDC Authentication (Recommended)

```
AWS_ROLE_ARN = arn:aws:iam::669424048162:role/GitHubActionsDeployRole
```

### Option 2: Access Keys

```
AWS_ACCESS_KEY_ID = AKIAXXXXXXXXXXXXXXXX
AWS_SECRET_ACCESS_KEY = xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**Note:** You must choose ONE authentication method. See QUICK_START_ECS.md for setup.

---

## Development Mode Variables

These are ONLY for local development and should NEVER be in production:

```bash
DEV_MODE_BYPASS_AUTH=false
DEV_MODE_USER_EMAIL=dev@local.test
VITE_DEV_MODE_BYPASS_AUTH=false
VITE_DEV_MODE_USER_EMAIL=dev@local.test
```

**WARNING:** The backend will refuse to start if `DEV_MODE_BYPASS_AUTH=true` with a non-local database.

---

## Migrating from .env.prod to SSM

To migrate your local `.env.prod` to AWS SSM Parameter Store:

```bash
#!/bin/bash
# migrate-secrets-to-ssm.sh

# Source the .env.prod file
set -a
source .env.prod
set +a

# Function to add parameter
add_param() {
  local name=$1
  local value=$2
  
  if [ -n "$value" ]; then
    aws ssm put-parameter \
      --name "/interviews-tracker/prod/$name" \
      --value "$value" \
      --type SecureString \
      --region eu-central-1 \
      --overwrite
    echo "✅ Added: $name"
  else
    echo "⚠️  Skipped (empty): $name"
  fi
}

# Required parameters
add_param "DATABASE_URL" "$DATABASE_URL"
add_param "AUTH0_DOMAIN" "$AUTH0_DOMAIN"
add_param "AUTH0_AUDIENCE" "$AUTH0_AUDIENCE"
add_param "ALLOWED_EMAIL" "$ALLOWED_EMAIL"
add_param "FRONTEND_ORIGIN" "$FRONTEND_ORIGIN"
add_param "PORT" "$PORT"

# AI
add_param "OPENAI_API_KEY" "$OPENAI_API_KEY"
add_param "OPENAI_MODEL" "$OPENAI_MODEL"
add_param "AI_PROVIDER" "$AI_PROVIDER"
add_param "PERPLEXITY_API_KEY" "$PERPLEXITY_API_KEY"
add_param "EXA_API_KEY" "$EXA_API_KEY"
add_param "COMPANY_RESEARCH_PROVIDER" "$COMPANY_RESEARCH_PROVIDER"

# Gmail
add_param "GMAIL_CLIENT_ID" "$GMAIL_CLIENT_ID"
add_param "GMAIL_CLIENT_SECRET" "$GMAIL_CLIENT_SECRET"
add_param "GMAIL_REDIRECT_URI" "$GMAIL_REDIRECT_URI"
add_param "GMAIL_TOKEN_ENCRYPTION_KEY" "$GMAIL_TOKEN_ENCRYPTION_KEY"

# Telegram
add_param "TELEGRAM_BOT_TOKEN" "$TELEGRAM_BOT_TOKEN"
add_param "TELEGRAM_WEBHOOK_SECRET_TOKEN" "$TELEGRAM_WEBHOOK_SECRET_TOKEN"
add_param "TELEGRAM_BACKEND_WEBHOOK_URL" "$TELEGRAM_BACKEND_WEBHOOK_URL"
add_param "OPPORTUNITY_WEBHOOK_SECRET" "$OPPORTUNITY_WEBHOOK_SECRET"
add_param "TELEGRAM_ALLOWED_USER_IDS" "$TELEGRAM_ALLOWED_USER_IDS"
add_param "TELEGRAM_ALLOWED_CHAT_IDS" "$TELEGRAM_ALLOWED_CHAT_IDS"

# Frontend (Vite)
add_param "VITE_API_BASE_URL" "$VITE_API_BASE_URL"
add_param "VITE_AUTH0_DOMAIN" "$VITE_AUTH0_DOMAIN"
add_param "VITE_AUTH0_CLIENT_ID" "$VITE_AUTH0_CLIENT_ID"
add_param "VITE_AUTH0_AUDIENCE" "$VITE_AUTH0_AUDIENCE"
add_param "VITE_ALLOWED_EMAIL" "$VITE_ALLOWED_EMAIL"

# Optional
add_param "SENTRY_DSN" "$SENTRY_DSN"
add_param "SENTRY_ENVIRONMENT" "$SENTRY_ENVIRONMENT"
add_param "CHROME_EXTENSION_ORIGIN" "$CHROME_EXTENSION_ORIGIN"

echo ""
echo "✅ Migration complete!"
echo ""
echo "Verify parameters:"
echo "aws ssm get-parameters-by-path --path /interviews-tracker/prod --region eu-central-1 --output table"
```

**Usage:**
```bash
chmod +x migrate-secrets-to-ssm.sh
./migrate-secrets-to-ssm.sh
```

---

## Verifying SSM Parameters

```bash
# List all parameters
aws ssm get-parameters-by-path \
  --path /interviews-tracker/prod \
  --recursive \
  --region eu-central-1 \
  --output table

# Get specific parameter
aws ssm get-parameter \
  --name /interviews-tracker/prod/DATABASE_URL \
  --with-decryption \
  --region eu-central-1 \
  --query 'Parameter.Value' \
  --output text

# Count parameters
aws ssm get-parameters-by-path \
  --path /interviews-tracker/prod \
  --recursive \
  --region eu-central-1 \
  --query 'Parameters | length(@)'
```

---

## Updating Parameters

### Update a value (no Terraform needed)

```bash
# Update parameter
aws ssm put-parameter \
  --name /interviews-tracker/prod/OPENAI_API_KEY \
  --value "sk-proj-new-key" \
  --type SecureString \
  --region eu-central-1 \
  --overwrite

# Restart ECS tasks to pick up new value
aws ecs update-service \
  --cluster interviews-tracker \
  --service interviews-tracker \
  --force-new-deployment \
  --region eu-central-1
```

### Add a new parameter (requires Terraform)

```bash
# 1. Add to SSM
aws ssm put-parameter \
  --name /interviews-tracker/prod/NEW_VAR \
  --value "value" \
  --type SecureString \
  --region eu-central-1

# 2. Run Terraform to update task definition
cd infra
terraform apply

# 3. ECS will automatically deploy new task definition
```

### Remove a parameter (requires Terraform)

```bash
# 1. Delete from SSM
aws ssm delete-parameter \
  --name /interviews-tracker/prod/OLD_VAR \
  --region eu-central-1

# 2. Run Terraform to update task definition
cd infra
terraform apply
```

---

## Security Notes

1. **Never commit secrets to Git**
   - `.env`, `.env.prod`, `.env.dev` are in `.gitignore`
   - Only `.env.example` should be committed

2. **SSM Parameters are encrypted**
   - All parameters use type `SecureString`
   - Encrypted at rest with AWS KMS
   - Only accessible via IAM permissions

3. **IAM Role Permissions**
   - ECS execution role can read ALL parameters under `/interviews-tracker/prod/*`
   - Limited to specific path prefix
   - Cannot access other applications' parameters

4. **Rotation**
   - Rotate sensitive keys regularly (API keys, secrets)
   - Update in SSM → restart ECS tasks
   - No application downtime needed

---

## Troubleshooting

### "Environment variable not found" error

**Symptom:** Application logs show missing environment variable

**Fix:**
1. Check if parameter exists in SSM:
   ```bash
   aws ssm get-parameter --name /interviews-tracker/prod/VAR_NAME --region eu-central-1
   ```

2. If missing, add it:
   ```bash
   aws ssm put-parameter --name /interviews-tracker/prod/VAR_NAME --value "value" --type SecureString --region eu-central-1
   cd infra && terraform apply
   ```

### "Access denied" when reading SSM parameters

**Symptom:** ECS task fails to start with SSM access denied error

**Fix:** Check IAM execution role has correct policy:
```bash
aws iam get-role-policy \
  --role-name interviews-tracker-ecs-execution-role \
  --policy-name interviews-tracker-ecs-execution-ssm-policy
```

Should include:
```json
{
  "Effect": "Allow",
  "Action": ["ssm:GetParameters", "ssm:GetParameter", "ssm:GetParametersByPath"],
  "Resource": "arn:aws:ssm:eu-central-1:669424048162:parameter/interviews-tracker/prod/*"
}
```

### Parameter values not updating

**Symptom:** Changed parameter value but application still uses old value

**Fix:** Force ECS to restart tasks:
```bash
aws ecs update-service \
  --cluster interviews-tracker \
  --service interviews-tracker \
  --force-new-deployment \
  --region eu-central-1
```

ECS tasks load parameters at startup, not during runtime.

---

## Reference Links

- [AWS SSM Parameter Store Documentation](https://docs.aws.amazon.com/systems-manager/latest/userguide/systems-manager-parameter-store.html)
- [ECS Secrets Management](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/specifying-sensitive-data.html)
- [.env.example](../.env.example) - Template with all variables
- [.env.prod](../.env.prod) - Production template
