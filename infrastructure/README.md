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

## Quick Start (5 minutes)

### 1. Initialize Terraform

```bash
cd infrastructure/
terraform init
```

This downloads AWS provider plugins and initializes the working directory.

### 2. Configure Variables

```bash
# Copy example to actual variables file
cp terraform.tfvars.example terraform.tfvars

# Edit terraform.tfvars with your preferences
nano terraform.tfvars
```

Key variables to consider:
- `aws_region`: Where to deploy (default: us-east-1 for CloudFront)
- `bucket_name`: S3 bucket name (must be globally unique) — leave empty for auto-generate
- `custom_domain`: If using branded domain (requires ACM certificate)
- `environment`: "prod", "staging", or "dev"

### 3. Plan Deployment

```bash
terraform plan
```

Review the plan output. You should see:
- 1 S3 bucket
- 1 CloudFront distribution
- 1 Origin Access Control
- Various policies and configurations

### 4. Apply Configuration

```bash
terraform apply
```

Type `yes` when prompted. This will:
1. Create S3 bucket
2. Configure bucket for static hosting
3. Create CloudFront distribution (takes 5-10 minutes to be "enabled")
4. Output URLs and IDs

### 5. Save Outputs

After `terraform apply`, note the outputs:
```
Outputs:

cloudfront_distribution_id = "E1ABC2DEF34GHI"
cloudfront_domain_name = "d1234abc.cloudfront.net"
s3_bucket_name = "mx5-alignment-123456789012"
website_url = "https://d1234abc.cloudfront.net"
```

**Save these** — you'll need:
- `cloudfront_distribution_id` for GitHub Actions (`CLOUDFRONT_DISTRIBUTION_ID` secret)
- `website_url` for testing

### 6. Test Deployment

```bash
# Wait for CloudFront status to be "Enabled" (5-10 minutes)
aws cloudfront get-distribution \
  --id E1ABC2DEF34GHI \
  --query 'Distribution.Status' \
  --output text

# Once "Enabled", test the URL
curl https://d1234abc.cloudfront.net
```

## File Structure

```
infrastructure/
├── provider.tf              # AWS provider configuration
├── variables.tf             # Variable definitions
├── main.tf                  # Main infrastructure resources
├── terraform.tfvars.example # Example configuration (copy to terraform.tfvars)
├── terraform.tfstate*       # State file (auto-created, don't commit)
└── README.md                # This file

* .gitignore includes terraform.tfstate
```

## Advanced Usage

### Deploy with Custom Domain

1. Ensure you have an ACM certificate in the same region:
   ```bash
   aws acm list-certificates --region us-east-1
   ```

2. Update `terraform.tfvars`:
   ```hcl
   custom_domain = "alignment.example.com"
   acm_certificate_arn = "arn:aws:acm:us-east-1:123456789012:certificate/..."
   ```

3. Create Route 53 record:
   ```bash
   aws route53 change-resource-record-sets \
     --hosted-zone-id Z123ABC \
     --change-batch '{...}'
   ```

4. Apply:
   ```bash
   terraform apply
   ```

### Enable Logging

Update `terraform.tfvars`:
```hcl
enable_logging = true
```

This creates an additional logging bucket to track S3 and CloudFront requests.

### Remove Versioning

If you don't need rollback capability:
```hcl
enable_versioning = false
```

### Use Different Price Class

```hcl
price_class = "PriceClass_All"  # Higher cost, all edge locations
```

## Terraform Commands

```bash
# Show current state
terraform show

# Show outputs only
terraform output

# Plan changes (dry run)
terraform plan

# Apply changes
terraform apply

# Destroy all resources (CAREFUL!)
terraform destroy

# List resources
terraform state list

# Show specific resource
terraform state show aws_s3_bucket.website

# Validate configuration syntax
terraform validate

# Format files
terraform fmt -recursive
```

## State Management

By default, Terraform stores state locally in `terraform.tfstate`. This file is in `.gitignore` for security.

### Remote State (Recommended for Teams)

For team collaboration, use S3 + DynamoDB for state:

1. Create state backend:
   ```bash
   aws s3 mb s3://my-terraform-state
   aws dynamodb create-table \
     --table-name terraform-locks \
     --attribute-definitions AttributeName=LockID,AttributeType=S \
     --key-schema AttributeName=LockID,KeyType=HASH \
     --provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=5
   ```

2. Uncomment backend in `provider.tf`:
   ```hcl
   backend "s3" {
     bucket         = "my-terraform-state"
     key            = "mx5-alignment/terraform.tfstate"
     region         = "us-east-1"
     dynamodb_table = "terraform-locks"
     encrypt        = true
   }
   ```

3. Re-initialize:
   ```bash
   terraform init
   ```

## Monitoring & Maintenance

### Check Distribution Status

```bash
terraform output cloudfront_distribution_id
aws cloudfront get-distribution --id [ID] | jq '.Distribution | {Status, Id, DomainName}'
```

### Monitor Performance

```bash
# Get cache hit ratio
aws cloudfront get-distribution-statistics \
  --distribution-id [ID] \
  --query 'Statistics.CacheHitRatio'
```

### Invalidate Cache

If you deploy new files without Terraform:
```bash
aws cloudfront create-invalidation \
  --distribution-id $(terraform output -raw cloudfront_distribution_id) \
  --paths "/*"
```

## Troubleshooting

### Issue: "Error: Error creating S3 bucket: BucketAlreadyExists"

**Cause**: S3 bucket names are globally unique. The generated name already exists.

**Solution**: Set custom bucket name in `terraform.tfvars`:
```hcl
bucket_name = "my-alignment-bucket-2026-04-12"
```

### Issue: "InvalidViewerCertificate.Malformed"

**Cause**: ACM certificate doesn't exist or wrong ARN.

**Solution**: Verify certificate:
```bash
aws acm list-certificates --region us-east-1
```

### Issue: CloudFront returns 403 Forbidden

**Cause**: OAC not properly configured or S3 bucket policy incorrect.

**Solution**: Re-apply Terraform:
```bash
terraform apply -target=aws_s3_bucket_policy.website
```

### Issue: "Error refreshing state: resource does not exist"

**Cause**: Resource was manually deleted from AWS Console.

**Solution**: Remove from state:
```bash
terraform state rm aws_s3_bucket.website
# Then apply again
terraform apply
```

## Cleanup

To delete all resources managed by Terraform:

```bash
# Preview what will be deleted
terraform plan -destroy

# Actually destroy
terraform destroy
```

**WARNING**: This permanently deletes the S3 bucket and all objects in it!

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
