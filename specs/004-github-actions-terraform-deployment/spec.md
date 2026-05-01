# Feature Specification: GitHub Actions + Terraform Automated Deployment

**Date**: May 1, 2026  
**Status**: Draft for Analysis  
**Owner**: @marcelrienks

---

## Executive Summary

Automate deployment of the MX-5 alignment tool from GitHub `main` branch to AWS, with Terraform managing infrastructure (S3 bucket, CloudFront, Route53 DNS) and GitHub Actions orchestrating the build→test→deploy pipeline. End-to-end: code push → tests pass → website live at `alignment.marcelrienks.com` via CloudFront.

---

## User Scenarios & Success Criteria

| Scenario | Description | Success Criterion |
|----------|-------------|-------------------|
| **Developer Push** | Developer pushes code to `main` branch | Tests run automatically; deployment only if tests pass |
| **Automatic Deployment** | Tests pass | Site automatically deployed to S3, CloudFront invalidated, typically live within 2-5 minutes |
| **Custom Domain Resolution** | User navigates to `alignment.marcelrienks.com` | Page loads from CloudFront with HTTPS certificate |
| **Infrastructure Consistency** | Terraform apply is idempotent | Re-running `terraform apply` produces no changes (infrastructure-as-code principle) |
| **IAM Principle of Least Privilege** | GitHub Actions needs deployment permissions | User `github-actions` has exactly S3, CloudFront, and Route53 permissions needed (no overprivileging) |

---

## Functional Requirements

### 1. Infrastructure as Code (Terraform)

**FR1.1**: Define S3 bucket for static site  
- **Current**: ✅ Exists in `main.tf`  
- **Status**: Use as-is

**FR1.2**: Define CloudFront distribution for CDN  
- **Current**: ✅ Exists in `main.tf` with custom domain support  
- **Status**: Create new ACM certificate for `alignment.marcelrienks.com` with DNS validation

**FR1.3**: Define Route53 DNS records pointing to CloudFront  
- **Current**: ❌ Missing  
- **Action**: Add Route53 A (alias) record to wire `alignment.marcelrienks.com` → CloudFront distribution

**FR1.4**: Support custom domain with HTTPS  
- **Current**: ✅ CloudFront supports custom domain via variables  
- **Status**: Configure with ACM certificate for `alignment.marcelrienks.com`

**FR1.5**: IAM policy for GitHub Actions deployment  
- **Current**: ⚠️ Partially exists (policy defined in `security.tf`, hardcoded to old bucket name)  
- **Action**: Update policy to use dynamic bucket ARN; attach to `github-actions` user
- **Permissions Required**:
  - S3: `s3:GetObject`, `s3:PutObject`, `s3:DeleteObject`, `s3:ListBucket` (scoped to S3 bucket)
  - CloudFront: `cloudfront:CreateInvalidation`, `cloudfront:GetDistribution`, `cloudfront:ListDistributions` (all resources)
  - Route53 (read-only): `route53:GetHostedZone`, `route53:ListResourceRecordSets` (scoped to marcelrienks.com zone)

### 2. GitHub Actions Workflow

**FR2.1**: Trigger on push to `main` branch  
- **Current**: ✅ Exists in `.github/workflows/deploy.yml`  
- **Status**: Use as-is

**FR2.2**: Run integration tests before deployment  
- **Current**: ✅ Exists (`npm run test:all-sync`)  
- **Status**: Use as-is; only deploy if tests pass

**FR2.3**: Build static site (if needed)  
- **Current**: ❓ Unclear if build step needed (site/ already contains built files)  
- **Action**: Confirm site files are production-ready; add build step if necessary

**FR2.4**: Deploy to S3 via `aws s3 sync`  
- **Current**: ✅ Exists in workflow  
- **Status**: Use as-is (simpler than Terraform apply every deployment)

**FR2.5**: Invalidate CloudFront cache  
- **Current**: ✅ Exists in workflow with environment variable  
- **Status**: Use as-is; requires `CLOUDFRONT_DISTRIBUTION_ID` secret

### 3. Configuration Management

**FR3.1**: Terraform variables file (`terraform.tfvars`)  
- **Current**: ❌ Missing (only `.example` exists)  
- **Action**: Create with production values for domain, region, bucket name

