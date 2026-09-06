output "alb_dns_name" {
  description = "DNS name of the Application Load Balancer"
  value       = aws_lb.main.dns_name
}

output "alb_url" {
  description = "Full URL of the Application Load Balancer"
  value       = "http://${aws_lb.main.dns_name}"
}

output "alb_arn" {
  description = "ARN of the Application Load Balancer"
  value       = aws_lb.main.arn
}

output "ecs_cluster_name" {
  description = "Name of the ECS cluster"
  value       = aws_ecs_cluster.main.name
}

output "ecs_cluster_arn" {
  description = "ARN of the ECS cluster"
  value       = aws_ecs_cluster.main.arn
}

output "ecs_service_name" {
  description = "Name of the ECS service"
  value       = "interviews-tracker"
}

output "ecs_service_arn" {
  description = "ARN of the ECS service"
  value       = try(aws_ecs_service.app.id, "")
}

output "task_definition_arn" {
  description = "ARN of the ECS task definition"
  value       = aws_ecs_task_definition.app.arn
}

output "task_definition_family" {
  description = "Family of the ECS task definition"
  value       = aws_ecs_task_definition.app.family
}

output "ecr_repository_url" {
  description = "URL of the ECR repository"
  value       = "${local.account_id}.dkr.ecr.${var.aws_region}.amazonaws.com/interviews-tracker"
}

output "cloudwatch_log_group" {
  description = "Name of the CloudWatch log group"
  value       = aws_cloudwatch_log_group.app.name
}

output "execution_role_arn" {
  description = "ARN of the ECS task execution role"
  value       = aws_iam_role.ecs_execution.arn
}

output "task_role_arn" {
  description = "ARN of the ECS task role"
  value       = aws_iam_role.ecs_task.arn
}

# ============================================
# DNS Outputs
# ============================================
output "domain_name" {
  description = "Application domain name"
  value       = var.domain_name
}

output "api_url" {
  description = "API URL (HTTP only - HTTPS temporarily disabled)"
  value       = "http://${aws_lb.main.dns_name}"
}

# ============================================
# Database Outputs (if RDS is created)
# ============================================
output "database_endpoint" {
  description = "RDS database endpoint (empty if not using RDS)"
  value       = var.create_rds ? aws_db_instance.main[0].endpoint : "Not using RDS"
}

output "database_name" {
  description = "RDS database name (empty if not using RDS)"
  value       = var.create_rds ? aws_db_instance.main[0].db_name : "Not using RDS"
}
