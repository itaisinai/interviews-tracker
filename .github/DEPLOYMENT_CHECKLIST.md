# ECS Fargate Deployment Checklist

Use this checklist to track your deployment progress.

## Pre-Deployment Validation

### Infrastructure Prerequisites
- [ ] AWS CLI configured and authenticated
- [ ] Account verified: `aws sts get-caller-identity` shows `669424048162`
- [ ] ECR repository exists: `aws ecr describe-repositories --repository-names interviews-tracker`
- [ ] SSM parameters verified: `aws ssm get-parameters-by-path --path /interviews-tracker/prod --region eu-central-1`
- [ ] Terraform installed: `terraform version` (>= 1.0)
- [ ] Docker installed: `docker --version`

### Code Validation
- [ ] Docker build succeeds: `docker build -t interviews-tracker:test .`
- [ ] Terraform validates: `cd infra && terraform init && terraform validate`
- [ ] All tests pass (if applicable)
- [ ] Documentation reviewed

---

## Phase 1: Infrastructure Deployment

### Terraform Setup
- [ ] `cd infra`
- [ ] `terraform init` completed successfully
- [ ] `terraform plan` reviewed (no unexpected changes)
- [ ] `terraform apply` completed successfully
- [ ] Outputs saved: `terraform output > outputs.txt`

### Infrastructure Verification
- [ ] ECS cluster exists: `aws ecs describe-clusters --clusters interviews-tracker`
- [ ] ECS service created: `aws ecs describe-services --cluster interviews-tracker --services interviews-tracker`
- [ ] ALB is active: Check AWS Console or `aws elbv2 describe-load-balancers --names interviews-tracker-alb`
- [ ] Security groups configured: Check AWS Console
- [ ] IAM roles created: Check AWS Console
- [ ] CloudWatch log group exists: `aws logs describe-log-groups --log-group-name-prefix /aws/ecs/interviews-tracker`

### Initial Service Status
- [ ] Service status is "ACTIVE"
- [ ] Desired count = 1
- [ ] Running count = 0 (expected, no image yet)

---

## Phase 2: GitHub Actions Setup

### Choose Authentication Method
- [ ] **Option A: OIDC** (recommended) - OR - **Option B: Access Keys**

### If Using OIDC (Option A)
- [ ] OIDC provider created in AWS
- [ ] IAM role `GitHubActionsDeployRole` created
- [ ] Trust policy configured with correct GitHub repo
- [ ] Permissions policy attached
- [ ] Role ARN obtained: `aws iam get-role --role-name GitHubActionsDeployRole --query 'Role.Arn'`
- [ ] GitHub secret `AWS_ROLE_ARN` added
- [ ] Workflow file uses OIDC authentication

### If Using Access Keys (Option B)
- [ ] IAM user `github-actions-deployer` created
- [ ] Permissions policy attached to user
- [ ] Access keys created
- [ ] GitHub secret `AWS_ACCESS_KEY_ID` added
- [ ] GitHub secret `AWS_SECRET_ACCESS_KEY` added
- [ ] Workflow file updated to use access keys

### Workflow Verification
- [ ] `.github/workflows/deploy-api-ecs.yml` exists
- [ ] Workflow uses correct AWS region (eu-central-1)
- [ ] Workflow uses correct ECR repository name
- [ ] Workflow uses correct ECS cluster name
- [ ] Workflow uses correct ECS service name

---

## Phase 3: First Deployment

### Code Push
- [ ] All changes committed: `git status`
- [ ] Changes pushed: `git push origin master`
- [ ] GitHub Actions workflow triggered

### Monitor Deployment
- [ ] Workflow started in GitHub Actions UI
- [ ] "Checkout repository" step completed
- [ ] "Configure AWS credentials" step completed
- [ ] "Login to Amazon ECR" step completed
- [ ] "Build Docker image" step completed (this takes ~5-10 minutes)
- [ ] "Push image to Amazon ECR" step completed
- [ ] "Download current task definition" step completed
- [ ] "Update task definition with new image" step completed
- [ ] "Deploy to Amazon ECS" step completed
- [ ] "Wait for service stability" completed (this can take 5-10 minutes)
- [ ] Health check passed

