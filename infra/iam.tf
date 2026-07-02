# ============================================
# ECS Task Execution Role
# Used by ECS to pull images, write logs, and fetch secrets
# ============================================
resource "aws_iam_role" "ecs_execution" {
  name = "${local.app_name}-ecs-execution-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })

  tags = {
    Name = "${local.app_name}-ecs-execution-role"
  }
}

# Attach AWS managed policy for ECS task execution
resource "aws_iam_role_policy_attachment" "ecs_execution_policy" {
  role       = aws_iam_role.ecs_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# Custom policy for SSM Parameter Store access
resource "aws_iam_role_policy" "ecs_execution_ssm" {
  name = "${local.app_name}-ecs-execution-ssm-policy"
  role = aws_iam_role.ecs_execution.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "ssm:GetParameters",
          "ssm:GetParameter",
          "ssm:GetParametersByPath"
        ]
        Resource = "arn:aws:ssm:${var.aws_region}:${local.account_id}:parameter/interviews-tracker/prod/*"
      }
    ]
  })
}

# ============================================
# ECS Task Role
# Used by the application code running in the container
# ============================================
resource "aws_iam_role" "ecs_task" {
  name = "${local.app_name}-ecs-task-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })

  tags = {
    Name = "${local.app_name}-ecs-task-role"
  }
}

# Task role policy - add application-specific permissions here
resource "aws_iam_role_policy" "ecs_task_app_permissions" {
  name = "${local.app_name}-ecs-task-app-policy"
  role = aws_iam_role.ecs_task.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      # Example: Allow reading SSM parameters at runtime if needed
      # Remove if not required by the application
      {
        Effect = "Allow"
        Action = [
          "ssm:GetParameter",
          "ssm:GetParameters",
          "ssm:GetParametersByPath"
        ]
        Resource = "arn:aws:ssm:${var.aws_region}:${local.account_id}:parameter/interviews-tracker/prod/*"
      },
      # Add other application-specific permissions here
      # Example: S3, SES, SNS, etc.
    ]
  })
}
