# AWS ECS Fargate Deployment Guide

Complete guide for deploying the Interviews Tracker API to AWS ECS Fargate.

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Prerequisites](#prerequisites)
- [Initial Setup](#initial-setup)
- [Terraform Deployment](#terraform-deployment)
- [GitHub Actions CI/CD](#github-actions-cicd)
- [Monitoring and Logs](#monitoring-and-logs)
- [Rollback Procedures](#rollback-procedures)
- [DNS and Domain Configuration](#dns-and-domain-configuration)
- [Migrating from Lightsail](#migrating-from-lightsail)
- [Troubleshooting](#troubleshooting)

---

## Architecture Overview

```
┌─────────────┐
│   GitHub    │
│   Actions   │
└──────┬──────┘
       │ Push
       ▼
┌─────────────┐
│     ECR     │
│   (Docker   │
│   Registry) │
└──────┬──────┘
       │ Pull
       ▼
┌─────────────────────────────────────────┐
│         Application Load Balancer       │
│      (interviews-tracker-alb)           │
│                                         │
│  HTTP (80) → Forward to ECS             │
│  HTTPS (443) → Forward to ECS (optional)│
└───────────────────┬─────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────┐
│           ECS Fargate Cluster           │
│       (interviews-tracker)              │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │   Task (Fargate)                │   │
│  │   ┌─────────────────────────┐   │   │
│  │   │  Container: api         │   │   │
│  │   │  - Node.js 20           │   │   │
│  │   │  - Port 3000            │   │   │
│  │   │  - CPU: 512             │   │   │
│  │   │  - Memory: 1024MB       │   │   │
│  │   └─────────────────────────┘   │   │
│  └─────────────────────────────────┘   │
└─────────────────────────────────────────┘
       │                    │
       │ Secrets            │ Logs
       ▼                    ▼
┌──────────────┐     ┌─────────────┐
│   AWS SSM    │     │  CloudWatch │
│   Parameter  │     │    Logs     │
│    Store     │     └─────────────┘
└──────────────┘
       │
       ▼
┌──────────────┐
│  Neon Postgres │
│   (External)   │
└────────────────┘
```

### Components

- **ECR (Elastic Container Registry)**: Stores Docker images
- **ECS Cluster**: Manages Fargate tasks
- **Fargate Tasks**: Serverless containers running the API
- **Application Load Balancer**: Routes traffic to tasks, performs health checks
- **CloudWatch**: Stores application logs
- **SSM Parameter Store**: Stores environment variables and secrets
- **IAM Roles**: Execution role (for ECS) and task role (for application)

---

## Prerequisites

### Required Tools

- **Terraform** >= 1.0 ([Install](https://www.terraform.io/downloads))
- **AWS CLI** >= 2.0 ([Install](https://aws.amazon.com/cli/))
- **Docker** ([Install](https://docs.docker.com/get-docker/))
- **Git**

### AWS Requirements

- AWS Account: `669424048162`
- Region: `eu-central-1`
- ECR Repository: Already created at `669424048162.dkr.ecr.eu-central-1.amazonaws.com/interviews-tracker`
- SSM Parameters: Already configured at `/interviews-tracker/prod/*`

### Required AWS Permissions

The deploying user/role needs:

- **ECR**: Full access to `interviews-tracker` repository
- **ECS**: Create/update clusters, services, task definitions
- **EC2**: Create/manage security groups, describe VPC/subnets
- **IAM**: Create/manage ECS execution and task roles
- **Elastic Load Balancing**: Create/manage ALB, target groups, listeners
- **CloudWatch**: Create log groups, write logs
- **SSM**: Read parameters from `/interviews-tracker/prod/*`

---

## Initial Setup

### 1. Verify AWS CLI Configuration

```bash
# Configure AWS CLI (if not already done)
aws configure

# Verify credentials
aws sts get-caller-identity

# Should show:
# Account: 669424048162
# UserId: Your IAM user/role
```

### 2. Verify ECR Repository

```bash
aws ecr describe-repositories --repository-names interviews-tracker --region eu-central-1
```

### 3. Verify SSM Parameters

```bash
aws ssm get-parameters-by-path \
  --path /interviews-tracker/prod \
  --region eu-central-1 \
  --output table
```

Expected parameters:
- `DATABASE_URL`
- `AUTH0_DOMAIN`
- `AUTH0_AUDIENCE`
- `OPENAI_API_KEY`
- `FRONTEND_ORIGIN`
- And other application secrets

---

## Terraform Deployment

### Initialize Terraform

```bash
cd infra

# Initialize Terraform (downloads providers)
terraform init
```

### Review Configuration

```bash
# Copy example variables
cp terraform.tfvars.example terraform.tfvars

# Edit if needed (defaults should work)
nano terraform.tfvars
```

### Plan Infrastructure

```bash
# Preview changes
terraform plan

# Review output carefully:
# - ECS Cluster
# - Task Definition
# - ECS Service
# - Application Load Balancer
# - Security Groups
# - IAM Roles
# - CloudWatch Log Group
```

### Deploy Infrastructure

```bash
# Apply infrastructure
terraform apply

# Type 'yes' when prompted
```

**This will create:**
- ECS Cluster: `interviews-tracker`
- ECS Service: `interviews-tracker`
- ALB: `interviews-tracker-alb`
- Security Groups for ALB and ECS
- IAM roles with least-privilege permissions
- CloudWatch log group: `/aws/ecs/interviews-tracker`

### Get Outputs

```bash
# View important outputs
terraform output

# Key outputs:
# - alb_dns_name: Load balancer URL
# - ecs_cluster_name: interviews-tracker
# - ecs_service_name: interviews-tracker
# - cloudwatch_log_group: /aws/ecs/interviews-tracker
```

### Verify Deployment

```bash
# Get ALB DNS name
ALB_DNS=$(terraform output -raw alb_dns_name)

# Test health endpoint
curl http://$ALB_DNS/health

# Expected response:
# {"ok":true,"timestamp":"2024-...","uptime":123}
```

---

## GitHub Actions CI/CD

### Setup Options

You have two authentication options for GitHub Actions:

#### Option A: OIDC (Recommended)

OIDC provides temporary credentials without storing long-lived secrets.

**Setup Steps:**

1. **Create OIDC Identity Provider in AWS**

```bash
aws iam create-open-id-connect-provider \
  --url https://token.actions.githubusercontent.com \
  --client-id-list sts.amazonaws.com \
  --thumbprint-list 6938fd4d98bab03faadb97b34396831e3780aea1
```

2. **Create IAM Role for GitHub Actions**

```bash
# Create trust policy file
cat > github-actions-trust-policy.json <<EOF
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

# Create role
aws iam create-role \
  --role-name GitHubActionsDeployRole \
  --assume-role-policy-document file://github-actions-trust-policy.json
```

3. **Attach Permissions Policy**

```bash
# Create permissions policy file
cat > github-actions-permissions.json <<EOF
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
      "Action": [
        "iam:PassRole"
      ],
      "Resource": [
        "arn:aws:iam::669424048162:role/interviews-tracker-ecs-execution-role",
        "arn:aws:iam::669424048162:role/interviews-tracker-ecs-task-role"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "elasticloadbalancing:DescribeLoadBalancers"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "logs:Tail"
      ],
      "Resource": "arn:aws:logs:eu-central-1:669424048162:log-group:/aws/ecs/interviews-tracker:*"
    }
  ]
}
EOF

# Attach policy
aws iam put-role-policy \
  --role-name GitHubActionsDeployRole \
  --policy-name GitHubActionsDeployPolicy \
  --policy-document file://github-actions-permissions.json
```

4. **Add GitHub Secret**

```bash
# Get role ARN
aws iam get-role --role-name GitHubActionsDeployRole --query 'Role.Arn' --output text
```

In GitHub:
- Go to: Settings → Secrets and variables → Actions
- Add secret: `AWS_ROLE_ARN` = `arn:aws:iam::669424048162:role/GitHubActionsDeployRole`

#### Option B: Access Keys (Simpler, less secure)

1. **Create IAM User**

```bash
aws iam create-user --user-name github-actions-deployer
```

2. **Attach Policies**

```bash
# Use the same permissions policy from Option A
aws iam put-user-policy \
  --user-name github-actions-deployer \
  --policy-name GitHubActionsDeployPolicy \
  --policy-document file://github-actions-permissions.json
```

3. **Create Access Keys**

```bash
aws iam create-access-key --user-name github-actions-deployer
```

4. **Add GitHub Secrets**

In GitHub (Settings → Secrets and variables → Actions):
- `AWS_ACCESS_KEY_ID` = Access Key ID from previous step
- `AWS_SECRET_ACCESS_KEY` = Secret Access Key from previous step

5. **Update Workflow**

Edit `.github/workflows/deploy-api-ecs.yml`:

```yaml
- name: Configure AWS credentials
  uses: aws-actions/configure-aws-credentials@v4
  with:
    aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
    aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
    aws-region: ${{ env.AWS_REGION }}
    # Comment out role-to-assume line
```

### Trigger Deployment

```bash
# Push to master branch
git push origin master

# Or trigger manually from GitHub Actions UI
```

### Monitor Deployment

1. **GitHub Actions**
   - Go to: Actions tab in GitHub
   - Watch workflow progress
   - View logs for each step

2. **AWS Console**
   - ECS → Clusters → interviews-tracker → Services → interviews-tracker
   - Watch task count transition during deployment

3. **CLI Monitoring**

```bash
# Watch service events
aws ecs describe-services \
  --cluster interviews-tracker \
  --services interviews-tracker \
  --query 'services[0].events[0:5]' \
  --output table

# Watch task status
watch -n 5 'aws ecs list-tasks --cluster interviews-tracker --service-name interviews-tracker'
```

---

## Monitoring and Logs

### CloudWatch Logs

**View logs in AWS Console:**
- CloudWatch → Log groups → `/aws/ecs/interviews-tracker`

**View logs via CLI:**

```bash
# Tail logs (follow)
aws logs tail /aws/ecs/interviews-tracker --follow

# Last 5 minutes
aws logs tail /aws/ecs/interviews-tracker --since 5m

# Filter by keyword
aws logs tail /aws/ecs/interviews-tracker --follow --filter-pattern "ERROR"

# Specific time range
aws logs tail /aws/ecs/interviews-tracker \
  --since '2024-07-01T10:00:00' \
  --until '2024-07-01T11:00:00'
```

### ECS Service Status

```bash
# Service overview
aws ecs describe-services \
  --cluster interviews-tracker \
  --services interviews-tracker \
  --query 'services[0].{Status:status,DesiredCount:desiredCount,RunningCount:runningCount}' \
  --output table

# Recent service events
aws ecs describe-services \
  --cluster interviews-tracker \
  --services interviews-tracker \
  --query 'services[0].events[0:10]' \
  --output table
```

### Task Health

```bash
# List running tasks
aws ecs list-tasks \
  --cluster interviews-tracker \
  --service-name interviews-tracker

# Task details
TASK_ARN=$(aws ecs list-tasks \
  --cluster interviews-tracker \
  --service-name interviews-tracker \
  --query 'taskArns[0]' \
  --output text)

aws ecs describe-tasks \
  --cluster interviews-tracker \
  --tasks $TASK_ARN
```

### Load Balancer Health

```bash
# Target health
aws elbv2 describe-target-health \
  --target-group-arn $(aws elbv2 describe-target-groups \
    --names interviews-tracker-tg \
    --query 'TargetGroups[0].TargetGroupArn' \
    --output text)
```

### Application Health Check

```bash
# Get ALB DNS
ALB_DNS=$(aws elbv2 describe-load-balancers \
  --names interviews-tracker-alb \
  --query 'LoadBalancers[0].DNSName' \
  --output text)

# Basic health
curl http://$ALB_DNS/health

# Deep health (checks database)
curl http://$ALB_DNS/health/deep

# Readiness check
curl http://$ALB_DNS/ready
```

---

## Rollback Procedures

### Automatic Rollback

ECS has automatic rollback enabled via Circuit Breaker. If deployment fails:
- ECS automatically stops the deployment
- Rolls back to previous task definition
- No manual intervention needed

### Manual Rollback

If you need to manually roll back:

#### 1. List Previous Task Definitions

```bash
aws ecs list-task-definitions \
  --family-prefix interviews-tracker \
  --sort DESC
```

#### 2. Rollback to Previous Version

```bash
# Get previous task definition ARN
PREVIOUS_TASK_DEF=$(aws ecs list-task-definitions \
  --family-prefix interviews-tracker \
  --sort DESC \
  --query 'taskDefinitionArns[1]' \
  --output text)

# Update service to use previous task definition
aws ecs update-service \
  --cluster interviews-tracker \
  --service interviews-tracker \
  --task-definition $PREVIOUS_TASK_DEF \
  --force-new-deployment
```

#### 3. Rollback via Docker Image Tag

```bash
# List recent ECR images
aws ecr list-images \
  --repository-name interviews-tracker \
  --query 'imageIds[*].imageTag' \
  --output table

# Deploy specific Git SHA
# Update Terraform variable or task definition with specific image tag
```

### Verify Rollback

```bash
# Check service status
aws ecs describe-services \
  --cluster interviews-tracker \
  --services interviews-tracker \
  --query 'services[0].{TaskDefinition:taskDefinition,DesiredCount:desiredCount,RunningCount:runningCount}'

# Test application
curl http://$ALB_DNS/health
```

---

## DNS and Domain Configuration

### Current State

- ALB provides a DNS name: `interviews-tracker-alb-XXXXXXXXX.eu-central-1.elb.amazonaws.com`
- This is not user-friendly

### Option 1: Route 53 (Recommended)

**Setup:**

1. **Create hosted zone** (if not exists):
```bash
aws route53 create-hosted-zone \
  --name yourcompany.com \
  --caller-reference $(date +%s)
```

2. **Create A record** pointing to ALB:
```bash
# Get ALB ARN and hosted zone ID
ALB_ARN=$(terraform output -raw alb_arn)
ALB_ZONE_ID=$(aws elbv2 describe-load-balancers \
  --load-balancer-arns $ALB_ARN \
  --query 'LoadBalancers[0].CanonicalHostedZoneId' \
  --output text)
ALB_DNS=$(terraform output -raw alb_dns_name)

# Create Route 53 record
cat > route53-record.json <<EOF
{
  "Changes": [
    {
      "Action": "CREATE",
      "ResourceRecordSet": {
        "Name": "api.yourcompany.com",
        "Type": "A",
        "AliasTarget": {
          "HostedZoneId": "$ALB_ZONE_ID",
          "DNSName": "$ALB_DNS",
          "EvaluateTargetHealth": true
        }
      }
    }
  ]
}
EOF

aws route53 change-resource-record-sets \
  --hosted-zone-id YOUR_HOSTED_ZONE_ID \
  --change-batch file://route53-record.json
```

3. **Update environment variables:**
```bash
# Update FRONTEND_ORIGIN if needed
aws ssm put-parameter \
  --name /interviews-tracker/prod/API_URL \
  --value "https://api.yourcompany.com" \
  --type String \
  --overwrite
```

### Option 2: Cloudflare / Other DNS

1. Create a CNAME record:
   - Name: `api.yourcompany.com`
   - Value: `[ALB DNS from terraform output]`
   - Proxy: Optional

### Enable HTTPS

**Prerequisites:**
- Domain name pointing to ALB
- SSL certificate

**Steps:**

1. **Request ACM Certificate:**
```bash
aws acm request-certificate \
  --domain-name api.yourcompany.com \
  --validation-method DNS \
  --region eu-central-1
```

2. **Validate Certificate:**
   - Follow DNS validation instructions from ACM
   - Wait for certificate status to be "Issued"

3. **Update Terraform:**
```hcl
# infra/terraform.tfvars
enable_https    = true
certificate_arn = "arn:aws:acm:eu-central-1:669424048162:certificate/..."
```

4. **Apply changes:**
```bash
terraform apply
```

---

## Migrating from Lightsail

### Pre-Migration Checklist

- [ ] ECS deployment is stable and healthy
- [ ] All environment variables are correctly configured in SSM
- [ ] Database connectivity verified from ECS
- [ ] Health checks passing consistently
- [ ] Logs are being written to CloudWatch
- [ ] Application functionality verified on ALB URL

### Migration Strategy

**Recommended: Blue-Green Deployment**

1. **Phase 1: Parallel Running**
   - Keep Lightsail running
   - Deploy to ECS
   - Verify ECS works correctly
   - Duration: 1-7 days

2. **Phase 2: Traffic Shift**
   - Update DNS to point to ALB
   - Monitor ECS performance
   - Keep Lightsail running as backup
   - Duration: 1-3 days

3. **Phase 3: Decommission Lightsail**
   - Stop Lightsail instance
   - Monitor for issues
   - Wait 1 week
   - Delete Lightsail instance

### DNS Update

```bash
# Before migration
# api.yourcompany.com → Lightsail IP

# During migration
# 1. Lower TTL to 300 seconds (5 minutes)
# 2. Wait for old TTL to expire
# 3. Update DNS to ALB
# 4. Monitor traffic

# After migration
# Raise TTL back to 3600 seconds (1 hour)
```

### Verification Steps

After DNS migration:

```bash
# Verify DNS propagation
dig api.yourcompany.com

# Test from multiple locations
curl https://api.yourcompany.com/health

# Monitor error rates in CloudWatch
aws logs tail /aws/ecs/interviews-tracker --follow --filter-pattern "ERROR"
```

### Rollback Plan

If issues occur after DNS migration:

1. **Immediate rollback:**
   ```bash
   # Update DNS back to Lightsail IP
   # Changes propagate in 5 minutes (if TTL lowered)
   ```

2. **Application-level issues:**
   ```bash
   # Roll back ECS task definition
   # See "Rollback Procedures" section
   ```

### Cleanup Lightsail (After 1-2 weeks)

```bash
# Stop instance first
aws lightsail stop-instance --instance-name interviews-tracker

# Wait 1 week, verify no issues

# Delete instance
aws lightsail delete-instance --instance-name interviews-tracker

# Remove GitHub secrets
# - LIGHTSAIL_HOST
# - LIGHTSAIL_USER
# - LIGHTSAIL_SSH_KEY

# Archive old deployment workflow
git mv .github/workflows/deploy.yml .github/workflows/deploy-lightsail.yml.backup
```

---

## Troubleshooting

### Common Issues

#### 1. Tasks Keep Restarting

**Symptoms:**
- Tasks start but quickly stop
- "STOPPED" status in ECS console
- Health checks failing

**Diagnosis:**
```bash
# Check task exit reason
aws ecs describe-tasks \
  --cluster interviews-tracker \
  --tasks $(aws ecs list-tasks \
    --cluster interviews-tracker \
    --service-name interviews-tracker \
    --query 'taskArns[0]' \
    --output text) \
  --query 'tasks[0].containers[0].{ExitCode:exitCode,Reason:reason}'

# Check recent logs
aws logs tail /aws/ecs/interviews-tracker --since 5m
```

**Common causes:**
- Missing environment variables → Check SSM parameters
- Database connection issues → Check security groups, verify DATABASE_URL
- Application crash on startup → Check logs for errors
- Wrong port → Verify PORT=3000 in task definition

#### 2. Health Checks Failing

**Symptoms:**
- Tasks running but marked unhealthy
- ALB returning 503 errors

**Diagnosis:**
```bash
# Check target health
aws elbv2 describe-target-health \
  --target-group-arn $(aws elbv2 describe-target-groups \
    --names interviews-tracker-tg \
    --query 'TargetGroups[0].TargetGroupArn' \
    --output text)

# Test health endpoint directly from task
TASK_ID=$(aws ecs list-tasks \
  --cluster interviews-tracker \
  --service-name interviews-tracker \
  --query 'taskArns[0]' \
  --output text | rev | cut -d'/' -f1 | rev)

TASK_IP=$(aws ecs describe-tasks \
  --cluster interviews-tracker \
  --tasks $TASK_ID \
  --query 'tasks[0].containers[0].networkInterfaces[0].privateIpv4Address' \
  --output text)

curl http://$TASK_IP:3000/health
```

**Solutions:**
- Increase health check grace period
- Verify /health endpoint returns 200
- Check if application is listening on correct port (3000)

#### 3. Deployment Stuck

**Symptoms:**
- Service stuck in "UPDATING" state
- New tasks not starting

**Diagnosis:**
```bash
# Check service events
aws ecs describe-services \
  --cluster interviews-tracker \
  --services interviews-tracker \
  --query 'services[0].events[0:10]'
```

**Solutions:**
```bash
# Force new deployment
aws ecs update-service \
  --cluster interviews-tracker \
  --service interviews-tracker \
  --force-new-deployment

# If stuck, may need to scale down and up
aws ecs update-service \
  --cluster interviews-tracker \
  --service interviews-tracker \
  --desired-count 0

# Wait 30 seconds

aws ecs update-service \
  --cluster interviews-tracker \
  --service interviews-tracker \
  --desired-count 1
```

#### 4. Cannot Pull Image from ECR

**Symptoms:**
- Task stopped with "CannotPullContainerError"

**Diagnosis:**
```bash
# Verify image exists
aws ecr describe-images \
  --repository-name interviews-tracker \
  --image-ids imageTag=latest

# Check execution role permissions
aws iam get-role-policy \
  --role-name interviews-tracker-ecs-execution-role \
  --policy-name interviews-tracker-ecs-execution-ssm-policy
```

**Solutions:**
- Verify IAM execution role has ECR permissions
- Check if image tag exists in ECR
- Ensure ECR repository policy allows pulls

#### 5. Environment Variables Not Loading

**Symptoms:**
- Application errors about missing config
- "Undefined" errors in logs

**Diagnosis:**
```bash
# List SSM parameters
aws ssm get-parameters-by-path \
  --path /interviews-tracker/prod \
  --recursive \
  --query 'Parameters[*].Name'

# Check task definition secrets
aws ecs describe-task-definition \
  --task-definition interviews-tracker \
  --query 'taskDefinition.containerDefinitions[0].secrets'
```

**Solutions:**
- Verify all required parameters exist in SSM
- Check IAM execution role has ssm:GetParameters permission
- Ensure parameter names match exactly (case-sensitive)

#### 6. Application Logs Not Appearing

**Symptoms:**
- CloudWatch log group exists but no streams
- No logs visible

**Diagnosis:**
```bash
# Check log group
aws logs describe-log-groups \
  --log-group-name-prefix /aws/ecs/interviews-tracker

# Check task definition log configuration
aws ecs describe-task-definition \
  --task-definition interviews-tracker \
  --query 'taskDefinition.containerDefinitions[0].logConfiguration'
```

**Solutions:**
- Verify execution role has logs:CreateLogStream and logs:PutLogEvents permissions
- Check application is writing to stdout/stderr (not files)
- Ensure log group exists before task starts

### Useful Commands Reference

```bash
# Force redeploy with latest image
aws ecs update-service \
  --cluster interviews-tracker \
  --service interviews-tracker \
  --force-new-deployment

# Scale service
aws ecs update-service \
  --cluster interviews-tracker \
  --service interviews-tracker \
  --desired-count 2

# Stop all tasks (service will restart them)
for task in $(aws ecs list-tasks --cluster interviews-tracker --service-name interviews-tracker --query 'taskArns[]' --output text); do
  aws ecs stop-task --cluster interviews-tracker --task $task
done

# View task definition
aws ecs describe-task-definition \
  --task-definition interviews-tracker \
  --query 'taskDefinition' \
  --output yaml

# Stream logs with filtering
aws logs tail /aws/ecs/interviews-tracker \
  --follow \
  --format short \
  --filter-pattern "{ $.level = \"error\" }"
```

---

## Cost Optimization

### Current Cost Estimate

**ECS Fargate:**
- 1 task @ 0.5 vCPU, 1GB RAM
- ~$15-20/month (running 24/7)

**Application Load Balancer:**
- ~$16-20/month (fixed)
- Plus data transfer charges

**CloudWatch Logs:**
- ~$0.50-2/month (depends on volume)
- 14-day retention

**Total: ~$35-45/month**

### Optimization Tips

1. **Use Fargate Spot** (for non-production):
   ```hcl
   # infra/ecs.tf
   capacity_provider_strategy {
     capacity_provider = "FARGATE_SPOT"
     weight            = 100
   }
   ```
   Saves 70% on compute costs.

2. **Reduce CloudWatch Retention:**
   ```hcl
   # infra/ecs.tf
   log_retention_days = 7  # instead of 14
   ```

3. **Right-size Resources:**
   ```hcl
   # infra/terraform.tfvars
   cpu    = 256  # instead of 512
   memory = 512  # instead of 1024
   ```
   Test thoroughly before reducing.

4. **Use CloudWatch Logs Insights** instead of tailing:
   - Queries are more cost-effective than constant streaming

---

## Security Best Practices

### Implemented

- ✅ Non-root container user
- ✅ Least-privilege IAM roles
- ✅ Secrets in SSM Parameter Store (encrypted)
- ✅ Security groups with minimal access
- ✅ HTTPS ready (requires certificate)
- ✅ Private container network (awsvpc)

### Recommended Enhancements

1. **Enable HTTPS** (covered in DNS section)
2. **Enable VPC Flow Logs** (network monitoring)
3. **Enable AWS GuardDuty** (threat detection)
4. **Enable ECS Exec** for debugging (disabled by default for security)
5. **Use AWS Secrets Manager** instead of SSM (automatic rotation)
6. **Implement WAF** for API protection

---

## Additional Resources

### AWS Documentation

- [ECS Fargate](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/AWS_Fargate.html)
- [Application Load Balancer](https://docs.aws.amazon.com/elasticloadbalancing/latest/application/introduction.html)
- [SSM Parameter Store](https://docs.aws.amazon.com/systems-manager/latest/userguide/systems-manager-parameter-store.html)
- [ECR](https://docs.aws.amazon.com/AmazonECR/latest/userguide/what-is-ecr.html)

### Terraform

- [AWS Provider Documentation](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)
- [ECS Module](https://registry.terraform.io/modules/terraform-aws-modules/ecs/aws/latest)

### Monitoring

- [CloudWatch Container Insights](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/ContainerInsights.html)
- [ECS Best Practices](https://docs.aws.amazon.com/AmazonECS/latest/bestpracticesguide/intro.html)

---

## Support

For issues:
1. Check [Troubleshooting](#troubleshooting) section
2. Review CloudWatch logs
3. Check GitHub Issues
4. Contact DevOps team

---

**Last Updated:** 2024-07-01  
**Maintained By:** DevOps Team
