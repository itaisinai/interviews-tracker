# ECS Deployment Troubleshooting

Common issues and solutions for ECS Fargate deployment.

---

## Docker Build Failures

### Issue: "COPY apps/api/package.json: no such file or directory"

**Symptom:**
```
ERROR [dependencies 6/10] COPY apps/api/package.json ./apps/api/
------
failed to compute cache key: failed to calculate checksum of ref: "/apps/api/package.json": not found
```

**Cause:**  
This Nx monorepo doesn't have individual `package.json` files in `apps/api/` or `apps/web/`. Package management is handled at the root level with Yarn workspaces defined in the root `package.json`.

**Solution:**  
The Dockerfile should copy entire directories, not individual package.json files:

```dockerfile
# ✅ CORRECT
COPY apps ./apps
COPY packages ./packages

# ❌ WRONG
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
```

**Current Dockerfile is correct** - it copies the entire directory structure.

### Issue: Docker build fails with "yarn install" errors

**Symptom:**
```
ERROR [dependencies 7/10] RUN yarn install --immutable
Workspace not found (@interviews-tracker/design-system@workspace:*)
```

**Cause:**  
Yarn workspaces require the full project structure to resolve workspace dependencies.

**Solution:**  
Ensure the Dockerfile copies everything before running `yarn install`:

```dockerfile
COPY .yarnrc.yml package.json yarn.lock ./
COPY nx.json tsconfig.json ./
COPY prisma ./prisma
COPY apps ./apps
COPY packages ./packages
COPY scripts ./scripts

# Now yarn install can resolve workspaces
RUN yarn install --immutable
```

### Issue: Runtime fails with "Cannot find module"

**Symptom:**
Container starts but crashes immediately with module not found errors.

**Cause:**  
The runtime image is missing required files for `scripts/start-api.mjs`.

**Required files in runtime image:**
- `package.json`, `yarn.lock`, `.yarnrc.yml`
- `node_modules/` (all dependencies)
- `dist/api/` (compiled application)
- `prisma/schema.prisma` (needed at runtime)
- `scripts/start-api.mjs` (startup script)
- `nx.json` (if using Nx commands)

**Verification:**
```bash
docker run --rm --entrypoint sh interviews-tracker:test -c "ls -la scripts/start-api.mjs dist/api/ prisma/schema.prisma"
```

All files should exist.

---

## GitHub Actions Failures

### Issue: "Credentials could not be loaded"

**Symptom:**
```
Error: Credentials could not be loaded, please check your action inputs: 
Could not load credentials from any providers
```

**Cause:**  
GitHub Actions secrets not configured.

**Solution:**  
Add AWS credentials to GitHub repository secrets:

**Settings → Secrets and variables → Actions → New repository secret**

For access keys (current workflow configuration):
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`

**Verification:**
```bash
# In GitHub Actions workflow
- name: Configure AWS credentials
  uses: aws-actions/configure-aws-credentials@v4
  with:
    aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
    aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
    aws-region: ${{ env.AWS_REGION }}
```

### Issue: "ECS cluster not found"

**Symptom:**
```
❌ ERROR: ECS cluster 'interviews-tracker' not found or not ACTIVE

📋 Required setup before first deployment:
1. Deploy infrastructure: cd infra && terraform init && terraform apply
```

**Cause:**  
ECS infrastructure hasn't been deployed yet.

**Solution:**  
Deploy infrastructure first:

```bash
cd infra
terraform init
terraform plan
terraform apply
```

**What gets created:**
- ECS Cluster: `interviews-tracker`
- ECS Service: `interviews-tracker`
- ALB: `interviews-tracker-alb`
- Target Group
- Security Groups
- IAM Roles
- CloudWatch Log Group

**Verification:**
```bash
aws ecs describe-clusters --clusters interviews-tracker
aws ecs describe-services --cluster interviews-tracker --services interviews-tracker
```

### Issue: "Task definition not found"

**Symptom:**
```
An error occurred (ClientException) when calling the DescribeTaskDefinition operation: 
Unable to describe task definition.
```

**Cause:**  
This is **expected on the first deployment**. The task definition is created by Terraform with an initial placeholder image, then updated by GitHub Actions with the real image.

**Solution:**  
This is normal. The workflow handles this by:
1. Checking if task definition exists (it will after `terraform apply`)
2. Downloading current task definition
3. Updating it with the new image
4. Registering the new revision

**First deploy order:**
1. ✅ `terraform apply` (creates task definition with placeholder)
2. ✅ GitHub Actions runs (updates with real image)
3. ✅ ECS deploys the service

---

## ECS Service Failures

### Issue: Tasks keep restarting (crash loop)

**Symptom:**
- ECS console shows tasks starting then stopping repeatedly
- Service never reaches "steady state"
- Deployment fails after 10 minutes

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

# Check logs
aws logs tail /aws/ecs/interviews-tracker --since 10m
```

