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
  default     = 512
}

variable "memory" {
  description = "Fargate memory in MiB (must be compatible with CPU)"
  type        = number
  default     = 1024
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
