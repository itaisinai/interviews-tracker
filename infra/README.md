# Infrastructure - ECS Fargate Deployment

This directory contains Terraform configuration for deploying the Interviews Tracker API to AWS ECS Fargate.

## Quick Start

```bash
# Initialize Terraform
terraform init

# Review changes
terraform plan

# Apply infrastructure
terraform apply
```

## Files

- **main.tf** - Provider configuration, data sources, and locals
- **variables.tf** - Input variables with defaults
- **ecs.tf** - ECS cluster, task definition, and service
- **iam.tf** - IAM roles for ECS execution and task
- **alb.tf** - Application Load Balancer, target group, and listeners
- **security_groups.tf** - Security groups for ALB and ECS tasks
- **outputs.tf** - Output values (ALB URL, cluster name, etc.)
- **terraform.tfvars.example** - Example variable values

## Prerequisites

- Terraform >= 1.0
- AWS CLI configured with appropriate credentials
- ECR repository: `669424048162.dkr.ecr.eu-central-1.amazonaws.com/interviews-tracker`
- SSM parameters at `/interviews-tracker/prod/*`

## Configuration

Copy the example variables file:

```bash
cp terraform.tfvars.example terraform.tfvars
```

Edit `terraform.tfvars` if you need to customize:

```hcl
aws_region     = "eu-central-1"
environment    = "prod"
cpu            = 512
memory         = 1024
desired_count  = 1
```

## Deployment

### First-time deployment

```bash
# Initialize
terraform init

# Preview changes
terraform plan

# Apply
terraform apply
```

### Updating infrastructure

```bash
# Preview changes
terraform plan

# Apply changes
terraform apply
```

### Destroying infrastructure

⚠️ **WARNING:** This will delete all resources.

```bash
terraform destroy
```

## Outputs

After deployment, get the ALB URL:

```bash
terraform output alb_dns_name
```

Test the deployment:

```bash
curl http://$(terraform output -raw alb_dns_name)/health
```

## Remote State (Recommended for Teams)

To use remote state storage:

1. **Create S3 bucket and DynamoDB table:**

```bash
# Create S3 bucket for state
aws s3 mb s3://interviews-tracker-terraform-state --region eu-central-1

# Enable versioning
aws s3api put-bucket-versioning \
  --bucket interviews-tracker-terraform-state \
  --versioning-configuration Status=Enabled

# Create DynamoDB table for state locking
aws dynamodb create-table \
  --table-name terraform-state-lock \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region eu-central-1
```

2. **Uncomment backend configuration in main.tf:**

```hcl
backend "s3" {
  bucket         = "interviews-tracker-terraform-state"
  key            = "ecs/terraform.tfstate"
  region         = "eu-central-1"
  dynamodb_table = "terraform-state-lock"
  encrypt        = true
}
```

3. **Initialize backend:**

```bash
terraform init -migrate-state
```

## Architecture

```
┌─────────────────────────────────┐
│  Application Load Balancer      │
│  (interviews-tracker-alb)       │
│  - HTTP (80)                    │
│  - HTTPS (443) optional         │
└────────────┬────────────────────┘
             │
             ▼
┌─────────────────────────────────┐
│  ECS Service                    │
│  (interviews-tracker)           │
│  - Desired: 1 task              │
│  - Launch Type: Fargate         │
└────────────┬────────────────────┘
             │
             ▼
┌─────────────────────────────────┐
│  ECS Task Definition            │
│  - CPU: 512                     │
│  - Memory: 1024 MB              │
│  - Port: 3000                   │
│  - Secrets: SSM Parameter Store │
└─────────────────────────────────┘
```

## Resources Created

- **ECS Cluster**: interviews-tracker
- **ECS Service**: interviews-tracker (1 task by default)
- **ECS Task Definition**: interviews-tracker
- **Application Load Balancer**: interviews-tracker-alb
- **Target Group**: interviews-tracker-tg
- **Security Groups**: 2 (ALB and ECS tasks)
- **IAM Roles**: 2 (execution role and task role)
- **CloudWatch Log Group**: /aws/ecs/interviews-tracker

## Environment Variables