**FR3.2**: GitHub Actions secrets  
- **Current**: ⚠️ Partially configured (AWS credentials exist; `CLOUDFRONT_DISTRIBUTION_ID` optional)  
- **Action**: Add `CLOUDFRONT_DISTRIBUTION_ID` secret after Terraform apply

---

## Key Entities & Dependencies

### AWS Resources
| Resource | Current | Needed | Owner |
|----------|---------|--------|-------|
| **S3 Bucket** | Not yet created | `mx5-alignment-<ACCOUNT_ID>` | Terraform |
| **CloudFront Distribution** | Not yet created | Distribution with alias `alignment.marcelrienks.com` | Terraform |
| **Route53 Zone** | `marcelrienks.com` exists | A (alias) record in zone | Terraform |
| **ACM Certificate** | `id.marcelrienks.com` exists | Create/import for `alignment.marcelrienks.com` | Terraform or Manual |
| **IAM User** | `github-actions` exists | Update policy permissions | Terraform or AWS CLI |

### GitHub Secrets
| Secret | Purpose | Current |
|--------|---------|---------|
| `AWS_ACCESS_KEY_ID` | GitHub Actions AWS auth | ✅ Set |
| `AWS_SECRET_ACCESS_KEY` | GitHub Actions AWS auth | ✅ Set |
| `CLOUDFRONT_DISTRIBUTION_ID` | Cache invalidation ID | ❓ Unknown |

---

## Architecture & Design

### Deployment Pipeline
```
Developer push to main
         ↓
GitHub Actions triggers
         ↓
Checkout code
         ↓
npm install
         ↓
npm run test:all-sync (tests)
         ↓
If tests fail → stop
If tests pass ↓
         ↓
aws s3 sync site/ → S3 bucket
         ↓
aws cloudfront create-invalidation → invalidate //*
         ↓
CloudFront cache refreshes
         ↓
User requests alignment.marcelrienks.com
         ↓
Route53 resolves to CloudFront
         ↓
CloudFront serves from S3
         ↓
✅ Site live
```

### Infrastructure Setup (One-Time)
```
Terraform init
         ↓
Create terraform.tfvars with:
  - custom_domain = "alignment.marcelrienks.com"
  - acm_certificate_arn = <arn>
  - aws_region = "us-east-1"
         ↓
terraform plan (review)
         ↓
terraform apply
         ↓
Resources created:
  - S3 bucket
  - CloudFront distribution
  - Route53 record
         ↓
Capture outputs:
  - CLOUDFRONT_DISTRIBUTION_ID
  - S3 bucket name
         ↓
Add CLOUDFRONT_DISTRIBUTION_ID to GitHub Actions secrets
         ↓
✅ Ready for automated deployments
```

---

## Assumptions & Constraints

| Assumption | Rationale |
|-----------|-----------|
| **No production Terraform runs yet** | Infrastructure will be created from scratch via `terraform apply` |
| **Site files in `/site` are production-ready** | Pre-built files committed to repo; no build step needed (npm run build not required) |
| **`marcelrienks.com` Route53 zone exists** | Creating subdomain record `alignment.marcelrienks.com` in existing zone |
| **ACM certificate for `alignment.marcelrienks.com` exists or needs to be created** | Required for HTTPS on custom domain; must be in `us-east-1` for CloudFront |
| **GitHub Actions user `github-actions` already exists** | Created by prior agent; will be reused and repermissioned |
| **S3 bucket naming convention**: `mx5-alignment-<ACCOUNT_ID>` | Ensures global uniqueness; auto-generated in Terraform locals |
| **CloudFront distribution is single entry point** | No other CDNs or origins used |
| **`main` branch is production** | All tests must pass before any deployment |

---

## Out of Scope

- Multi-environment deployment (staging, production) — only `main` → production
- Blue/green deployments or canary releases
- Rollback automation (manual via S3 versioning or Terraform state)
- Load testing or performance benchmarking
- Custom domain registration (assume domain exists and is managed externally)
- SSL certificate renewal automation (assume AWS manages it)

---

## Success Criteria (Measurable)

1. ✅ **Tests Run First**: `npm test:all-sync` runs before any S3 deployment
2. ✅ **Automatic on Green**: If tests pass, deployment happens automatically without manual trigger
3. ✅ **HTTPS Working**: `https://alignment.marcelrienks.com` loads the site with valid SSL certificate
4. ✅ **DNS Resolves**: `alignment.marcelrienks.com` resolves via Route53 to CloudFront domain
5. ✅ **Cache Invalidation Works**: After deployment, user typically sees updated site within 2 minutes (not stale cache)
6. ✅ **Least Privilege**: `github-actions` IAM user has only S3 + CloudFront + Route53 read permissions (no admin, no EC2, etc.)
7. ✅ **Infrastructure Idempotent**: Running `terraform apply` twice produces no changes on second run
8. ✅ **Zero Downtime**: Existing users see no interruption during deployment (S3 versioning + CloudFront cache)

