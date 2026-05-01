# Current State Analysis — GitHub Actions + Terraform Deployment

**Date**: May 1, 2026  
**AWS Account**: marcelrienks (365620267529)

---

## AWS Infrastructure Audit

### Route53 Hosted Zones

| Zone | Zone ID | Status | Action |
|------|---------|--------|--------|
| marcelrienks.com | Z0003562GQFFYQVGWRWO | ✅ Active | Use for subdomain record |
| marcelrienks.co.za | None | ❌ Not found | User mentioned but doesn't exist in Route53 |

**Note**: User specified `marcelrienks.co.za` but actual hosted zone is `marcelrienks.com`. Implementation assumes `alignment.marcelrienks.com` (not `.co.za`).

### ACM Certificates (us-east-1, required for CloudFront)

| Domain | ARN | Status | Notes |
|--------|-----|--------|-------|
| id.marcelrienks.com | arn:aws:acm:us-east-1:365620267529:certificate/cddd1e49-9935-48c4-9e6e-56922bce048d | ✅ Issued | Specific subdomain only |
| alignment.marcelrienks.com | ❌ Not found | Missing | **CRITICAL**: Need to create/import cert for deployment |

**Action**: Create ACM certificate for `alignment.marcelrienks.com` before deploying infrastructure.

### IAM Users

| User | ARN | Created | Status |
|------|-----|---------|--------|
| github-actions | arn:aws:iam::365620267529:user/github-actions | 2026-05-01 10:15:54 UTC | ✅ Active |

### IAM Policies

| Policy Name | User | Type | Status | Issue |
|------------|------|------|--------|-------|
| mx5-alignment-deployment | github-actions | Inline | ✅ Attached | ⚠️ Hardcoded S3 bucket name |

**Current Policy**:
```json
{
  "Sid": "S3DeploymentAccess",
  "Resource": [
    "arn:aws:s3:::alignment-marcelrienks.com-static",
    "arn:aws:s3:::alignment-marcelrienks.com-static/*"
  ]
}
```

**Problem**: Bucket ARN is hardcoded to `alignment-marcelrienks.com-static`, but Terraform will create `mx5-alignment-365620267529`.

**Solution**: Update policy to use dynamic bucket ARN after Terraform apply.

---

## Terraform Infrastructure Analysis

### File Inventory

```
infrastructure/
├── provider.tf              ✅ GOOD — AWS provider, default tags, us-east-1
├── variables.tf             ✅ GOOD — All required variables defined; supports custom domain
├── main.tf                  ✅ GOOD — S3 bucket, CloudFront, versioning, bucket policy
├── security.tf              ⚠️  NEEDS UPDATE — IAM policy hardcoded bucket name
├── monitoring.tf            ❌ UNNECESSARY — CloudWatch dashboards (disable or remove)
├── terraform.tfvars.example ✅ TEMPLATE — Good reference; actual file must be created
├── terraform.tfvars         ❌ MISSING — Required for terraform plan/apply
└── README.md                ✅ EXISTS — Documents infrastructure setup
```

### main.tf Analysis

#### What Exists (Good)
- ✅ S3 bucket with `local.s3_bucket_name` (auto-generated from project name + account ID)
- ✅ Bucket versioning (enabled by default for rollback)
- ✅ Bucket website configuration (index.html, error document)
- ✅ Public access block (configured; allows CloudFront via policy)
- ✅ CloudFront Origin Access Control (modern approach, not legacy OAI)
- ✅ CloudFront distribution with custom domain support
- ✅ Cache behavior (GET/HEAD/OPTIONS allowed; 1 hour TTL default)
- ✅ CloudFront invalidation trigger (on site file changes)
- ✅ S3 logging support (optional, disabled by default)
- ✅ Outputs for all critical resources (bucket name, distribution ID, URLs)

#### What's Missing (Critical)
- ❌ **Route53 DNS record** — No A (alias) record pointing to CloudFront
- ❌ **Data source for Route53 zone** — Must add to reference existing zone

### security.tf Analysis

#### Current Policy Content

```json
{
  "Sid": "S3DeploymentAccess",
  "Resource": [
    "arn:aws:s3:::alignment-marcelrienks.com-static",
    "arn:aws:s3:::alignment-marcelrienks.com-static/*"
  ]
}
```

#### Problem
1. Hardcoded bucket name doesn't match Terraform's auto-generated name
2. Policy will fail when GitHub Actions tries to deploy

#### Solution
Update policy to use `aws_s3_bucket.website.arn` reference:

```hcl
# Before (hardcoded):
Resource = [
  "arn:aws:s3:::alignment-marcelrienks.com-static",
  "arn:aws:s3:::alignment-marcelrienks.com-static/*"
]

# After (dynamic):
Resource = [
  aws_s3_bucket.website.arn,
  "${aws_s3_bucket.website.arn}/*"
]
```

