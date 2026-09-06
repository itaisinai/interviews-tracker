# ============================================
# RDS PostgreSQL Database (Optional)
# ============================================
# This is optional - you can keep using your existing database (Neon/Supabase)
# To use RDS: set var.create_rds = true
# To skip RDS: set var.create_rds = false (default)

# Security group for RDS
resource "aws_security_group" "rds" {
  count = var.create_rds ? 1 : 0

  name        = "${local.app_name}-rds-sg"
  description = "Security group for RDS PostgreSQL"
  vpc_id      = data.aws_vpc.default.id

  ingress {
    description     = "PostgreSQL from ECS tasks"
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.ecs_tasks.id]
  }

  egress {
    description = "Allow all outbound"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${local.app_name}-rds-sg"
  }
}

# DB Subnet Group (uses default VPC subnets)
resource "aws_db_subnet_group" "main" {
  count = var.create_rds ? 1 : 0

  name       = "${local.app_name}-db-subnet"
  subnet_ids = data.aws_subnets.default.ids

  tags = {
    Name = "${local.app_name}-db-subnet"
  }
}

# RDS PostgreSQL instance
resource "aws_db_instance" "main" {
  count = var.create_rds ? 1 : 0

  identifier     = local.app_name
  engine         = "postgres"
  engine_version = "16.15"
  instance_class = var.db_instance_class

  allocated_storage     = var.db_allocated_storage
  max_allocated_storage = var.db_max_allocated_storage
  storage_type          = "gp3"
  storage_encrypted     = true

  db_name  = replace(local.app_name, "-", "_")
  username = var.db_username
  password = var.db_password # Should be set via terraform.tfvars or TF_VAR_db_password

  db_subnet_group_name   = aws_db_subnet_group.main[0].name
  vpc_security_group_ids = [aws_security_group.rds[0].id]
  publicly_accessible    = false

  backup_retention_period = var.db_backup_retention_days
  backup_window           = "03:00-04:00"
  maintenance_window      = "mon:04:00-mon:05:00"

  skip_final_snapshot       = var.environment != "prod"
  final_snapshot_identifier = var.environment == "prod" ? "${local.app_name}-final-snapshot-${formatdate("YYYY-MM-DD-hhmm", timestamp())}" : null

  deletion_protection = var.environment == "prod"

  # Performance Insights disabled to save costs
  enabled_cloudwatch_logs_exports = ["postgresql"]

  tags = {
    Name = "${local.app_name}-db"
  }
}

# Store database URL in SSM Parameter Store (if RDS is created)
resource "aws_ssm_parameter" "database_url" {
  count = var.create_rds ? 1 : 0

  name        = "/interviews-tracker/prod/DATABASE_URL"
  description = "PostgreSQL connection string for ${local.app_name}"
  type        = "SecureString"
  value       = "postgresql://${var.db_username}:${var.db_password}@${aws_db_instance.main[0].endpoint}/${aws_db_instance.main[0].db_name}"
  overwrite   = true

  tags = {
    Name = "${local.app_name}-database-url"
  }
}
