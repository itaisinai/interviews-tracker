#!/bin/bash

#
# Upload Secrets to AWS SSM Parameter Store
#
# Reads from .env.prod and uploads each variable as a separate parameter
#

set -e

REGION="eu-central-1"
PREFIX="/interviews-tracker/prod"
ENV_FILE=".env.prod.secrets"

if [ ! -f "$ENV_FILE" ]; then
    echo "ERROR: $ENV_FILE not found"
    echo ""
    echo "This file should contain your real production secrets."
    echo "It is NOT committed to git (.gitignore excludes it)."
    echo ""
    echo "To create it:"
    echo "  1. Copy template: cp .env.prod .env.prod.secrets"
    echo "  2. Edit with real values: nano .env.prod.secrets"
    echo "  3. Run this script again"
    echo ""
    exit 1
fi

echo "=========================================="
echo "Upload Secrets to AWS SSM Parameter Store"
echo "=========================================="
echo ""
echo "This will upload secrets from $ENV_FILE to SSM"
echo "Region: $REGION"
echo "Prefix: $PREFIX"
echo ""

# Check AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo "ERROR: AWS CLI is not installed"
    echo "Install: https://docs.aws.amazon.com/cli/latest/userguide/install-cliv2.html"
    exit 1
fi

# Check AWS credentials
if ! aws sts get-caller-identity &> /dev/null; then
    echo "ERROR: AWS credentials not configured"
    echo "Run: aws configure"
    exit 1
fi

echo "AWS Account: $(aws sts get-caller-identity --query Account --output text)"
echo ""

read -p "Continue uploading secrets? [y/N] " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Cancelled"
    exit 0
fi

# List of sensitive variables that should use SecureString
SECURE_VARS=(
    "DATABASE_URL"
    "OPENAI_API_KEY"
    "PERPLEXITY_API_KEY"
    "EXA_API_KEY"
    "GMAIL_CLIENT_SECRET"
    "GMAIL_TOKEN_ENCRYPTION_KEY"
    "TELEGRAM_BOT_TOKEN"
    "TELEGRAM_WEBHOOK_SECRET_TOKEN"
    "OPPORTUNITY_WEBHOOK_SECRET"
    "SENTRY_DSN"
)

# Check if variable should be secure
is_secure_var() {
    local var_name=$1
    for secure in "${SECURE_VARS[@]}"; do
        if [ "$var_name" = "$secure" ]; then
            return 0
        fi
    done
    return 1
}

echo ""
echo "Uploading secrets..."
count=0

# Parse .env file and upload
while IFS='=' read -r key value || [ -n "$key" ]; do
    # Skip comments and empty lines
    [[ $key =~ ^#.*$ ]] && continue
    [[ -z $key ]] && continue

    # Remove leading/trailing whitespace
    key=$(echo "$key" | xargs)
    value=$(echo "$value" | xargs)

    # Remove quotes from value if present
    value=$(echo "$value" | sed -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'$//")

    # Skip if value is empty
    [[ -z $value ]] && continue

    # Determine parameter type
    if is_secure_var "$key"; then
        param_type="SecureString"
        display="********"
    else
        param_type="String"
        display="$value"
    fi

    # Upload to SSM
    echo "  $key = $display ($param_type)"
    aws ssm put-parameter \
        --name "${PREFIX}/${key}" \
        --value "$value" \
        --type "$param_type" \
        --region "$REGION" \
        --overwrite \
        > /dev/null

    count=$((count + 1))

done < <(grep -v '^\s*$' "$ENV_FILE")

echo ""
echo "✅ Uploaded $count secrets to SSM Parameter Store"
echo ""
echo "Verify:"
echo "  aws ssm get-parameters-by-path --path $PREFIX --region $REGION"
echo ""