### Deployment Verification
- [ ] Workflow status is green (success)
- [ ] ALB URL displayed in workflow output
- [ ] No errors in workflow logs

---

## Phase 4: Application Verification

### ECS Service Health
```bash
aws ecs describe-services \
  --cluster interviews-tracker \
  --services interviews-tracker \
  --query 'services[0].{Status:status,RunningCount:runningCount,DesiredCount:desiredCount}'
```
- [ ] Status: ACTIVE
- [ ] RunningCount: 1
- [ ] DesiredCount: 1

### Task Health
```bash
aws ecs list-tasks --cluster interviews-tracker --service-name interviews-tracker
```
- [ ] At least 1 task listed
- [ ] Task status: RUNNING

### CloudWatch Logs
```bash
aws logs tail /aws/ecs/interviews-tracker --since 5m
```
- [ ] Logs appearing in CloudWatch
- [ ] No ERROR messages
- [ ] Application started successfully
- [ ] "api_listening" log message present

### ALB Health Checks
```bash
ALB_DNS=$(cd infra && terraform output -raw alb_dns_name)
curl http://$ALB_DNS/health
```
- [ ] Returns HTTP 200
- [ ] Response: `{"ok":true,"timestamp":"...","uptime":...}`

### API Endpoints
```bash
curl http://$ALB_DNS/api/health
```
- [ ] Returns HTTP 200
- [ ] Valid JSON response

### Deep Health Check
```bash
curl http://$ALB_DNS/health/deep
```
- [ ] Returns HTTP 200
- [ ] Database connectivity confirmed: `"database": "connected"`

---

## Phase 5: Functional Testing

### Critical Endpoints
Test the following manually or via API client:

- [ ] `GET /health` - Basic health check
- [ ] `GET /health/deep` - Database health check
- [ ] `GET /ready` - Readiness check
- [ ] Authentication endpoint (if applicable)
- [ ] Core API endpoints used by frontend

### Integration Testing
- [ ] Database queries work
- [ ] External API calls work (OpenAI, etc.)
- [ ] Email/Gmail integration works (if applicable)
- [ ] File uploads work (if applicable)
- [ ] Webhook endpoints work (if applicable)

### Performance Check
- [ ] Response times acceptable (<500ms for health checks)
- [ ] No timeout errors
- [ ] Memory usage stable (check CloudWatch metrics)
- [ ] CPU usage stable (check CloudWatch metrics)

---

## Phase 6: Monitoring Setup

### CloudWatch
- [ ] Log group retention set to 14 days
- [ ] Container Insights enabled on cluster
- [ ] Can view logs: AWS Console → CloudWatch → Log groups → /aws/ecs/interviews-tracker

### ECS Console
- [ ] Can access cluster: AWS Console → ECS → Clusters → interviews-tracker
- [ ] Can view service metrics
- [ ] Can view task details

### CLI Access
- [ ] Can tail logs: `aws logs tail /aws/ecs/interviews-tracker --follow`
- [ ] Can describe service
- [ ] Can list tasks

---

## Phase 7: Documentation Update

### Internal Documentation
- [ ] ALB DNS documented: `[Your ALB DNS here]`
- [ ] Deployment process documented
- [ ] Rollback procedure documented
- [ ] Team notified of new infrastructure

### Environment Variables
- [ ] Frontend updated with new API URL (if needed)
- [ ] Vercel environment variables updated (if applicable)
- [ ] Local development .env.example updated (if needed)

---

## Phase 8: Parallel Operation (1 Week)

### Week 1: Monitor Both Systems
- [ ] Lightsail still running
- [ ] ECS running in parallel
- [ ] Both receiving traffic (if split traffic)
- [ ] Compare error rates
- [ ] Compare response times
- [ ] Compare stability

### Daily Checks
Day 1:
- [ ] ECS healthy
- [ ] No errors in CloudWatch
- [ ] All features working

Day 2:
- [ ] ECS healthy
- [ ] No errors in CloudWatch

Day 3:
- [ ] ECS healthy
- [ ] No errors in CloudWatch

Day 4:
- [ ] ECS healthy
- [ ] No errors in CloudWatch

Day 5:
- [ ] ECS healthy
- [ ] No errors in CloudWatch

Day 6:
- [ ] ECS healthy
- [ ] No errors in CloudWatch

