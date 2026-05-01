variable "aws_region" {
  description = "AWS region for deployment"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Environment name (prod recommended for this project)"
  type        = string
  default     = "prod"
}

variable "bucket_name" {
  description = "S3 bucket name (must be globally unique)"
  type        = string
  default     = ""
}

variable "project_name" {
  description = "Project name for resource naming"
  type        = string
  default     = "mx5-alignment"
}

variable "cloudfront_comment" {
  description = "CloudFront distribution comment/identifier"
  type        = string
  default     = "MX5 NC1 Wheel Alignment Tool"
}

variable "cache_ttl_seconds" {
  description = "CloudFront cache TTL in seconds"
  type        = number
  default     = 3600
}

variable "enable_logging" {
  description = "Enable CloudFront and S3 logging"
  type        = bool
  default     = false
}

variable "price_class" {
  description = "CloudFront price class (PriceClass_100, PriceClass_200, PriceClass_All)"
  type        = string
  default     = "PriceClass_100"
  
  validation {
    condition     = contains(["PriceClass_100", "PriceClass_200", "PriceClass_All"], var.price_class)
    error_message = "Price class must be one of: PriceClass_100, PriceClass_200, PriceClass_All"
  }
}

variable "custom_domain" {
  description = "Custom domain name for CloudFront (e.g., alignment.example.com)"
  type        = string
  default     = ""
}

variable "acm_certificate_arn" {
  description = "ARN of ACM certificate for custom domain (required if custom_domain is set)"
  type        = string
  default     = ""
}

variable "route53_zone_id" {
  description = "Route53 hosted zone ID for custom domain DNS records"
  type        = string
  default     = "Z0003562GQFFYQVGWRWO"  # marcelrienks.com
}

variable "enable_versioning" {
  description = "Enable S3 bucket versioning for rollback capability"
  type        = bool
  default     = true
}

variable "site_directory" {
  description = "Local path to site files to upload"
  type        = string
  default     = "../site"
}

variable "enable_monitoring_alerts" {
  description = "Enable CloudWatch monitoring and SNS alerts"
  type        = bool
  default     = false
}

variable "alert_email" {
  description = "Email address for CloudWatch alerts (if monitoring enabled)"
  type        = string
  default     = ""
}

locals {
  s3_bucket_name = var.bucket_name != "" ? var.bucket_name : "${var.project_name}-${data.aws_caller_identity.current.account_id}"
  
  cloudfront_origins = var.custom_domain != "" ? [var.custom_domain] : []
}

data "aws_caller_identity" "current" {}
data "aws_partition" "current" {}
