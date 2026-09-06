# ============================================
# Application Load Balancer
# ============================================
resource "aws_lb" "main" {
  name               = "${local.app_name}-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = data.aws_subnets.default.ids

  enable_deletion_protection       = false
  enable_http2                     = true
  enable_cross_zone_load_balancing = true

  tags = {
    Name = "${local.app_name}-alb"
  }
}

# ============================================
# Target Group
# ============================================
resource "aws_lb_target_group" "app" {
  name        = "${local.app_name}-tg"
  port        = local.container_port
  protocol    = "HTTP"
  vpc_id      = data.aws_vpc.default.id
  target_type = "ip"

  health_check {
    enabled             = true
    healthy_threshold   = 2
    unhealthy_threshold = 3
    timeout             = 5
    interval            = 30
    path                = "/health"
    protocol            = "HTTP"
    matcher             = "200"
  }

  deregistration_delay = 30

  tags = {
    Name = "${local.app_name}-tg"
  }
}

# ============================================
# HTTP Listener (HTTPS temporarily disabled)
# ============================================
resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.main.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.app.arn
  }

  tags = {
    Name = "${local.app_name}-http-listener"
  }
}