Day 7:
- [ ] ECS healthy
- [ ] No errors in CloudWatch
- [ ] Ready for DNS migration

---

## Phase 9: DNS Migration

### Pre-Migration
- [ ] Lower DNS TTL to 300 seconds
- [ ] Wait for old TTL to expire (wait the original TTL duration)
- [ ] ECS verified healthy
- [ ] Lightsail verified healthy (backup)

### Migration
- [ ] Update DNS record to ALB DNS
- [ ] Monitor traffic shift
- [ ] Check error rates
- [ ] Verify application functionality

### Post-Migration (First 24 Hours)
Hour 1:
- [ ] No spike in errors
- [ ] Traffic flowing to ECS
- [ ] Response times acceptable

Hour 6:
- [ ] System stable
- [ ] No issues reported

Hour 24:
- [ ] System stable for 24 hours
- [ ] No issues reported

---

## Phase 10: Lightsail Decommission

### After 1 Week of Stability
- [ ] No ECS issues for 1 week
- [ ] All features working on ECS
- [ ] Team comfortable with ECS

### Stop Lightsail (Week 2)
- [ ] Stop Lightsail instance: `aws lightsail stop-instance --instance-name interviews-tracker`
- [ ] Monitor for 1 week
- [ ] Verify no issues

### Delete Lightsail (Week 3+)
- [ ] No issues for 2+ weeks on ECS
- [ ] Delete Lightsail instance: `aws lightsail delete-instance --instance-name interviews-tracker`
- [ ] Remove Lightsail-related GitHub secrets
- [ ] Archive old deployment workflow: `git mv .github/workflows/deploy.yml .github/workflows/deploy-lightsail.yml.backup`
- [ ] Commit changes: `git commit -m "Archive Lightsail deployment workflow"`

---

## Phase 11: Optimization (Optional)

### Cost Optimization
- [ ] Review CloudWatch costs after 1 month
- [ ] Consider reducing log retention if needed
- [ ] Review ECS resource utilization
- [ ] Consider right-sizing CPU/memory

### Performance Optimization
- [ ] Review CloudWatch metrics
- [ ] Consider increasing task count for redundancy
- [ ] Consider auto-scaling policies
- [ ] Review ALB access logs (if enabled)

### Security Hardening
- [ ] Enable HTTPS with ACM certificate
- [ ] Review security group rules
- [ ] Review IAM role permissions
- [ ] Enable AWS GuardDuty (optional)
- [ ] Enable VPC Flow Logs (optional)

---

## Rollback Plan

If issues occur at any phase:

### Before DNS Migration
- [ ] Simply continue using Lightsail
- [ ] Investigate ECS issues
- [ ] Fix and redeploy

### After DNS Migration
- [ ] Update DNS back to Lightsail IP
- [ ] Wait for DNS propagation (5 minutes with lowered TTL)
- [ ] Investigate ECS issues
- [ ] Fix and re-migrate when ready

### Emergency Rollback (ECS-only)
- [ ] Roll back to previous task definition
- [ ] Force new deployment
- [ ] Monitor logs

```bash
# Emergency rollback command
aws ecs update-service \
  --cluster interviews-tracker \
  --service interviews-tracker \
  --task-definition $(aws ecs list-task-definitions \
    --family-prefix interviews-tracker \
    --sort DESC \
    --query 'taskDefinitionArns[1]' \
    --output text) \
  --force-new-deployment
```

---

## Success Criteria

**Deployment is complete when:**
- ✅ All checklist items above are completed
- ✅ Application running on ECS for 2+ weeks with no issues
- ✅ DNS pointing to ECS
- ✅ Lightsail decommissioned
- ✅ Team comfortable with new infrastructure
- ✅ Documentation updated

**Congratulations! 🎉**

---

## Support Resources

- **Comprehensive Guide**: `docs/aws-ecs-fargate-deployment.md`
- **Quick Start**: `QUICK_START_ECS.md`
- **Deployment Summary**: `DEPLOYMENT_SUMMARY.md`
- **Infrastructure README**: `infra/README.md`

## Emergency Contacts

- AWS Support: [Your support plan]
- DevOps Team: [Your contact info]
- On-Call: [Your on-call process]
