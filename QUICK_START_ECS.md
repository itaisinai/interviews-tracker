# Quick Start - ECS Fargate Deployment

This is a condensed guide to get your API running on ECS Fargate in under 30 minutes.

---

## ✅ First Deploy Checklist

Follow these steps in order:

1. **Deploy infrastructure with Terraform**
   ```bash
   cd infra && terraform init && terraform apply
   ```
   Save the ALB DNS from outputs.

2. **Setup GitHub Actions authentication**
   - Choose OIDC (recommended) or Access Keys
   - Create IAM role/user with deployment permissions
   - Add `AWS_ROLE_ARN` (OIDC) or `AWS_ACCESS_KEY_ID` + `AWS_SECRET_ACCESS_KEY` (keys) to GitHub secrets

3. **Push to master branch**
   ```bash
   git push origin master
   ```
   This triggers the deployment workflow.

4. **Verify health endpoint**
   ```bash
   ALB_DNS="<from terraform output>"
   curl http://$ALB_DNS/health
   ```
   Should return `{"ok":true,...}`

If all 4 steps succeed, your API is deployed! 🎉

---

## Prerequisites Check

```bash
# Verify AWS CLI
aws sts get-caller-identity
# Should show account: 669424048162

# Verify Terraform
terraform version
# Should be >= 1.0

# Verify Docker
docker --version
```

## Step 1: Deploy Infrastructure (5-10 minutes)

```bash
cd infra

# Initialize Terraform
terraform init

# Review what will be created
terraform plan

# Deploy (type 'yes' when prompted)
terraform apply

# Save the ALB DNS name
terraform output alb_dns_name
```

**What this creates:**
- ECS Cluster
- ECS Service (1 task)
- Application Load Balancer
- Security Groups
- IAM Roles
- CloudWatch Log Group

## Step 2: Setup GitHub Actions Authentication

**IMPORTANT:** You must choose ONE authentication method. The workflow is currently configured for OIDC (Option A). If you choose Access Keys (Option B), you must edit `.github/workflows/deploy-api-ecs.yml` as shown below.

### Option A: OIDC (Recommended)

**1. Create OIDC Provider:**
```bash
aws iam create-open-id-connect-provider \
  --url https://token.actions.githubusercontent.com \
  --client-id-list sts.amazonaws.com \
  --thumbprint-list 6938fd4d98bab03faadb97b34396831e3780aea1
```

**2. Create IAM Role:**
```bash
# Create trust policy
cat > github-trust-policy.json <<'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::669424048162:oidc-provider/token.actions.githubusercontent.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
        },
        "StringLike": {
          "token.actions.githubusercontent.com:sub": "repo:YOUR_GITHUB_USERNAME/interviews-tracker-2:*"
        }
      }
    }
  ]
}
EOF

# Replace YOUR_GITHUB_USERNAME with your actual GitHub username
sed -i '' 's/YOUR_GITHUB_USERNAME/your-actual-username/g' github-trust-policy.json

# Create role
aws iam create-role \
  --role-name GitHubActionsDeployRole \
  --assume-role-policy-document file://github-trust-policy.json
```

**3. Attach Permissions:**
```bash
cat > github-permissions.json <<'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ecr:GetAuthorizationToken",
        "ecr:BatchCheckLayerAvailability",
        "ecr:GetDownloadUrlForLayer",
        "ecr:BatchGetImage",
        "ecr:PutImage",
        "ecr:InitiateLayerUpload",
        "ecr:UploadLayerPart",
        "ecr:CompleteLayerUpload"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "ecs:DescribeServices",
        "ecs:DescribeTaskDefinition",
        "ecs:RegisterTaskDefinition",
        "ecs:UpdateService"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": "iam:PassRole",
      "Resource": [
        "arn:aws:iam::669424048162:role/interviews-tracker-ecs-execution-role",
        "arn:aws:iam::669424048162:role/interviews-tracker-ecs-task-role"
      ]
    },
    {
      "Effect": "Allow",
      "Action": "elasticloadbalancing:DescribeLoadBalancers",
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": "logs:Tail",
      "Resource": "arn:aws:logs:eu-central-1:669424048162:log-group:/aws/ecs/interviews-tracker:*"
    }
  ]
}
EOF

aws iam put-role-policy \
  --role-name GitHubActionsDeployRole \
  --policy-name GitHubActionsDeployPolicy \
  --policy-document file://github-permissions.json
```

