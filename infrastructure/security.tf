# IAM Policies and Security Configuration for CI/CD Deployment

# Minimal IAM Policy for GitHub Actions CI/CD Deployment
locals {
  github_actions_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "S3DeploymentAccess"
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject",
          "s3:ListBucket"
        ]
        Resource = [
          aws_s3_bucket.website.arn,
          "${aws_s3_bucket.website.arn}/*"
        ]
      },
      {
        Sid    = "CloudFrontInvalidation"
        Effect = "Allow"
        Action = [
          "cloudfront:CreateInvalidation",
          "cloudfront:ListInvalidations",
          "cloudfront:GetInvalidation"
        ]
        Resource = aws_cloudfront_distribution.website.arn
      },
      {
        Sid    = "CloudFrontRead"
        Effect = "Allow"
        Action = [
          "cloudfront:GetDistribution",
          "cloudfront:ListDistributions"
        ]
        Resource = "*"
      }
    ]
  })
}

# Encryption at rest for S3
resource "aws_s3_bucket_server_side_encryption_configuration" "website" {
  bucket = aws_s3_bucket.website.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# Enable request logging for S3 (optional)
resource "aws_s3_bucket_logging" "website_request_logs" {
  count         = var.enable_logging ? 1 : 0
  bucket        = aws_s3_bucket.website.id
  target_bucket = aws_s3_bucket.logs[0].id
  target_prefix = "s3-request-logs/"
}

# Output IAM policy for GitHub Actions setup
output "iam_policy_github_actions" {
  description = "IAM policy for GitHub Actions deployment (JSON format)"
  value       = local.github_actions_policy
}

output "setup_instructions" {
  description = "Instructions for setting up GitHub Actions IAM user"
  value       = <<-EOT
    GitHub Actions IAM Setup:
    1. AWS Console → IAM → Users → Create user "github-actions"
    2. Select: Access Key - Programmatic access
    3. Attach inline policy with the JSON from iam_policy_github_actions output
    4. Download CSV with Access Key ID and Secret Access Key
    5. GitHub → Settings → Secrets and variables → Actions
    6. Add secrets:
       - AWS_ACCESS_KEY_ID
       - AWS_SECRET_ACCESS_KEY
       - CLOUDFRONT_DISTRIBUTION_ID (after first deploy)
  EOT
}

