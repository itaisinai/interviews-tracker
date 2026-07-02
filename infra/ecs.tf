# ============================================
# ECS Cluster
# ============================================
resource "aws_ecs_cluster" "main" {
  name = local.app_name

  setting {
    name  = "containerInsights"
    value = "enabled"
  }

  tags = {
    Name = local.app_name
  }
}

resource "aws_ecs_cluster_capacity_providers" "main" {
  cluster_name = aws_ecs_cluster.main.name

  capacity_providers = ["FARGATE", "FARGATE_SPOT"]

  default_capacity_provider_strategy {
    capacity_provider = "FARGATE"
    weight            = 1
    base              = 1
  }
}

# ============================================
# CloudWatch Log Group
# ============================================
resource "aws_cloudwatch_log_group" "app" {
  name              = "/aws/ecs/${local.app_name}"
  retention_in_days = var.log_retention_days

  tags = {
    Name = local.app_name
  }
}

# ============================================
# ECS Task Definition
# ============================================
resource "aws_ecs_task_definition" "app" {
  family                   = local.app_name
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = var.cpu
  memory                   = var.memory
  execution_role_arn       = aws_iam_role.ecs_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([
    {
      name      = local.container_name
      image     = var.app_image
      essential = true

      portMappings = [
        {
          containerPort = local.container_port
          protocol      = "tcp"
        }
      ]

      environment = [
        {
          name  = "NODE_ENV"
          value = "production"
        },
        {
          name  = "PORT"
          value = tostring(local.container_port)
        }
      ]

      # Load all secrets from SSM Parameter Store
      secrets = local.ssm_secrets

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.app.name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "ecs"
        }
      }

      healthCheck = {
        command     = ["CMD-SHELL", "node -e \"require('http').get('http://localhost:${local.container_port}/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))\""]
        interval    = 30
        timeout     = 5
        retries     = 3
        startPeriod = 60
      }

      # Graceful shutdown
      stopTimeout = 30
    }
  ])

  tags = {
    Name = local.app_name
  }
}

# ============================================
# ECS Service
# ============================================
resource "aws_ecs_service" "app" {
  name            = local.app_name
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.app.arn
  desired_count   = var.desired_count
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = data.aws_subnets.default.ids
    security_groups  = [aws_security_group.ecs_tasks.id]
    assign_public_ip = true
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.app.arn
    container_name   = local.container_name
    container_port   = local.container_port
  }

  # Rolling deployment configuration
  deployment_maximum_percent         = 200
  deployment_minimum_healthy_percent = 100

  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }

  health_check_grace_period_seconds = var.health_check_grace_period

  # Wait for ALB to be ready
  depends_on = [
    aws_lb_listener.http,
    aws_iam_role_policy_attachment.ecs_execution_policy
  ]

  tags = {
    Name = local.app_name
  }
}
