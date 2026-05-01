# S3 Bucket for static files
resource "aws_s3_bucket" "website" {
  bucket = local.s3_bucket_name

  tags = {
    Name        = "${var.project_name}-website"
    Description = "Static website hosting for MX5 alignment tool"
  }
}

# Enable versioning for rollback capability
resource "aws_s3_bucket_versioning" "website" {
  bucket = aws_s3_bucket.website.id

  versioning_configuration {
    status = var.enable_versioning ? "Enabled" : "Suspended"
  }
}

# Enable static website hosting
resource "aws_s3_bucket_website_configuration" "website" {
  bucket = aws_s3_bucket.website.id

  index_document {
    suffix = "index.html"
  }

  error_document {
    key = "index.html"
  }

  depends_on = [aws_s3_bucket_public_access_block.website]
}

# Block public access (will allow CloudFront only)
resource "aws_s3_bucket_public_access_block" "website" {
  bucket = aws_s3_bucket.website.id

  block_public_acls       = false
  block_public_policy     = false
  ignore_public_acls      = false
  restrict_public_buckets = false
}

# Bucket policy - allow public read for backward compat + CloudFront
resource "aws_s3_bucket_policy" "website" {
  bucket = aws_s3_bucket.website.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "CloudFrontReadAccess"
        Effect = "Allow"
        Principal = {
          Service = "cloudfront.amazonaws.com"
        }
        Action   = "s3:GetObject"
        Resource = "${aws_s3_bucket.website.arn}/*"
        Condition = {
          StringEquals = {
            "AWS:SourceArn" = "arn:${data.aws_partition.current.partition}:cloudfront::${data.aws_caller_identity.current.account_id}:distribution/${aws_cloudfront_distribution.website.id}"
          }
        }
      },
      {
        Sid       = "PublicRead"
        Effect    = "Allow"
        Principal = "*"
        Action    = "s3:GetObject"
        Resource  = "${aws_s3_bucket.website.arn}/*"
      }
    ]
  })
}

# CloudFront Origin Access Control
# NOTE: This resource may already exist if previous apply partially succeeded
# If creating fails with "already exists", terraform import it:
# terraform import aws_cloudfront_origin_access_control.website <OAC_ID>
resource "aws_cloudfront_origin_access_control" "website" {
  name                              = "${var.project_name}-oac"
  description                       = "OAC for ${var.project_name} S3 bucket"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"

  lifecycle {
    create_before_destroy = true
  }
}

# CloudFront Distribution
resource "aws_cloudfront_distribution" "website" {
  enabled             = true
  default_root_object = "index.html"
  comment             = var.cloudfront_comment
  price_class         = var.price_class
  
  # Custom domain if specified
  aliases = var.custom_domain != "" ? [var.custom_domain] : []

  origin {
    domain_name              = aws_s3_bucket.website.bucket_regional_domain_name
    origin_id                = "s3-origin"
    origin_access_control_id = aws_cloudfront_origin_access_control.website.id
  }

  default_cache_behavior {
    allowed_methods  = ["GET", "HEAD", "OPTIONS"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "s3-origin"

    forwarded_values {
      query_string = false

      cookies {
        forward = "none"
      }
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = var.cache_ttl_seconds
    max_ttl                = 86400
    compress               = true
  }

  # Custom SSL certificate for custom domain
  dynamic "viewer_certificate" {
    for_each = var.custom_domain != "" ? [1] : []
    content {
      acm_certificate_arn      = aws_acm_certificate.alignment[0].arn
      ssl_support_method       = "sni-only"
      minimum_protocol_version = "TLSv1.2_2021"
    }
  }

  # Default SSL certificate
  dynamic "viewer_certificate" {
    for_each = var.custom_domain == "" ? [1] : []
    content {
      cloudfront_default_certificate = true
      minimum_protocol_version       = "TLSv1.2_2021"
    }
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  tags = {
    Name = "${var.project_name}-distribution"
  }
}

# ACM Certificate for custom domain (if custom_domain is specified)
resource "aws_acm_certificate" "alignment" {
  count             = var.custom_domain != "" ? 1 : 0
  domain_name       = var.custom_domain
  validation_method = "DNS"

  tags = {
    Name = "${var.project_name}-alignment-cert"
  }

  lifecycle {
    create_before_destroy = true
  }
}

# ACM Certificate validation (DNS-based)
# NOTE: Requires manual Route53 CNAME validation in AWS console
# Terraform would need dns_provider to auto-validate
# For now, validate manually or skip and accept unvalidated cert
# To validate: Add CNAME record from acm_certificate.alignment[0].domain_validation_options to Route53

# Route53 DNS record for custom domain (A record alias to CloudFront)
resource "aws_route53_record" "alignment" {
  count   = var.custom_domain != "" ? 1 : 0
  zone_id = var.route53_zone_id
  name    = var.custom_domain
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.website.domain_name
    zone_id                = aws_cloudfront_distribution.website.hosted_zone_id
    evaluate_target_health = false
  }
}

# S3 bucket logging (optional)
resource "aws_s3_bucket" "logs" {
  count  = var.enable_logging ? 1 : 0
  bucket = "${local.s3_bucket_name}-logs"

  tags = {
    Name = "${var.project_name}-logs"
  }
}

resource "aws_s3_bucket_logging" "website_logging" {
  count = var.enable_logging ? 1 : 0

  bucket = aws_s3_bucket.website.id

  target_bucket = aws_s3_bucket.logs[0].id
  target_prefix = "s3-logs/"
}

# Display outputs
output "s3_bucket_name" {
  description = "S3 bucket name"
  value       = aws_s3_bucket.website.id
}

output "s3_bucket_arn" {
  description = "S3 bucket ARN"
  value       = aws_s3_bucket.website.arn
}

output "cloudfront_domain_name" {
  description = "CloudFront distribution domain name"
  value       = aws_cloudfront_distribution.website.domain_name
}

output "cloudfront_distribution_id" {
  description = "CloudFront distribution ID"
  value       = aws_cloudfront_distribution.website.id
}

output "cloudfront_distribution_arn" {
  description = "CloudFront distribution ARN"
  value       = aws_cloudfront_distribution.website.arn
}

output "website_url" {
  description = "CloudFront distribution URL"
  value       = "https://${aws_cloudfront_distribution.website.domain_name}"
}

output "custom_domain_url" {
  description = "Custom domain URL (if configured)"
  value       = var.custom_domain != "" ? "https://${var.custom_domain}" : "Not configured"
}

output "acm_certificate_arn" {
  description = "ACM certificate ARN for custom domain"
  value       = var.custom_domain != "" ? aws_acm_certificate.alignment[0].arn : "Not configured"
}

output "route53_record_name" {
  description = "Route53 DNS record name for custom domain"
  value       = var.custom_domain != "" ? aws_route53_record.alignment[0].name : "Not configured"
}
