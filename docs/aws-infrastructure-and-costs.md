# AWS Infrastructure & Cost Analysis
**Project:** Interviews Tracker  
**Region:** eu-central-1 (Frankfurt)  
**Generated:** 2026-07-27

---

## 📊 Current Infrastructure

### 1. **ECS Fargate (Compute)**
- **Cluster:** interviews-tracker
- **Service:** interviews-tracker (1 task running)
- **Task Specs:**
  - CPU: 512 units (0.5 vCPU)
  - Memory: 1024 MB (1 GB)
  - Launch Type: FARGATE
- **Container:** API (Node.js application)
- **Status:** ✅ ACTIVE

**Estimated Monthly Cost: ~$15-20/month**
- Fargate pricing (eu-central-1):
  - CPU: $0.04656 per vCPU per hour = 0.5 × $0.04656 × 730 hours = **~$17/month**
  - Memory: $0.00511 per GB per hour = 1 × $0.00511 × 730 hours = **~$3.73/month**
  - **Total Fargate: ~$20.73/month**

---

### 2. **Application Load Balancer (ALB)**
- **Name:** interviews-tracker-alb
- **Type:** Application Load Balancer
- **Scheme:** Internet-facing
- **Listeners:** HTTP:80 (HTTPS not currently enabled)
- **Target Group:** interviews-tracker-tg
- **Status:** ✅ active

**Estimated Monthly Cost: ~$16/month**
- ALB pricing (eu-central-1):
  - Base rate: $0.0225 per hour = **~$16.43/month**
  - LCU charges: ~$0.008 per LCU-hour (varies by traffic)
  - Low traffic estimate: **~$2-5/month** in LCU charges
  - **Total ALB: ~$18-21/month**

---

### 3. **Elastic Container Registry (ECR)**
- **Repository:** interviews-tracker
- **URI:** `669424048162.dkr.ecr.eu-central-1.amazonaws.com/interviews-tracker`
- **Purpose:** Docker image storage

**Estimated Monthly Cost: ~$0.10-1/month**
- Storage: $0.10 per GB per month
- Assuming 1-2 GB of images stored
- **Total ECR: ~$0.10-0.20/month**

---

### 4. **CloudWatch Logs**
- **Log Group:** `/aws/ecs/interviews-tracker`
- **Retention:** 14 days
- **Current Storage:** 37,099,173 bytes (~35 MB)

**Estimated Monthly Cost: ~$0.25/month**
- Ingestion: $0.60 per GB ingested
- Storage: $0.033 per GB per month
- Assuming ~500 MB/month ingestion, 35 MB stored
- **Total CloudWatch Logs: ~$0.30-0.50/month**

---

### 5. **Systems Manager Parameter Store**
- **Count:** 25 parameters
- **Path:** `/interviews-tracker/prod/*`
- **Type:** SecureString (encrypted with KMS)
- **Parameters include:**
  - Database credentials
  - API keys (OpenAI, Perplexity, Exa, Gmail)
  - Auth0 configuration
  - Telegram bot tokens
  - Sentry DSN

**Estimated Monthly Cost: FREE**
- Standard parameters: Free tier (up to 10,000 parameters)
- **Total SSM: $0/month**

---

### 6. **AWS KMS (Key Management Service)**
- **Purpose:** Encrypting SSM Parameter Store secrets
- **Keys:** Using AWS-managed keys

**Estimated Monthly Cost: ~$1/month**
- Customer managed key: $1/month
- API requests: $0.03 per 10,000 requests
- **Total KMS: ~$1/month** (if using customer-managed key, $0 if AWS-managed)

---

### 7. **VPC & Networking**
- **VPC:** Default VPC
- **Subnets:** Default subnets across availability zones
- **Security Groups:**
  - ALB security group (allows HTTP from internet)
  - ECS tasks security group (allows traffic from ALB)
- **NAT Gateway:** ❌ NOT in use (ECS tasks have public IPs)

**Estimated Monthly Cost: FREE**
- Using default VPC, no NAT Gateway
- **Total VPC: $0/month**

---

### 8. **Data Transfer**
- **Outbound data transfer** from ECS/ALB to internet
- **Estimate:** Low traffic application

**Estimated Monthly Cost: ~$1-5/month**
- First 100 GB/month: $0.09 per GB (after 1 GB free tier)
- Assuming 10-20 GB/month outbound
- **Total Data Transfer: ~$1-2/month**

---

## 💰 Total Estimated Monthly Cost

| Service | Monthly Cost (USD) |
|---------|-------------------:|
| **ECS Fargate** | $20.73 |
| **Application Load Balancer** | $18-21 |
| **ECR (Docker Registry)** | $0.10-0.20 |
| **CloudWatch Logs** | $0.30-0.50 |
| **SSM Parameter Store** | $0 |
| **KMS** | $0-1 |
| **VPC & Networking** | $0 |
| **Data Transfer** | $1-2 |
| **TOTAL** | **~$40-45/month** |