### monitoring.tf Analysis

#### Content
- CloudWatch log groups (conditional, disabled)
- CloudWatch dashboard with CloudFront metrics
- SNS topic for alerts (optional)
- CloudWatch alarms (optional)

#### Assessment
- Optional feature (all gated by `enable_monitoring_alerts = false`)
- **Recommendation**: Disable in terraform.tfvars or remove file to avoid scope creep

---

## GitHub Actions Workflow Analysis

### File: `.github/workflows/deploy.yml`

#### Trigger
```yaml
on:
  push:
    branches: [main]
  workflow_dispatch:  # Manual trigger allowed
```
✅ Correct — deploys on push to main

#### Test Job
```yaml
- name: Run integration tests
  run: npm run test:all-sync
  timeout-minutes: 10
```
✅ Good — runs all tests with timeout; blocks deployment if fails

#### Deploy Job
```yaml
- name: Deploy to S3
  run: |
    aws s3 sync site/ s3://mx5-nc1-alignment/ \
      --delete \
      --cache-control "public, max-age=3600"
```

⚠️ **Problem**: Hardcoded bucket name `mx5-nc1-alignment`  
✅ **Solution**: Update to use `${S3_BUCKET_NAME}` environment variable or capture from Terraform

#### CloudFront Invalidation
```yaml
- name: Invalidate CloudFront cache
  env:
    DISTRIBUTION_ID: ${{ secrets.CLOUDFRONT_DISTRIBUTION_ID }}
  run: |
    aws cloudfront create-invalidation \
      --distribution-id "$DISTRIBUTION_ID" \
      --paths "/*"
```
⚠️ **Issue**: Secret `CLOUDFRONT_DISTRIBUTION_ID` not yet set in GitHub  
✅ **Solution**: Add secret after Terraform apply captures ID

---

## GitHub Secrets Status

### Required Secrets

| Secret | Current Status | Source | Action |
|--------|--------|--------|--------|
| `AWS_ACCESS_KEY_ID` | ✅ Set | github-actions IAM user access keys | Keep as-is |
| `AWS_SECRET_ACCESS_KEY` | ✅ Set | github-actions IAM user access keys | Keep as-is |
| `CLOUDFRONT_DISTRIBUTION_ID` | ❌ Not set | Will be from `terraform output` | Add after Terraform apply |

### How to Verify

```bash
# List GitHub secrets (local only, can't list from command line)
# Must check via GitHub UI or gh CLI with proper permissions

# To add CLOUDFRONT_DISTRIBUTION_ID after Terraform:
gh secret set CLOUDFRONT_DISTRIBUTION_ID --body "$(cd infrastructure && terraform output -raw cloudfront_distribution_id)"
```

---

## Deployment Pipeline Current State

```
Developer push to main
         ↓
GitHub Actions triggers (✅ Works)
         ↓
Checkout code (✅ Works)
         ↓
npm test:all-sync (✅ Works)
         ↓
If tests fail → stop (✅ Works)
If tests pass ↓
         ↓
aws s3 sync (⚠️ Uses hardcoded bucket name)
         ↓
CloudFront invalidation (⚠️ Requires CLOUDFRONT_DISTRIBUTION_ID secret)
         ↓
DNS resolution? (❌ FAILS — no Route53 record)
         ↓
User can't reach alignment.marcelrienks.com (❌ BLOCKED)
```

---

## What Must Be Done (Minimum Viable Deployment)

### 1. ACM Certificate (Pre-requisite)
- [ ] Create ACM certificate for `alignment.marcelrienks.com` in us-east-1
- [ ] Or: If certificate exists elsewhere, import to us-east-1
- [ ] Capture ARN for Terraform

### 2. Infrastructure Code (Required Changes)
- [ ] Update `infrastructure/security.tf` → Dynamic bucket ARN
- [ ] Update `infrastructure/main.tf` → Add Route53 A record
- [ ] Create `infrastructure/terraform.tfvars` → Add domain + cert ARN

### 3. Terraform Deploy (One-Time)
- [ ] `terraform init` in infrastructure/
- [ ] `terraform plan` and review
- [ ] `terraform apply` to create resources
- [ ] Capture outputs (Distribution ID, bucket name)

### 4. GitHub Setup (Required Changes)
- [ ] Add `CLOUDFRONT_DISTRIBUTION_ID` secret
- [ ] Update workflow S3 bucket name (hardcoded → environment variable)

### 5. Validation (Required Testing)
- [ ] DNS resolves: `dig alignment.marcelrienks.com`
- [ ] HTTPS works: `curl -I https://alignment.marcelrienks.com`
- [ ] Test push to main → automatic deployment
- [ ] Verify site updates live

---

## What Can Be Optimized (Optional)