**Common causes:**

1. **Missing environment variable**
   ```
   Error: DATABASE_URL is required
   ```
   → Add to SSM Parameter Store: `/interviews-tracker/prod/DATABASE_URL`
   → Run `terraform apply` to update task definition

2. **Database connection failed**
   ```
   Error: connect ECONNREFUSED
   ```
   → Check DATABASE_URL is correct
   → Verify security groups allow outbound connections
   → Check Neon database is accessible

3. **Wrong PORT**
   ```
   Application listening on port 4000, but health check expects 3000
   ```
   → Ensure `PORT=3000` in SSM parameters
   → Task definition expects port 3000

4. **Application startup error**
   ```
   Cannot find module 'dist/api/server.mjs'
   ```
   → Docker build may have failed
   → Rebuild and push image

### Issue: Health checks failing

**Symptom:**
- Tasks are running but marked unhealthy
- ALB returns 503 errors
- Service never becomes stable

**Diagnosis:**
```bash
# Check target health
aws elbv2 describe-target-health \
  --target-group-arn $(aws elbv2 describe-target-groups \
    --names interviews-tracker-tg \
    --query 'TargetGroups[0].TargetGroupArn' \
    --output text)
```

**Common causes:**

1. **/health endpoint not responding**
   ```bash
   # Test directly (if you can reach the task IP)
   curl http://TASK_IP:3000/health
   ```
   → Should return `{"ok":true,...}`

2. **Port mismatch**
   - Application listening on port 4000
   - ALB checking port 3000
   → Ensure `PORT=3000` environment variable is set

3. **Slow startup**
   - Health checks start too early
   → Increase health check grace period in Terraform:
   ```hcl
   health_check_grace_period = 60  # seconds
   ```

4. **Database not ready**
   - App crashes if DB connection fails on startup
   → Ensure DATABASE_URL is correct
   → Check database allows connections from ECS tasks

---

## Terraform Issues

### Issue: "Error creating ECS Service: InvalidParameterException"

**Symptom:**
```
Error: error creating ECS Service: InvalidParameterException: 
The target group with targetGroupArn ... does not have an associated load balancer
```

**Cause:**  
Resources created in wrong order.

**Solution:**  
Terraform should handle dependencies automatically. Ensure `depends_on` is set:

```hcl
resource "aws_ecs_service" "app" {
  # ...
  
  depends_on = [
    aws_lb_listener.http,
    aws_iam_role_policy_attachment.ecs_execution_policy
  ]
}
```

### Issue: "Error: creating Target Group: DuplicateTargetGroupName"

**Cause:**  
Target group from previous deployment still exists.

**Solution:**  
```bash
# List target groups
aws elbv2 describe-target-groups --names interviews-tracker-tg

# Delete if exists
aws elbv2 delete-target-group --target-group-arn <ARN>

# Re-run terraform
terraform apply
```

### Issue: SSM parameters not loading

**Symptom:**
Application logs show "undefined" for environment variables.

**Cause:**  
Either parameters don't exist in SSM, or IAM role doesn't have permission.

**Diagnosis:**
```bash
# Check parameters exist
aws ssm get-parameters-by-path --path /interviews-tracker/prod --region eu-central-1

# Check IAM role permissions
aws iam get-role-policy \
  --role-name interviews-tracker-ecs-execution-role \
  --policy-name interviews-tracker-ecs-execution-ssm-policy
```

