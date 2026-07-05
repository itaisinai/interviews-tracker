terraform {
  required_version = ">= 1.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # Uncomment for remote state (recommended for team environments)
  # backend "s3" {
  #   bucket         = "interviews-tracker-terraform-state"
  #   key            = "ecs/terraform.tfstate"
  #   region         = "eu-central-1"
  #   dynamodb_table = "terraform-state-lock"
  #   encrypt        = true
  # }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "interviews-tracker"
      Environment = var.environment
      ManagedBy   = "terraform"
    }
  }
}

# Data sources
data "aws_caller_identity" "current" {}

data "aws_vpc" "default" {
  default = true
}

data "aws_subnets" "default" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.default.id]
  }
}

data "aws_ssm_parameters_by_path" "app_secrets" {
  path            = "/interviews-tracker/prod"
  recursive       = true
  with_decryption = false
}

# Local variables
locals {
  container_name = "api"
  container_port = 3000
  app_name       = "interviews-tracker"
  account_id     = data.aws_caller_identity.current.account_id

  # Convert SSM parameter paths to environment variable format
  # e.g., /interviews-tracker/prod/DATABASE_URL -> DATABASE_URL
  ssm_secrets = [
    for param in data.aws_ssm_parameters_by_path.app_secrets.names : {
      name      = replace(param, "/interviews-tracker/prod/", "")
      valueFrom = param
    }
  ]
}
