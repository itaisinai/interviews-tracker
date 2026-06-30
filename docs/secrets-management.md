# Secrets Management with AWS SSM Parameter Store

This guide explains how to securely manage production secrets using AWS Systems Manager Parameter Store.

---

## Why AWS SSM Parameter Store?

**Benefits:**
- ✅ **Free** for standard parameters (up to 10,000)
- ✅ **Encrypted** using AWS KMS
- ✅ **Versioned** - track changes over time
- ✅ **IAM-controlled** - fine-grained access control
- ✅ **Auditable** - CloudTrail logs all access
- ✅ **No additional services** - already available in AWS

**Better than:**
- ❌ `.env` files on server (no encryption, visible in filesystem)
- ❌ Hardcoded in code (leaked in git history)
- ❌ Environment variables in PM2 (visible in process list)

---

## Architecture

### Storage Structure

Secrets are stored in SSM Parameter Store with this hierarchy:

```
/interviews-tracker/prod/
├── DATABASE_URL (SecureString)
├── AUTH0_DOMAIN (String)
├── AUTH0_AUDIENCE (String)
├── ALLOWED_EMAIL (String)
├── OPENAI_API_KEY (SecureString)
├── GMAIL_CLIENT_SECRET (SecureString)
└── ... (all other env vars)
```

**Parameter Types:**
- `SecureString` - Encrypted using AWS KMS (for passwords, API keys, tokens)
- `String` - Plain text (for non-sensitive config like domains, URLs)

### Workflow

```
1. Local: Edit .env.prod with production values
2. Local: Run scripts/secrets-upload.sh → Uploads to SSM
3. Server: Run scripts/secrets-download.sh → Generates .env.production
4. Server: PM2 loads .env.production at startup
```

---

## Setup

### 1. Install AWS CLI (if not already installed)

**On your local machine:**

```bash
# macOS
brew install awscli

# Linux
sudo apt-get install awscli

# Or use the official installer
curl "https://awscli.amazonaws.com/AWSCLIV2.pkg" -o "AWSCLIV2.pkg"
sudo installer -pkg AWSCLIV2.pkg -target /
```

### 2. Configure AWS Credentials

```bash
aws configure
```

**Enter:**
- AWS Access Key ID: (Your IAM user key)
- AWS Secret Access Key: (Your IAM secret)
- Default region: `eu-central-1` (same as Lightsail)
- Default output format: `json`

**Test:**
```bash
aws sts get-caller-identity
```

### 3. Configure IAM Permissions

Your AWS user/role needs these permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ssm:PutParameter",
        "ssm:GetParameter",
        "ssm:GetParameters",
        "ssm:GetParametersByPath",
        "ssm:DeleteParameter"
      ],
      "Resource": "arn:aws:ssm:eu-central-1:*:parameter/interviews-tracker/*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "kms:Decrypt",
        "kms:Encrypt"
      ],
      "Resource": "*"
    }
  ]
}
```

**To add this policy:**
1. Go to AWS IAM Console
2. Select your user
3. Add inline policy with the JSON above

### 4. Configure Lightsail Instance

Your Lightsail instance needs permission to read from SSM.

**Option A: Attach IAM Role (Recommended)**

1. Create IAM role for EC2 with this policy:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ssm:GetParameter",
        "ssm:GetParameters",
        "ssm:GetParametersByPath"
      ],
      "Resource": "arn:aws:ssm:eu-central-1:*:parameter/interviews-tracker/prod/*"
    },
    {
      "Effect": "Allow",
      "Action": "kms:Decrypt",
      "Resource": "*"
    }
  ]
}
```

2. Attach role to Lightsail instance:
   - Unfortunately, Lightsail doesn't support attaching IAM roles directly
   - You'll need to use Option B

**Option B: Configure AWS CLI on Server**

```bash
ssh ubuntu@18.159.88.141
aws configure
# Enter credentials for a user with SSM read permissions
```

---

## Usage

### Upload Secrets to SSM

