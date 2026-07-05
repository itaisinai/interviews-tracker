# Infrastructure

Terraform configuration for the Interviews Tracker API on AWS ECS Fargate.

For the full operations runbook, Docker notes, health checks, secrets, and troubleshooting, see [Deployment and operations](../docs/deployment-and-operations.md).

## Managed resources

- ECS cluster and Fargate service
- ECS task definition for the API container
- Application Load Balancer, listener, and target group
- Security groups for ALB and ECS tasks
- IAM task execution/task roles
- CloudWatch log group
- Outputs for service and load balancer details

## Prerequisites

- Terraform >= 1.0
- AWS credentials with permissions to manage ECS, IAM, ALB, CloudWatch, and SSM references
- Existing ECR repository for the API image
- Required production parameters under `/interviews-tracker/prod/*` in AWS SSM Parameter Store

## Common commands

```sh
terraform init
terraform plan
terraform apply
terraform output
```

Copy `terraform.tfvars.example` to `terraform.tfvars` for local operator-specific values. Do not commit real credentials or secrets.
