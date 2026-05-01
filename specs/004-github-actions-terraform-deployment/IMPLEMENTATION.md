# GitHub Actions + Terraform Deployment — Analysis & Implementation Plan

**Date**: May 1, 2026  
**Current State**: Partial infrastructure exists; missing DNS integration and streamlined CI/CD  
**Goal**: Automated deployment from GitHub `main` to `alignment.marcelrienks.com` via S3+CloudFront

---

## Current State Analysis

### What Already Exists ✅

#### Terraform Infrastructure (Mostly Complete)
- **`provider.tf`** — AWS provider correctly configured with `us-east-1` default region
- **`main.tf`** — S3 bucket + CloudFront distribution + versioning + bucket policy (good security)
- **`variables.tf`** — All variables properly defined; supports custom domain via variables
- **`security.tf`** — Defines IAM policy for GitHub Actions user (hardcoded to wrong bucket name)

#### GitHub Actions Workflow
- **`.github/workflows/deploy.yml`** — Triggers on `main` push, runs tests, deploys to S3, invalidates cache
- **Infrastructure**: User `github-actions` created with IAM policy `mx5-alignment-deployment`

#### AWS Account State
- **Hosted Zone**: `marcelrienks.com` exists in Route53 (ID: Z0003562GQFFYQVGWRWO)
- **ACM Certificate**: `id.marcelrienks.com` certificate exists (may need separate one for `alignment.marcelrienks.com`)
- **IAM User**: `github-actions` exists (AIDAVKIFKRIETQOJLCWSV)
- **IAM Policy**: `mx5-alignment-deployment` attached to user (needs update)

### What's Missing ❌

| Item | Impact | Priority |
|------|--------|----------|
| **terraform.tfvars** | Infrastructure can't be deployed without production config | 🔴 Critical |
| **Route53 DNS integration** | Custom domain won't resolve to CloudFront | 🔴 Critical |
| **ACM cert for `alignment.marcelrienks.com`** | HTTPS won't work for custom domain | 🔴 Critical |
| **Updated IAM policy** | Policy references wrong bucket name (`alignment-marcelrienks.com-static` vs generated name) | 🟡 High |
| **GitHub Actions secrets** | CLOUDFRONT_DISTRIBUTION_ID not set; optional but needed for cache invalidation | 🟡 High |

### What's Redundant/Unnecessary ❌

| Item | Reason | Action |
|------|--------|--------|
| **monitoring.tf** | CloudWatch dashboards/alarms optional; scope creep | Remove or disable by default |

---

## Detailed Action Items

### Phase 1: Setup & Validation

#### 1.1 Verify ACM Certificate Availability
```bash
# Check if certificate exists for alignment.marcelrienks.com
aws acm describe-certificate \
  --certificate-arn <arn> \
  --region us-east-1

# If not, need to:
# - Request new certificate via ACM (with DNS validation)
# - Or import existing certificate
```

**Decision Point**: Certificate must be in `us-east-1` (CloudFront requirement).

#### 1.2 Verify Route53 Zone Delegation
```bash
# Ensure NS records for marcelrienks.com point to Route53
aws route53 get-hosted-zone --id /hostedzone/Z0003562GQFFYQVGWRWO

# Domain registrar should have NS records pointing to Route53 nameservers
dig marcelrienks.com NS @8.8.8.8
```

#### 1.3 Plan S3 Bucket Naming
- **Terraform local**: `s3_bucket_name = "${var.project_name}-${data.aws_caller_identity.current.account_id}"`
- **Result**: `mx5-alignment-365620267529` (account ID appended for uniqueness)
- **Update IAM policy** to reference this dynamically

---

### Phase 2: Infrastructure Code Changes

#### 2.1 Create `terraform.tfvars`

**File**: `infrastructure/terraform.tfvars`

```hcl
# AWS Configuration
aws_region = "us-east-1"
environment = "prod"

# S3 Bucket Configuration (auto-generated if empty)
bucket_name = ""

# Project naming
project_name = "mx5-alignment"
cloudfront_comment = "MX5 NC1 Wheel Alignment Tool - Production"

# Cache Configuration
cache_ttl_seconds = 3600  # 1 hour

# CloudFront Configuration
price_class = "PriceClass_100"  # Most regions, cost-effective

# Logging (keep disabled for simplicity)
enable_logging = false

# Versioning (enabled for rollback)
enable_versioning = true

# Custom Domain (IMPORTANT: Update with actual domain)
custom_domain = "alignment.marcelrienks.com"
acm_certificate_arn = "arn:aws:acm:us-east-1:365620267529:certificate/<CERT_ID>"

# Local site directory
site_directory = "../site"

# Monitoring (keep disabled for simplicity)
enable_monitoring_alerts = false
```

**Action**: Requires valid ACM certificate ARN for the domain.