**1. Edit `.env.prod` with production values:**

```bash
# Update .env.prod locally (DO NOT commit to git)
nano .env.prod
```

**2. Upload to SSM:**

```bash
./scripts/secrets-upload.sh
```

**What it does:**
- Reads `.env.prod`
- Uploads each variable to SSM at `/interviews-tracker/prod/{VAR_NAME}`
- Uses `SecureString` for sensitive vars (passwords, API keys)
- Uses `String` for non-sensitive vars (domains, ports)

**Output:**
```
==========================================
Upload Secrets to AWS SSM Parameter Store
==========================================

This will upload secrets from .env.prod to SSM
Region: eu-central-1
Prefix: /interviews-tracker/prod

AWS Account: 123456789012

Continue uploading secrets? [y/N] y

Uploading secrets...
  DATABASE_URL = ******** (SecureString)
  AUTH0_DOMAIN = dev-c1s005zh8spezp0e.us.auth0.com (String)
  AUTH0_AUDIENCE = https://interviews-tracker-api.com (String)
  ...

✅ Uploaded 25 secrets to SSM Parameter Store
```

### Download Secrets on Server

**Run on production server:**

```bash
ssh ubuntu@18.159.88.141 'bash -s' < ./scripts/secrets-download.sh
```

**Or SSH first, then run:**

```bash
ssh ubuntu@18.159.88.141
./interviews-tracker/current/scripts/secrets-download.sh
```

**What it does:**
- Fetches all parameters from `/interviews-tracker/prod/`
- Decrypts SecureString values
- Generates `/home/ubuntu/interviews-tracker/shared/.env.production`
- Sets proper file permissions (600)

**Output:**
```
==========================================
Download Secrets from SSM Parameter Store
==========================================

Region: eu-central-1
Prefix: /interviews-tracker/prod
Output: /home/ubuntu/interviews-tracker/shared/.env.production

Fetching secrets from SSM...
Found 25 parameters

✅ Environment file created
```

### Verify Secrets

**List all secrets in SSM:**

```bash
aws ssm get-parameters-by-path \
  --path /interviews-tracker/prod \
  --region eu-central-1 \
  --output table
```

**Get specific secret:**

```bash
# Without decryption (shows metadata only)
aws ssm get-parameter \
  --name /interviews-tracker/prod/DATABASE_URL \
  --region eu-central-1

# With decryption (shows actual value)
aws ssm get-parameter \
  --name /interviews-tracker/prod/DATABASE_URL \
  --with-decryption \
  --region eu-central-1 \
  --query 'Parameter.Value' \
  --output text
```

---

## Updating Secrets

### Change a Secret

**Option 1: Re-upload all (recommended)**

```bash
# Edit .env.prod
nano .env.prod

# Upload all secrets
./scripts/secrets-upload.sh

# Download on server
ssh ubuntu@18.159.88.141 'bash -s' < ./scripts/secrets-download.sh

# Restart API
ssh ubuntu@18.159.88.141 "pm2 restart interviews-api"
```

**Option 2: Update single secret**

```bash
# Update in SSM
aws ssm put-parameter \
  --name /interviews-tracker/prod/OPENAI_API_KEY \
  --value "sk-new-key-here" \
  --type SecureString \
  --region eu-central-1 \
  --overwrite

# Download on server
ssh ubuntu@18.159.88.141 'bash -s' < ./scripts/secrets-download.sh

# Restart API
ssh ubuntu@18.159.88.141 "pm2 restart interviews-api"
```

### Delete a Secret

```bash
aws ssm delete-parameter \
  --name /interviews-tracker/prod/OLD_VAR \
  --region eu-central-1
```

---

## Integration with Deployment

### Update Deployment Script

The deployment script can automatically fetch secrets:

```bash
# In scripts/deploy-lightsail.sh, add before PM2 restart:

echo ""
echo "Step: Fetching latest secrets..."
ssh ${REMOTE_USER}@${REMOTE_HOST} << 'ENDSSH'
cd /home/ubuntu/interviews-tracker/current
./scripts/secrets-download.sh
ENDSSH
```