| Item | Current | Optimal | Effort | Priority |
|------|---------|---------|--------|----------|
| Remote Terraform state | Local only | S3 + DynamoDB | 1 hour | Low |
| Monitoring dashboards | Disabled | Enabled | 30 min | Very Low |
| Multi-environment | Prod only | Prod + Staging | High | Low |
| Automated rollback | Manual | Via GitHub Actions | High | Very Low |
| SSL cert renewal automation | Manual | AWS-managed | Very Low | Very Low |

---

## Existing Resources to Leverage

✅ **GitHub Actions user** — `github-actions` exists  
✅ **Route53 hosted zone** — `marcelrienks.com` exists  
✅ **AWS credentials** — Already in GitHub secrets  
❌ **ACM certificate** — Must create for `alignment.marcelrienks.com`  
❌ **S3 bucket** — Will be created by Terraform  
❌ **CloudFront distribution** — Will be created by Terraform  
❌ **Route53 record** — Will be created by Terraform  

---

## Terraform Outputs (To Be Captured)

After `terraform apply`, capture these outputs:

```bash
S3_BUCKET_NAME=$(terraform output -raw s3_bucket_name)
CLOUDFRONT_DISTRIBUTION_ID=$(terraform output -raw cloudfront_distribution_id)
CLOUDFRONT_DOMAIN=$(terraform output -raw cloudfront_domain_name)
CUSTOM_DOMAIN_URL=$(terraform output -raw custom_domain_url)
ROUTE53_RECORD=$(terraform output -raw route53_record_name)

echo "S3 Bucket: $S3_BUCKET_NAME"
echo "CloudFront ID: $CLOUDFRONT_DISTRIBUTION_ID"
echo "CloudFront Domain: $CLOUDFRONT_DOMAIN"
echo "Custom Domain: $CUSTOM_DOMAIN_URL"
echo "Route53 Record: $ROUTE53_RECORD"

# Add to GitHub secrets
gh secret set CLOUDFRONT_DISTRIBUTION_ID --body "$CLOUDFRONT_DISTRIBUTION_ID"

# Update workflow S3 bucket reference (if hardcoded)
# OR use environment variable in workflow
```

---

## Decision Matrix

| Decision | Option A | Option B | Selected | Reason |
|----------|----------|----------|----------|--------|
| **Deploy via** | Terraform apply each time | S3 sync + Terraform for infra | B | Simpler CI/CD; Terraform once |
| **Monitor resources** | Enable CloudWatch | Disable | Disable | Out of scope; keep simple |
| **IAM strategy** | Leverage existing user | Recreate new user | Leverage | User already exists; just update |
| **Route53 zone** | Create new zone | Use existing marcelrienks.com | Existing | Zone already active |
| **ACM certificate** | Self-signed | AWS-managed | AWS-managed | Requires manual creation but automated after |
| **Versioning** | Enabled | Disabled | Enabled | Rollback capability via S3 |

---

## Success Metrics (After Implementation)

- [ ] `https://alignment.marcelrienks.com` loads in browser
- [ ] DNS resolves correctly: `dig alignment.marcelrienks.com +short`
- [ ] HTTPS certificate valid: `curl -I https://alignment.marcelrienks.com | grep SSL`
- [ ] Push to main triggers deployment automatically
- [ ] Tests run before deployment
- [ ] Deployment completes in under 5 minutes
- [ ] Updated site visible immediately after deployment
- [ ] CloudFront cache invalidation occurs
- [ ] GitHub Actions workflow shows ✅ for test and deploy jobs
- [ ] IAM user has minimal required permissions (least privilege)

---

## Timeline Estimate

| Phase | Task | Effort | Blocker |
|-------|------|--------|---------|
| 1. Setup | Create ACM certificate | 5 min | Blocks Phase 2 |
| 2. Code | Update Terraform files | 10 min | Requires Phase 1 |
| 3. Deploy | Run terraform apply | 2 min | Requires Phase 2 |
| 4. GitHub | Add secrets, test workflow | 5 min | Requires Phase 3 |
| 5. Validate | DNS + HTTPS + deployment test | 10 min | Requires Phase 4 |
| **Total** | | **32 minutes** | |

**Note**: Most time is AWS resource creation (not coding).

---

## Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|-----------|
| ACM cert doesn't exist for subdomain | 🔴 Critical | Request in AWS Console before deploy |
| Route53 zone delegation outdated | 🟡 Medium | Verify NS records point to Route53 |
| IAM policy still too restrictive | 🟡 Medium | Test deployment; add permissions if needed |
| GitHub secrets not set | 🟡 Medium | Add CLOUDFRONT_DISTRIBUTION_ID after Terraform |
| Hardcoded S3 bucket in workflow | 🟡 Medium | Update workflow or use env variable |
| CloudFront cache stale | 🟢 Low | Workflow already invalidates |
| S3 bucket name collision | 🟢 Low | Account ID ensures uniqueness |