**Solution:**  
1. Add missing parameters to SSM
2. Run `terraform apply` (Terraform reads parameter list at deploy time)
3. ECS will automatically deploy new task definition

---

## First Deployment Checklist

Follow this order to avoid common issues:

### 1. Verify Prerequisites
```bash
# AWS CLI configured
aws sts get-caller-identity

# Should show account: 669424048162

# ECR repository exists
aws ecr describe-repositories --repository-names interviews-tracker

# SSM parameters exist
aws ssm get-parameters-by-path --path /interviews-tracker/prod
```

### 2. Deploy Infrastructure
```bash
cd infra
terraform init
terraform plan    # Review what will be created
terraform apply   # Type 'yes' to confirm
```

**Wait for completion** (5-10 minutes)

### 3. Configure GitHub Secrets
Go to: **GitHub repo → Settings → Secrets and variables → Actions**

Add:
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`

### 4. Trigger Deployment
```bash
# Push to master or manually trigger workflow
git push origin master
```

Or use GitHub UI: **Actions → Deploy API to ECS Fargate → Run workflow**

### 5. Verify Deployment
```bash
# Get ALB DNS
cd infra
ALB_DNS=$(terraform output -raw alb_dns_name)

# Test health
curl http://$ALB_DNS/health

# Should return: {"ok":true,"timestamp":"...","uptime":...}
```

---

## Debug Commands

### Check Docker image
```bash
# List layers
docker history interviews-tracker:test

# Inspect runtime image
docker run --rm --entrypoint sh interviews-tracker:test -c "ls -la"

# Check files exist
docker run --rm --entrypoint sh interviews-tracker:test -c "
  echo '=== Checking required files ==='
  ls -lh scripts/start-api.mjs || echo 'MISSING: start-api.mjs'
  ls -lh dist/api/server.mjs || echo 'MISSING: server.mjs'
  ls -lh package.json || echo 'MISSING: package.json'
  ls -lh prisma/schema.prisma || echo 'MISSING: schema.prisma'
  echo '=== Checking Yarn ===' 
  yarn --version || echo 'Yarn not available'
"
```

### Check ECS
```bash
# Service status
aws ecs describe-services \
  --cluster interviews-tracker \
  --services interviews-tracker \
  --query 'services[0].{Status:status,DesiredCount:desiredCount,RunningCount:runningCount}'

# Task details
aws ecs describe-tasks \
  --cluster interviews-tracker \
  --tasks $(aws ecs list-tasks --cluster interviews-tracker --service-name interviews-tracker --query 'taskArns[0]' --output text) \
  --query 'tasks[0].containers[0].{Name:name,Status:lastStatus,ExitCode:exitCode,Reason:reason}'

# Recent logs
aws logs tail /aws/ecs/interviews-tracker --since 5m --follow
```

### Check ALB
```bash
# Load balancer status
aws elbv2 describe-load-balancers --names interviews-tracker-alb

# Target health
aws elbv2 describe-target-health \
  --target-group-arn $(aws elbv2 describe-target-groups \
    --names interviews-tracker-tg \
    --query 'TargetGroups[0].TargetGroupArn' \
    --output text)
```

---

## Getting Help

1. **Check logs first:**
   ```bash
   aws logs tail /aws/ecs/interviews-tracker --follow --filter-pattern "ERROR"
   ```

2. **Review this troubleshooting guide**

3. **Check documentation:**
   - `docs/aws-ecs-fargate-deployment.md` - Comprehensive guide
   - `QUICK_START_ECS.md` - Quick reference
   - `docs/SECRETS_REFERENCE.md` - Environment variables

4. **Common solutions:**
   - Most issues: Check logs first
   - Missing infrastructure: Run `terraform apply`
   - Missing secrets: Check SSM Parameter Store
   - Task crashes: Check environment variables
   - Health check fails: Check `/health` endpoint

---

**Last Updated:** 2026-07-02
