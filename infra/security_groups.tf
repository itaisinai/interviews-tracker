# ============================================
# Security Group for ALB
# ============================================
resource "aws_security_group" "alb" {
  name        = "${local.app_name}-alb-sg"
  description = "Security group for Application Load Balancer"
  vpc_id      = data.aws_vpc.default.id

  tags = {
    Name = "${local.app_name}-alb-sg"
  }
}

# Allow HTTP from internet
resource "aws_vpc_security_group_ingress_rule" "alb_http" {
  security_group_id = aws_security_group.alb.id
  description       = "Allow HTTP traffic from internet"

  from_port   = 80
  to_port     = 80
  ip_protocol = "tcp"
  cidr_ipv4   = "0.0.0.0/0"

  tags = {
    Name = "alb-http-ingress"
  }
}

# Allow HTTPS from internet (optional, for future use)
resource "aws_vpc_security_group_ingress_rule" "alb_https" {
  security_group_id = aws_security_group.alb.id
  description       = "Allow HTTPS traffic from internet"

  from_port   = 443
  to_port     = 443
  ip_protocol = "tcp"
  cidr_ipv4   = "0.0.0.0/0"

  tags = {
    Name = "alb-https-ingress"
  }
}

# Allow all outbound traffic from ALB
resource "aws_vpc_security_group_egress_rule" "alb_egress" {
  security_group_id = aws_security_group.alb.id
  description       = "Allow all outbound traffic"

  ip_protocol = "-1"
  cidr_ipv4   = "0.0.0.0/0"

  tags = {
    Name = "alb-egress"
  }
}

# ============================================
# Security Group for ECS Tasks
# ============================================
resource "aws_security_group" "ecs_tasks" {
  name        = "${local.app_name}-ecs-tasks-sg"
  description = "Security group for ECS tasks"
  vpc_id      = data.aws_vpc.default.id

  tags = {
    Name = "${local.app_name}-ecs-tasks-sg"
  }
}

# Allow traffic from ALB only
resource "aws_vpc_security_group_ingress_rule" "ecs_from_alb" {
  security_group_id = aws_security_group.ecs_tasks.id
  description       = "Allow traffic from ALB"

  from_port                    = local.container_port
  to_port                      = local.container_port
  ip_protocol                  = "tcp"
  referenced_security_group_id = aws_security_group.alb.id

  tags = {
    Name = "ecs-from-alb-ingress"
  }
}

# Allow all outbound traffic (for database, external APIs, etc.)
resource "aws_vpc_security_group_egress_rule" "ecs_egress" {
  security_group_id = aws_security_group.ecs_tasks.id
  description       = "Allow all outbound traffic"

  ip_protocol = "-1"
  cidr_ipv4   = "0.0.0.0/0"

  tags = {
    Name = "ecs-egress"
  }
}
