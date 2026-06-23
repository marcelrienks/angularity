# Infrastructure as Code: Terraform Configuration

This directory contains Infrastructure as Code (IaC) for deploying the MX5 Alignment tool to AWS using Terraform.

## Overview

The Terraform configuration deploys:
- **S3 bucket** for static website hosting
- **CloudFront distribution** for global CDN caching
- **Origin Access Control** for secure S3 access
- **Bucket policies** for CloudFront and public access
- **Optional**: Logging, versioning, custom domain support

## Prerequisites

1. **Terraform**: Install from https://www.terraform.io/downloads
   ```bash
   terraform version  # Should be >= 1.0
   ```

2. **AWS CLI**: Configured with credentials
   ```bash
   aws configure
   aws sts get-caller-identity  # Verify credentials work
   ```

3. **Local site files**: Must exist in `../site/` directory relative to this folder

## Note

Terraform configuration files (main.tf, provider.tf, variables.tf, terraform.tfvars.example) have been removed. Only security.tf remains for reference.


## Security Best Practices

1. **Never commit terraform.tfstate** (already in .gitignore)
2. **Use IAM roles** instead of access keys (if running from EC2/Lambda)
3. **Enable S3 versioning** for accidental deletion recovery
4. **Use remote state with encryption** for production
5. **Restrict AWS IAM permissions** to minimal needed
6. **Use ACM for SSL** (automatic renewal, free)
7. **Enable CloudFront logging** for security auditing

## Support

For Terraform documentation:
- https://terraform.io/docs/language — Terraform language docs
- https://registry.terraform.io/providers/hashicorp/aws — AWS provider docs

For AWS infrastructure questions, see: [../docs/DEPLOYMENT.md](../docs/DEPLOYMENT.md)

---

**Last Updated**: April 12, 2026  
**Status**: Production-Ready Infrastructure Code