**4. Add GitHub Secret:**
```bash
# Get role ARN
aws iam get-role --role-name GitHubActionsDeployRole --query 'Role.Arn' --output text
```

Go to GitHub: **Settings → Secrets and variables → Actions → New repository secret**
- Name: `AWS_ROLE_ARN`
- Value: `arn:aws:iam::669424048162:role/GitHubActionsDeployRole`

### Option B: Access Keys (Simpler)

**1. Create IAM User:**
```bash
aws iam create-user --user-name github-actions-deployer

# Attach same permissions policy as Option A
aws iam put-user-policy \
  --user-name github-actions-deployer \
  --policy-name GitHubActionsDeployPolicy \
  --policy-document file://github-permissions.json

# Create access keys
aws iam create-access-key --user-name github-actions-deployer
```

**2. Add GitHub Secrets:**

Go to GitHub: **Settings → Secrets and variables → Actions**

Add two secrets:
- `AWS_ACCESS_KEY_ID` = Access Key ID from previous step
- `AWS_SECRET_ACCESS_KEY` = Secret Access Key from previous step

**3. Update workflow file:**

Edit `.github/workflows/deploy-api-ecs.yml` and replace the "Configure AWS credentials" step:

```yaml
- name: Configure AWS credentials
  uses: aws-actions/configure-aws-credentials@v4
  with:
    # Comment out OIDC role
    # role-to-assume: ${{ secrets.AWS_ROLE_ARN }}
    
    # Uncomment access keys
    aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
    aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
    aws-region: ${{ env.AWS_REGION }}
```

**Commit the workflow change:**
```bash
git add .github/workflows/deploy-api-ecs.yml
git commit -m "Switch to access key authentication"
git push origin master
```

## Step 3: First Deployment (5-10 minutes)

```bash
# From repository root
git add .
git commit -m "Add ECS Fargate deployment infrastructure"
git push origin master
```

**Monitor deployment:**
1. Go to GitHub → Actions tab
2. Watch the workflow progress
3. Wait for "Deploy to Amazon ECS" step to complete

## Step 4: Verify Deployment

```bash
# Get ALB URL
cd infra
ALB_DNS=$(terraform output -raw alb_dns_name)

# Test health endpoint
curl http://$ALB_DNS/health

# Should return: {"ok":true,"timestamp":"...","uptime":...}

# Test API endpoint
curl http://$ALB_DNS/api/health
```

## Step 5: Monitor Logs

```bash
# Tail logs in real-time
aws logs tail /aws/ecs/interviews-tracker --follow

# Filter errors
aws logs tail /aws/ecs/interviews-tracker --follow --filter-pattern "ERROR"

# Last 5 minutes
aws logs tail /aws/ecs/interviews-tracker --since 5m
```

## Step 6: Check ECS Status

```bash
# Service overview
aws ecs describe-services \
  --cluster interviews-tracker \
  --services interviews-tracker \
  --query 'services[0].{Status:status,RunningCount:runningCount,DesiredCount:desiredCount}'

# List tasks
aws ecs list-tasks \
  --cluster interviews-tracker \
  --service-name interviews-tracker
```

---

## Common Issues

### Issue: Task keeps restarting

**Check logs:**
```bash
aws logs tail /aws/ecs/interviews-tracker --since 10m
```

**Common causes:**
- Missing environment variable → Check SSM Parameter Store
- Database connection error → Verify DATABASE_URL in SSM
- Wrong port → Should be PORT=3000

