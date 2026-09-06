variable "aws_region" {
  description = "AWS region for resources"
  type        = string
  default     = "eu-central-1"
}

variable "environment" {
  description = "Environment name (e.g., prod, staging)"
  type        = string
  default     = "prod"
}

variable "app_image" {
  description = "Docker image URL for the application"
  type        = string
  default     = "669424048162.dkr.ecr.eu-central-1.amazonaws.com/interviews-tracker:latest"
}

variable "cpu" {
  description = "Fargate CPU units (256, 512, 1024, 2048, 4096)"
  type        = number
  default     = 256
}

variable "memory" {
  description = "Fargate memory in MiB (must be compatible with CPU)"
  type        = number
  default     = 512
}

variable "desired_count" {
  description = "Desired number of tasks"
  type        = number
  default     = 1
}

variable "health_check_grace_period" {
  description = "Health check grace period in seconds"
  type        = number
  default     = 60
}

variable "log_retention_days" {
  description = "CloudWatch log retention in days"
  type        = number
  default     = 14
}

variable "enable_https" {
  description = "Enable HTTPS listener (requires ACM certificate ARN)"
  type        = bool
  default     = false
}

variable "certificate_arn" {
  description = "ACM certificate ARN for HTTPS (required if enable_https is true)"
  type        = string
  default     = ""
}

# ============================================
# Domain & DNS Configuration
# ============================================
variable "domain_name" {
  description = "Domain name for the application (e.g., interviews.trackylab.com)"
  type        = string
  default     = "interviews.trackylab.com"
}

variable "root_domain_name" {
  description = "Root domain name in Route53 hosted zone (e.g., trackylab.com). Leave empty if same as domain_name"
  type        = string
  default     = "trackylab.com"
}

variable "create_www_redirect" {
  description = "Create www subdomain redirect"
  type        = bool
  default     = false
}

# ============================================
# RDS Configuration (Optional)
# ============================================
variable "create_rds" {
  description = "Create RDS PostgreSQL instance (set to false to use external DB like Neon)"
  type        = bool
  default     = false
}

variable "db_instance_class" {
  description = "RDS instance class (smallest: db.t4g.micro)"
  type        = string
  default     = "db.t4g.micro"
}

variable "db_allocated_storage" {
  description = "Initial database storage in GB"
  type        = number
  default     = 20
}

variable "db_max_allocated_storage" {
  description = "Maximum database storage in GB (for autoscaling)"
  type        = number
  default     = 50
}

variable "db_username" {
  description = "Database master username"
  type        = string
  default     = "postgres"
  sensitive   = true
}

variable "db_password" {
  description = "Database master password (set via TF_VAR_db_password or terraform.tfvars)"
  type        = string
  sensitive   = true
  default     = ""
}

variable "db_backup_retention_days" {
  description = "Number of days to retain automated backups"
  type        = number
  default     = 7
}
