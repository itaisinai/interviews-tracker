#!/bin/bash

#
# Download Secrets from AWS SSM Parameter Store
#
# Fetches secrets and generates .env.production file
# Run this on the production server
#

set -e

REGION="eu-central-1"
PREFIX="/interviews-tracker/prod"
OUTPUT_FILE="/home/ubuntu/interviews-tracker/shared/.env.production"

echo "=========================================="
echo "Download Secrets from SSM Parameter Store"
echo "=========================================="
echo ""
echo "Region: $REGION"
echo "Prefix: $PREFIX"
echo "Output: $OUTPUT_FILE"
echo ""

# Check AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo "ERROR: AWS CLI is not installed"
    echo "Install on Ubuntu:"
    echo "  sudo apt-get install -y awscli"
    exit 1
fi

# Check if we're on the server
if [ ! -d "/home/ubuntu/interviews-tracker" ]; then
    echo "ERROR: This script should be run on the production server"
    echo "Run: ssh ubuntu@18.159.88.141 'bash -s' < ./scripts/secrets-download.sh"
    exit 1
fi

# Create shared directory if it doesn't exist
mkdir -p $(dirname "$OUTPUT_FILE")

# Fetch all parameters
echo "Fetching secrets from SSM..."
params=$(aws ssm get-parameters-by-path \
    --path "$PREFIX" \
    --with-decryption \
    --region "$REGION" \
    --output json)

# Check if any parameters were found
param_count=$(echo "$params" | jq '.Parameters | length')
if [ "$param_count" -eq 0 ]; then
    echo "ERROR: No parameters found at path: $PREFIX"
    echo "Make sure you've uploaded secrets first:"
    echo "  ./scripts/secrets-upload.sh"
    exit 1
fi

echo "Found $param_count parameters"
echo ""

# Create .env file
echo "# Production environment variables" > "$OUTPUT_FILE"
echo "# Generated from AWS SSM Parameter Store" >> "$OUTPUT_FILE"
echo "# Date: $(date)" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

# Parse JSON and write to .env
echo "$params" | jq -r '.Parameters[] | "\(.Name | split("/")[-1])=\"\(.Value)\""' >> "$OUTPUT_FILE"

# Set proper permissions
chmod 600 "$OUTPUT_FILE"

echo "✅ Environment file created: $OUTPUT_FILE"
echo ""
echo "Variables written:"
echo "$params" | jq -r '.Parameters[] | "  - \(.Name | split("/")[-1])"'
echo ""
echo "Next steps:"
echo "  1. Verify the file: cat $OUTPUT_FILE"
echo "  2. Deploy or restart: pm2 restart interviews-api"
echo ""