All secrets and environment variables are loaded from AWS SSM Parameter Store at:

```
/interviews-tracker/prod/*
```

The task automatically loads ALL parameters under this path.

### Adding or Removing Environment Variables

**IMPORTANT:** The list of SSM parameters is read by Terraform at deploy time and baked into the ECS task definition. This means:

1. **Adding a new parameter:**
```bash
# Step 1: Add to SSM Parameter Store
aws ssm put-parameter \
  --name /interviews-tracker/prod/NEW_VARIABLE \
  --value "value" \
  --type SecureString \
  --region eu-central-1

# Step 2: Update task definition with Terraform (this reads the new parameter list)
cd infra
terraform apply

# Step 3: The apply will create a new task definition revision
# ECS will automatically deploy it (rolling update)
```

2. **Updating an existing parameter value:**
```bash
# Step 1: Update in SSM
aws ssm put-parameter \
  --name /interviews-tracker/prod/EXISTING_VAR \
  --value "new-value" \
  --type SecureString \
  --region eu-central-1 \
  --overwrite

# Step 2: Force ECS to restart tasks (no Terraform needed for value changes)
aws ecs update-service \
  --cluster interviews-tracker \
  --service interviews-tracker \
  --force-new-deployment
```

3. **Removing a parameter:**
```bash
# Step 1: Delete from SSM
aws ssm delete-parameter \
  --name /interviews-tracker/prod/OLD_VARIABLE \
  --region eu-central-1

# Step 2: Update task definition with Terraform
cd infra
terraform apply
```

**Why Terraform?** Terraform runs `aws ssm get-parameters-by-path` during `terraform apply` and generates the task definition with the current list of parameters. Adding/removing parameters requires `terraform apply` to update this list. Changing parameter *values* only requires restarting tasks.

## Scaling

### Manual scaling

Update desired count:

```bash
# Via Terraform
# Edit terraform.tfvars: desired_count = 2
terraform apply

# Via AWS CLI
aws ecs update-service \
  --cluster interviews-tracker \
  --service interviews-tracker \
  --desired-count 2
```

### Auto-scaling (future enhancement)

To implement auto-scaling, add:

```hcl
resource "aws_appautoscaling_target" "ecs" {
  max_capacity       = 4
  min_capacity       = 1
  resource_id        = "service/${aws_ecs_cluster.main.name}/${aws_ecs_service.app.name}"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"
}

resource "aws_appautoscaling_policy" "ecs_cpu" {
  name               = "cpu-autoscaling"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.ecs.resource_id
  scalable_dimension = aws_appautoscaling_target.ecs.scalable_dimension
  service_namespace  = aws_appautoscaling_target.ecs.service_namespace

  target_tracking_scaling_policy_configuration {
    target_value       = 70.0
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }
  }
}
```

## Troubleshooting

### Terraform state locked

If Terraform is stuck with "state locked":

```bash
# Force unlock (use lock ID from error message)
terraform force-unlock <LOCK_ID>
```

### Cannot pull image from ECR

Verify execution role has ECR permissions:

```bash
aws iam get-role-policy \
  --role-name interviews-tracker-ecs-execution-role \
  --policy-name interviews-tracker-ecs-execution-ssm-policy
```

### Tasks keep restarting

Check CloudWatch logs:

```bash
aws logs tail /aws/ecs/interviews-tracker --follow
```

### Detailed troubleshooting

See [docs/aws-ecs-fargate-deployment.md](../docs/aws-ecs-fargate-deployment.md) for comprehensive troubleshooting guide.

## Cost Estimate

- **ECS Fargate (1 task, 0.5 vCPU, 1GB)**: ~$15-20/month
- **Application Load Balancer**: ~$16-20/month
- **CloudWatch Logs**: ~$0.50-2/month

**Total: ~$35-45/month**

## Security

- Non-root container user
- Least-privilege IAM roles
- Secrets in SSM Parameter Store (encrypted)
- Security groups with minimal access
- Private container networking (awsvpc)

## Support

For detailed documentation, see [docs/aws-ecs-fargate-deployment.md](../docs/aws-ecs-fargate-deployment.md)