---

## 🚨 Additional External Costs (Not in AWS)

### Database
- **Provider:** Neon (or other Postgres provider)
- **Status:** Not visible in AWS costs
- **Estimated:** $0-25/month depending on plan

### Third-Party APIs
- **OpenAI API:** Variable based on usage
- **Perplexity API:** Variable based on usage
- **Exa API:** Variable based on usage
- **Auth0:** Free tier or paid plan
- **Sentry:** Free tier or paid plan

---

## 📈 Cost Optimization Opportunities

### 1. **Switch to Fargate Spot (30-50% savings)**
   - Current: FARGATE
   - Recommended: Mix of FARGATE + FARGATE_SPOT
   - **Potential savings: ~$6-10/month**
   - Already configured in Terraform but not actively used

### 2. **Reduce CloudWatch Log Retention**
   - Current: 14 days
   - Option: 7 days (less storage cost)
   - **Potential savings: ~$0.10/month** (minimal)

### 3. **Consider Reserved Capacity Savings Plan**
   - Commit to 1-year Fargate usage
   - **Potential savings: 20%** (~$4/month)
   - Only worth it if you commit long-term

### 4. **Remove ALB if not needed for scaling**
   - Current: ALB → ECS
   - Alternative: Direct ECS with public IP (not recommended for production)
   - **Potential savings: ~$18-21/month**
   - ⚠️ **Not recommended** - ALB provides health checks, SSL termination, and scaling

### 5. **Enable HTTPS with ACM Certificate**
   - Current: HTTP only
   - Recommended: Enable HTTPS
   - **Additional cost: $0** (ACM certificates are free)
   - Improves security

### 6. **Optimize Task Size**
   - Current: 512 CPU / 1024 MB
   - Option: Try 256 CPU / 512 MB if application allows
   - **Potential savings: ~$10/month**
   - ⚠️ Test thoroughly before downsizing

---

## 🔍 Monitoring & Alerts Recommendations

### Set up cost alerts:
```bash
# Create a budget alert for $50/month
aws budgets create-budget \
  --account-id $(aws sts get-caller-identity --query Account --output text) \
  --budget file://budget.json
```

### CloudWatch alarms to create:
1. **ALB Unhealthy Target Count** > 0
2. **ECS Task CPU Utilization** > 80%
3. **ECS Task Memory Utilization** > 80%
4. **ALB 5XX Error Rate** > 1%

---

## 🎯 Current vs Optimized Cost Comparison

| Scenario | Monthly Cost |
|----------|-------------:|
| **Current Setup** | $40-45 |
| **With Fargate Spot** | $34-38 |
| **Smaller Task Size (256/512)** | $25-30 |
| **No ALB (not recommended)** | $22-24 |

---

## 📝 Infrastructure Checklist

- [x] ECS Fargate cluster running
- [x] Application Load Balancer configured
- [x] CloudWatch logging enabled
- [x] SSM Parameter Store for secrets
- [x] ECR repository for Docker images
- [ ] HTTPS enabled (ACM certificate not configured)
- [ ] Custom domain configured
- [ ] Fargate Spot enabled
- [ ] CloudWatch alarms configured
- [ ] Cost budgets/alerts configured
- [ ] Auto-scaling policies (if needed)
- [ ] Backup/disaster recovery plan
- [ ] WAF (Web Application Firewall) - optional

---

## 🔗 Useful Commands

### Check current costs:
```bash
# Last 7 days by service
aws ce get-cost-and-usage \
  --time-period Start=$(date -u -v-7d +%Y-%m-%d),End=$(date -u +%Y-%m-%d) \
  --granularity DAILY \
  --metrics "UnblendedCost" \
  --group-by Type=DIMENSION,Key=SERVICE \
  --region us-east-1
```

### Check ECS task status:
```bash
aws ecs describe-services \
  --cluster interviews-tracker \
  --services interviews-tracker \
  --region eu-central-1
```

### Check CloudWatch logs:
```bash
aws logs tail /aws/ecs/interviews-tracker \
  --since 1h \
  --format short \
  --region eu-central-1 \
  --follow
```

### Check ALB health:
```bash
aws elbv2 describe-target-health \
  --target-group-arn $(aws elbv2 describe-target-groups \
    --names interviews-tracker-tg \
    --query 'TargetGroups[0].TargetGroupArn' \
    --output text \
    --region eu-central-1) \
  --region eu-central-1
```

---

**Last Updated:** 2026-07-27  
**Maintained By:** Infrastructure Team