---

## Implementation Constraints

| Constraint | Reason | Impact |
|-----------|--------|--------|
| **No excess infrastructure** | User request for simplicity | No monitoring.tf, no logging.tf, no extra resources |
| **Leverage existing IAM user** | Already created; avoid duplication | Update policy; don't recreate |
| **Use existing Route53 zone** | `marcelrienks.com` already managed | Add A record; don't create new zone |
| **AWS CLI pre-authenticated** | GitHub Actions will provide credentials | No manual AWS login needed in workflow |
| **S3 sync for deployment** | Simpler than Terraform apply per deployment | Terraform stays for infrastructure only |

---

## Existing Resources to Analyze

### Infrastructure Files (Terraform)
- ✅ `infrastructure/provider.tf` — AWS provider config (keep as-is)
- ✅ `infrastructure/main.tf` — S3 + CloudFront (keep as-is, add Route53)
- ✅ `infrastructure/variables.tf` — Variable definitions (add Route53 variables if needed)
- ⚠️ `infrastructure/security.tf` — IAM policy (update to use dynamic bucket ARN)
- ⚠️ `infrastructure/monitoring.tf` — CloudWatch dashboards (disabled by default; verify disabled or remove)
- ❓ `infrastructure/terraform.tfvars.example` — Example config (use as template; create actual tfvars)

### GitHub Actions
- ✅ `.github/workflows/deploy.yml` — Deployment workflow (update for CLOUDFRONT_DISTRIBUTION_ID if missing)

### Project Structure
- ✅ `site/` — Static files (no build needed)
- ✅ `js/`, `css/` — Source files (watch for changes via git)
- ✅ `tests/` — Integration tests (run before deploy)

---

## Next Steps

### Phase 1: Validation (Current)
- [ ] Confirm site files are production-ready (no build step needed)
- [ ] Check ACM certificate for `alignment.marcelrienks.com` (exists or create)
- [ ] Verify Route53 zone `marcelrienks.com` is delegated correctly

### Phase 2: Infrastructure Configuration
- [ ] Update `security.tf` IAM policy to use dynamic bucket ARN
- [ ] Add Route53 resources to `main.tf` or create new `route53.tf`
- [ ] Remove or disable `monitoring.tf` if not needed
- [ ] Create `terraform.tfvars` with production values

### Phase 3: Deployment
- [ ] Run `terraform init` in `infrastructure/` directory
- [ ] Run `terraform plan` and review
- [ ] Run `terraform apply` to create resources
- [ ] Capture outputs (`CLOUDFRONT_DISTRIBUTION_ID`, S3 bucket name)
- [ ] Add `CLOUDFRONT_DISTRIBUTION_ID` to GitHub Actions secrets
- [ ] Update IAM user policy with actual S3 bucket ARN

### Phase 4: Validation & Testing
- [ ] Test push to `main` branch
- [ ] Verify tests run automatically
- [ ] Verify deployment happens if tests pass
- [ ] Verify `https://alignment.marcelrienks.com` is live
- [ ] Verify DNS resolution (nslookup, dig)
- [ ] Verify CloudFront invalidation (check cache headers)
- [ ] Test rollback scenario (previous S3 version via versioning)

---

## Risks & Mitigation

| Risk | Likelihood | Mitigation |
|------|------------|-----------|
| **ACM certificate doesn't exist for subdomain** | Medium | Create manually in AWS Console or via Terraform; no blocker |
| **Route53 Zone delegation outdated** | Low | AWS manages; check NS records point to Route53 |
| **IAM policy too restrictive** | Medium | Test deployment with updated policy; add permissions if needed |
| **CloudFront cache stale after deploy** | Low | Workflow already has invalidation step |
| **S3 bucket name collision** | Very Low | Using account ID in bucket name; guaranteed unique |
| **GitHub Actions secrets not set** | High | Document required secrets; CI job will fail clearly |

---

## Document Hashes (for change detection)

Will be populated after implementation.