### Manual Deployment with Secrets

```bash
# 1. Deploy code
./scripts/deploy-lightsail.sh

# 2. Update secrets (if changed)
ssh ubuntu@18.159.88.141 'bash -s' < ./scripts/secrets-download.sh

# 3. Restart (deployment script already does this)
```

---

## Best Practices

### ✅ Do

- **Use SecureString for sensitive data**: Passwords, API keys, tokens
- **Version secrets**: SSM automatically versions parameters
- **Rotate secrets regularly**: Update API keys, tokens periodically
- **Use IAM roles**: Prefer roles over long-lived credentials
- **Audit access**: Enable CloudTrail to log parameter access
- **Test locally first**: Verify `.env.prod` works before uploading

### ❌ Don't

- **Don't commit `.env.prod` with real secrets**: Keep it local only
- **Don't share secrets in Slack/email**: Use SSM links instead
- **Don't hardcode secrets**: Always use environment variables
- **Don't give broad SSM permissions**: Scope to `/interviews-tracker/` path only
- **Don't skip encryption**: Use SecureString for all sensitive data

---

## Troubleshooting

### "Access Denied" when uploading

**Problem:** IAM user lacks SSM permissions

**Fix:**
```bash
# Check your IAM user
aws sts get-caller-identity

# Verify permissions
aws ssm describe-parameters --region eu-central-1
```

Add SSM permissions to your IAM user (see Setup section)

### "Access Denied" when downloading on server

**Problem:** Server lacks SSM read permissions

**Fix:**
```bash
ssh ubuntu@18.159.88.141
aws configure
# Enter credentials for user with SSM read-only access
```

### Secrets not updating after download

**Problem:** API not restarted after environment change

**Fix:**
```bash
ssh ubuntu@18.159.88.141 "pm2 restart interviews-api"
```

### Wrong region

**Problem:** Secrets stored in different region than expected

**Fix:**
```bash
# Check which region has your secrets
aws ssm get-parameters-by-path \
  --path /interviews-tracker/prod \
  --region us-east-1  # Try different regions

# Update scripts with correct region
```

---

## Alternative: AWS Secrets Manager

If you need advanced features:

**AWS Secrets Manager** provides:
- Automatic rotation
- Cross-account access
- Database credential management

**Cost:** $0.40/secret/month + $0.05 per 10,000 API calls

**When to use:**
- Need automatic credential rotation
- Managing RDS database credentials
- Cross-account secret sharing

**SSM Parameter Store is better for most cases** (free, simpler)

---

## Security Notes

1. **Encryption at rest**: SecureString parameters are encrypted using AWS KMS
2. **Encryption in transit**: All SSM API calls use HTTPS
3. **Access control**: IAM policies control who can read/write
4. **Audit trail**: CloudTrail logs all parameter access
5. **Version history**: SSM keeps parameter version history
6. **No plaintext storage**: Server never stores decrypted secrets on disk permanently

---

## Summary

### Workflow

```
1. Local:  Edit .env.prod
2. Local:  ./scripts/secrets-upload.sh
3. Server: ./scripts/secrets-download.sh
4. Server: pm2 restart interviews-api
```

### Key Files

- `.env.prod` - Local template (DO NOT commit secrets)
- `scripts/secrets-upload.sh` - Upload to SSM
- `scripts/secrets-download.sh` - Download from SSM
- `/home/ubuntu/interviews-tracker/shared/.env.production` - Generated on server

### Commands

```bash
# Upload secrets
./scripts/secrets-upload.sh

# Download secrets on server
ssh ubuntu@18.159.88.141 'bash -s' < ./scripts/secrets-download.sh

# Verify secrets in SSM
aws ssm get-parameters-by-path --path /interviews-tracker/prod --region eu-central-1

# Restart API after secret update
ssh ubuntu@18.159.88.141 "pm2 restart interviews-api"
```

---

**Last Updated:** 2026-06-30