### Issue: Health check failing

**Test health endpoint directly:**
```bash
# Get task IP
TASK_ARN=$(aws ecs list-tasks --cluster interviews-tracker --service-name interviews-tracker --query 'taskArns[0]' --output text)

aws ecs describe-tasks \
  --cluster interviews-tracker \
  --tasks $TASK_ARN \
  --query 'tasks[0].containers[0].networkInterfaces[0].privateIpv4Address' \
  --output text
```

### Issue: Deployment stuck

**Force new deployment:**
```bash
aws ecs update-service \
  --cluster interviews-tracker \
  --service interviews-tracker \
  --force-new-deployment
```

---

## Next Steps

### 1. Update Frontend

Update your frontend to use the new ALB URL:

```bash
# In Vercel environment variables
API_URL=http://[ALB_DNS]
```

### 2. Setup DNS

Point your domain to the ALB:

```bash
# Get ALB DNS
terraform output alb_dns_name

# Create CNAME record:
# api.yourdomain.com → [ALB_DNS]
```

### 3. Enable HTTPS (Optional)

**Request certificate:**
```bash
aws acm request-certificate \
  --domain-name api.yourdomain.com \
  --validation-method DNS \
  --region eu-central-1
```

**Update Terraform:**
```hcl
# infra/terraform.tfvars
enable_https    = true
certificate_arn = "arn:aws:acm:..."
```

```bash
terraform apply
```

### 4. Monitor for 1 Week

Keep Lightsail running as backup for 1 week:

- Monitor error rates in CloudWatch
- Check application functionality
- Verify all features work
- Compare performance

### 5. Migrate DNS

After 1 week of stability:

```bash
# Lower TTL to 300 seconds
# Wait for old TTL to expire
# Update DNS to ALB
# Monitor traffic
```

### 6. Cleanup Lightsail

After 1-2 weeks with no issues:

```bash
# Stop Lightsail
aws lightsail stop-instance --instance-name interviews-tracker

# Wait 1 week

# Delete Lightsail
aws lightsail delete-instance --instance-name interviews-tracker
```

---

## Useful Commands

```bash
# Force redeploy
aws ecs update-service \
  --cluster interviews-tracker \
  --service interviews-tracker \
  --force-new-deployment

# Scale to 2 tasks
aws ecs update-service \
  --cluster interviews-tracker \
  --service interviews-tracker \
  --desired-count 2

# View service events
aws ecs describe-services \
  --cluster interviews-tracker \
  --services interviews-tracker \
  --query 'services[0].events[0:5]'

# Get ALB health
aws elbv2 describe-target-health \
  --target-group-arn $(aws elbv2 describe-target-groups \
    --names interviews-tracker-tg \
    --query 'TargetGroups[0].TargetGroupArn' \
    --output text)

# Test local Docker build
docker build -t interviews-tracker:test .
docker run --rm -p 3000:3000 -e PORT=3000 interviews-tracker:test
```

---

## Rollback

If you need to rollback:

```bash
# List task definitions
aws ecs list-task-definitions \
  --family-prefix interviews-tracker \
  --sort DESC

# Get previous version
PREVIOUS=$(aws ecs list-task-definitions \
  --family-prefix interviews-tracker \
  --sort DESC \
  --query 'taskDefinitionArns[1]' \
  --output text)

# Rollback
aws ecs update-service \
  --cluster interviews-tracker \
  --service interviews-tracker \
  --task-definition $PREVIOUS \
  --force-new-deployment
```

---

## Cost

**Monthly estimate:** ~$35-45

- ECS Fargate: ~$15-20
- ALB: ~$16-20
- CloudWatch Logs: ~$0.50-2
- Data Transfer: ~$2-5

---

## Support

- **Full documentation**: `docs/aws-ecs-fargate-deployment.md`
- **Infrastructure README**: `infra/README.md`
- **Deployment summary**: `DEPLOYMENT_SUMMARY.md`