#### 2.2 Update `infrastructure/main.tf` — Add Route53 Integration

**Add after CloudFront distribution definition**:

```hcl
# Route53 A Record (Alias) pointing to CloudFront
data "aws_route53_zone" "main" {
  name = "marcelrienks.com"
}

resource "aws_route53_record" "alignment_cloudfront" {
  count   = var.custom_domain != "" ? 1 : 0
  zone_id = data.aws_route53_zone.main.zone_id
  name    = var.custom_domain
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.website.domain_name
    zone_id                = aws_cloudfront_distribution.website.hosted_zone_id
    evaluate_target_health = false
  }
}
```

**Outputs** (add after existing outputs):

```hcl
output "route53_record_name" {
  description = "Route53 FQDN for custom domain"
  value       = var.custom_domain != "" ? aws_route53_record.alignment_cloudfront[0].fqdn : "Not configured"
}
```

#### 2.3 Update `infrastructure/security.tf` — Fix IAM Policy

**Current Problem**: Policy hardcoded to `arn:aws:s3:::alignment-marcelrienks.com-static`

**Change to**:

```hcl
# Update the S3DeploymentAccess statement to use dynamic bucket ARN:
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
}

# Add Route53 permissions (if needed for automated DNS updates):
{
  Sid    = "Route53Read"
  Effect = "Allow"
  Action = [
    "route53:GetHostedZone",
    "route53:ListResourceRecordSets"
  ]
  Resource = "arn:aws:route53:::hostedzone/Z0003562GQFFYQVGWRWO"  # marcelrienks.com zone
}
```

**Then update the IAM user policy**:

```bash
aws iam put-user-policy \
  --user-name github-actions \
  --policy-name mx5-alignment-deployment \
  --policy-document file://path/to/updated-policy.json
```

#### 2.4 Remove or Disable Monitoring

**Option A** (Remove): Delete `infrastructure/monitoring.tf` entirely.

**Option B** (Disable): Keep file but set `enable_logging = false` and `enable_monitoring_alerts = false` in `terraform.tfvars`.

**Recommendation**: Option A (remove) — simpler, no unused code.

#### 2.5 Update `.gitignore`

Ensure these are ignored:

```gitignore
# Terraform
infrastructure/terraform.tfvars
infrastructure/terraform.tfstate*
infrastructure/.terraform/
infrastructure/.terraform.lock.hcl
.terraform.lock.hcl
```

---

### Phase 3: GitHub Actions Configuration

#### 3.1 Verify Workflow Secrets

Required secrets in GitHub repository settings:
- `AWS_ACCESS_KEY_ID` ✅ (assumed set)
- `AWS_SECRET_ACCESS_KEY` ✅ (assumed set)
- `CLOUDFRONT_DISTRIBUTION_ID` ❓ (needs to be added after `terraform apply`)

**Add via GitHub CLI**:

```bash
# After terraform apply, capture the distribution ID
DISTRIBUTION_ID=$(terraform output -raw cloudfront_distribution_id)

# Add to GitHub secrets
gh secret set CLOUDFRONT_DISTRIBUTION_ID --body "$DISTRIBUTION_ID"
```

#### 3.2 Workflow Already Correct

`.github/workflows/deploy.yml` already handles:
- ✅ Trigger on push to `main`
- ✅ Run tests first
- ✅ Deploy to S3
- ✅ Invalidate CloudFront (if secret set)
- ✅ Conditional deployment (only if tests pass)

**No changes needed** to the workflow.

---

### Phase 4: Deployment Steps

#### Step 1: Prepare Infrastructure Code
```bash
cd infrastructure/

# Copy example to actual tfvars
cp terraform.tfvars.example terraform.tfvars

# Edit to add:
# - custom_domain = "alignment.marcelrienks.com"
# - acm_certificate_arn = "<ACTUAL_ARN>"
vim terraform.tfvars
```

#### Step 2: Initialize Terraform
```bash
terraform init

# If not yet initialized, will create:
# - .terraform/ directory
# - .terraform.lock.hcl (lock file for reproducible builds)
```

#### Step 3: Plan & Review
```bash
terraform plan -out=tfplan

# Review output for:
# - Correct S3 bucket name
# - Correct CloudFront domain alias
# - Correct Route53 record
```

#### Step 4: Apply Infrastructure
```bash
terraform apply tfplan

# Outputs will include:
# - s3_bucket_name
# - cloudfront_distribution_id
# - route53_record_name
# - website_url (CloudFront default domain)
# - custom_domain_url (alignment.marcelrienks.com)
```

#### Step 5: Capture & Store Outputs
```bash
# Save for GitHub Actions
DISTRIBUTION_ID=$(terraform output -raw cloudfront_distribution_id)
S3_BUCKET=$(terraform output -raw s3_bucket_name)

echo "CLOUDFRONT_DISTRIBUTION_ID: $DISTRIBUTION_ID"
echo "S3_BUCKET_NAME: $S3_BUCKET"

# Add to GitHub secrets
gh secret set CLOUDFRONT_DISTRIBUTION_ID --body "$DISTRIBUTION_ID"
```

#### Step 6: Verify DNS Resolution
```bash
# Wait ~5 minutes for Route53 to propagate
dig alignment.marcelrienks.com +short
# Should return CloudFront domain (e.g., d12345.cloudfront.net)

# Check HTTPS certificate
curl -I https://alignment.marcelrienks.com/
# Should show 200 OK with valid certificate
```

#### Step 7: Test Automated Deployment
```bash
# Make a small change to site/
echo "<!-- test -->" >> site/index.html

# Commit and push to main
git add site/index.html
git commit -m "test: verify automated deployment"
git push origin main

# GitHub Actions will:
# 1. Run tests
# 2. Deploy to S3
# 3. Invalidate CloudFront
# 4. Site updates visible within 2 minutes
```

---

## File Changes Summary

### New Files
- ✅ `infrastructure/terraform.tfvars` (create from example; add domain)

### Modified Files
- 📝 `infrastructure/main.tf` (add Route53 resources)
- 📝 `infrastructure/security.tf` (fix IAM policy to use dynamic bucket ARN)

### Deleted Files
- 🗑️ `infrastructure/monitoring.tf` (optional; remove for simplicity)

### No Changes Needed
- ✅ `infrastructure/provider.tf`
- ✅ `infrastructure/variables.tf`
- ✅ `.github/workflows/deploy.yml`
- ✅ `site/` (deployment source)
- ✅ `tests/` (no changes to tests)

---

## Deployment Checklist

### Pre-Deployment
- [ ] ACM certificate for `alignment.marcelrienks.com` created/verified
- [ ] terraform.tfvars created with domain and cert ARN
- [ ] Route53 zone marcelrienks.com verified active
- [ ] security.tf updated with dynamic bucket ARN
- [ ] GitHub Actions secrets verified (AWS credentials set)
- [ ] Site files verified in `site/` directory
- [ ] Tests run locally and pass (`npm run test:all-sync`)

### Deployment
- [ ] `terraform init` in infrastructure/
- [ ] `terraform plan` reviewed for correctness
- [ ] `terraform apply` successful
- [ ] Outputs captured (Distribution ID, S3 bucket name)
- [ ] CLOUDFRONT_DISTRIBUTION_ID added to GitHub secrets

### Post-Deployment Validation
- [ ] DNS resolves: `dig alignment.marcelrienks.com`
- [ ] HTTPS works: `curl -I https://alignment.marcelrienks.com`
- [ ] Site loads in browser: https://alignment.marcelrienks.com
- [ ] Test push to main triggers workflow
- [ ] Tests pass automatically
- [ ] Deployment completes without errors
- [ ] CloudFront cache invalidation occurs
- [ ] Updated site visible within 2 minutes

### Rollback Plan
- S3 versioning enabled → recover previous version
- No state file stored remotely yet → manual recovery only
- Consider enabling remote state (S3 + DynamoDB) for production

---

## Key Decisions Made

| Decision | Rationale |
|----------|-----------|
| **S3 sync (not Terraform apply) for deployment** | Simpler CI/CD; Terraform stays for one-time infrastructure setup |
| **Keep monitoring.tf disabled** | Out of scope; not required for basic deployment automation |
| **Leverage existing github-actions IAM user** | Already created; avoid duplication; just needs permission update |
| **Single hosted zone (marcelrienks.com)** | Domain already there; add subdomain record |
| **No blue-green or canary deployments** | Scope creep; S3 versioning + cache invalidation sufficient |
| **All automation via GitHub Actions** | No separate CI/CD system; use built-in workflows |

---

## Risk Summary

| Risk | Mitigation |
|------|-----------|
| ACM cert doesn't exist | Request in AWS Console; no code blocker |
| Route53 delegation stale | AWS manages; verify NS records point to Route53 |
| IAM policy too restrictive | Test deployment; add permissions if needed |
| Stale CloudFront cache | Workflow already invalidates; user sees updates in ~2 min |
| S3 bucket name collision | Account ID ensures uniqueness |

---

## Next Steps

1. **Verify ACM certificate** — Check if `alignment.marcelrienks.com` cert exists
2. **Create terraform.tfvars** — Add domain and cert ARN
3. **Update infrastructure code** — Add Route53; fix IAM policy
4. **Run terraform apply** — Create all resources
5. **Capture outputs** — Add Distribution ID to GitHub secrets
6. **Test end-to-end** — Push to main, verify deployment

**Estimated Time**: 15-30 minutes (mostly AWS resource creation time)
