# Tasks: GitHub Actions + Terraform Automated Deployment

**Feature**: 004-github-actions-terraform-deployment  
**Input**: Design documents from `specs/004-github-actions-terraform-deployment/`  
**Prerequisites**: plan.md, spec.md (required); research.md, data-model.md, quickstart.md (completed)  
**Status**: Ready for Implementation  
**Last Updated**: May 1, 2026

---

## Task Format: `[ID] [P?] Description with file path`

- **[ID]**: Task identifier (T001, T002, T003...) in execution order
- **[P]**: Parallelizable flag (tasks with different files, no inter-dependencies)
- **File paths**: Exact locations for all file modifications/creations

## Dependencies Overview

```
Phase 0: Pre-Implementation Security Gate (T000) ⚠️ CRITICAL
    ↓ (must PASS all checks before proceeding)
Phase 1: Setup (T001-T003)
    ↓
Phase 2: Terraform Configuration (T004-T015)
    ├→ T004-T009: Terraform config files (can run in parallel)
    ├→ T010-T012: ACM certificate resources
    ├→ T013-T014: Route53 DNS resources
    └→ T007b, T015: MANDATORY deletions & dynamic ARN verification
    ↓
Phase 3: Terraform Validation & Application (T016-T020)
    ├→ T016-T017: Plan and review (sequential)
    └→ T018-T020: Apply infrastructure (sequential)
    ↓
Phase 4: GitHub Actions Configuration (T021-T024)
    ├→ T021-T022: Secret setup (manual + verification)
    └→ T023-T024: Workflow validation
    ↓
Phase 5: Deployment Validation & Testing (T025-T035)
    ├→ T025-T029: Infrastructure verification
    ├→ T030-T032: DNS and HTTPS validation
    └→ T033-T035: End-to-end deployment test
```

---

## Phase 0: Pre-Implementation Security Gate

**Purpose**: Verify all security mitigations are in place before provisioning infrastructure

**⏱️ Duration**: ~5 minutes

**GATE**: All checks must PASS before proceeding to Phase 1. Do NOT proceed if any check fails.

- [ ] T000 [CRITICAL GATE] Verify Principle III security mitigations exist in codebase:
  - [ ] **Check 1**: Confirm `infrastructure/security.tf` contains IAM policy scoped to S3 + CloudFront (NOT admin/overprivileged)
    - Run: `grep -A 20 'github_actions_policy' infrastructure/security.tf | head -30`
    - Verify: Contains `s3:GetObject`, `s3:PutObject`, `s3:DeleteObject`, `s3:ListBucket` (S3-only)
    - Verify: Contains `cloudfront:CreateInvalidation`, `cloudfront:GetDistribution`, `cloudfront:ListDistributions` (CloudFront-only)
    - **FAIL**: If policy allows `*` actions or `*` resources
  - [ ] **Check 2**: Confirm `infrastructure/main.tf` contains CloudFront Origin Access Control (OAC)
    - Run: `grep -c 'aws_cloudfront_origin_access_control' infrastructure/main.tf`
    - Verify: Returns `1` (resource exists)
    - Verify: S3 bucket policy does NOT have `"Principal": "*"` allowing public S3 access
    - **FAIL**: If OAC missing or bucket allows public read
  - [ ] **Check 3**: Confirm `.github/workflows/deploy.yml` does NOT log AWS secrets
    - Run: `grep -i 'echo.*AWS\|echo.*secret\|echo.*key' .github/workflows/deploy.yml`
    - Verify: Returns no matches (secrets not logged)
    - **FAIL**: If workflow echoes credentials or secrets
  - **Expected outcome**: All three checks PASS; security mitigations verified in code
  - **If ANY check fails**: STOP. Do not proceed. Review and fix security issue before continuing.

---

## Phase 1: Setup & Prerequisites

**Purpose**: Initialize project structure and validate prerequisites

**⏱️ Duration**: ~10 minutes

**Blocking**: Phase 0 (T000) must complete with all checks PASSING before Phase 1 begins

- [ ] T001 Verify AWS CLI is installed and configured with correct credentials (`aws sts get-caller-identity`)
  - Action: Confirm AWS account ID is `365620267529` (mx5-alignment project account)
  - **FAIL**: If account ID differs; abort and reconfigure credentials
- [ ] T002 Verify Terraform is installed (version 1.0+) with `terraform version`
- [ ] T003 Create `.gitignore` entries for Terraform state files in `infrastructure/.gitignore` (`terraform.tfstate*`, `*.tfvars` except `.example`)

---

## Phase 2: Terraform Configuration & Resource Definition

**Purpose**: Define AWS infrastructure resources (S3, CloudFront, ACM, Route53) as code

**⏳ Status**: Phase 1 Design Complete (infrastructure/main.tf exists; needs updates)

**Blocking Prerequisites**: None

**What**: Create/update Terraform configuration files for production infrastructure

### 2.1 Review & Prepare Existing Infrastructure Files

- [ ] T004 [P] Review existing `infrastructure/provider.tf` and confirm AWS provider configuration (region=us-east-1)
- [ ] T005 [P] Review existing `infrastructure/variables.tf` and confirm all variables defined (aws_region, environment, project_name, custom_domain, etc.)
- [ ] T006 [P] Review existing `infrastructure/main.tf` S3 bucket configuration and CloudFront distribution setup
- [ ] T007 [P] Review existing `infrastructure/security.tf` IAM policy for github-actions user and S3/CloudFront permissions
- [ ] T007b [P] MANDATORY: Delete `infrastructure/monitoring.tf` (monitoring is out-of-scope):
  - **Decision**: Monitoring dashboards and CloudWatch alarms are explicitly out-of-scope for this feature
  - [ ] Check if file exists: `ls -la infrastructure/monitoring.tf`
  - [ ] If file exists: DELETE it immediately
    - Run: `rm infrastructure/monitoring.tf`
    - Verify: `ls infrastructure/monitoring.tf` returns "file not found"
  - [ ] Confirm `enable_monitoring_alerts = false` in `terraform.tfvars` (prevents any monitoring resources)
  - **Expected outcome**: `infrastructure/monitoring.tf` is deleted; NO CloudWatch resources will be provisioned

### 2.2 Create Terraform Configuration Values File

- [ ] T008 Create `infrastructure/terraform.tfvars` with production configuration values:
  ```
  aws_region = "us-east-1"
  environment = "prod"
  project_name = "mx5-alignment"
  custom_domain = "alignment.marcelrienks.com"
  cache_ttl_seconds = 3600
  enable_versioning = true
  enable_monitoring_alerts = false
  route53_zone_id = "Z0003562GQFFYQVGWRWO"
  ```
  (Note: `acm_certificate_arn` will be populated after ACM certificate creation)

### 2.3 Add Route53 DNS Variable

- [ ] T009 [P] Add `route53_zone_id` variable to `infrastructure/variables.tf` if not present:
  ```hcl
  variable "route53_zone_id" {
    description = "Route53 hosted zone ID for custom domain DNS records"
    type        = string
    default     = "Z0003562GQFFYQVGWRWO"  # marcelrienks.com
  }
  ```

### 2.4 Add ACM Certificate Resource

- [ ] T010 Add ACM certificate resource to `infrastructure/main.tf`:
  ```hcl
  resource "aws_acm_certificate" "alignment" {
    domain_name       = var.custom_domain
    validation_method = "DNS"
    tags = {
      Name = "${var.project_name}-alignment-cert"
    }
    lifecycle {
      create_before_destroy = true
    }
  }
  ```

- [ ] T011 Add ACM certificate validation resource to `infrastructure/main.tf`:
  ```hcl
  resource "aws_acm_certificate_validation" "alignment" {
    certificate_arn           = aws_acm_certificate.alignment.arn
    timeouts {
      create = "5m"
    }
  }
  ```

- [ ] T012 [P] Update CloudFront distribution in `infrastructure/main.tf` to reference the new ACM certificate:
  - Set `viewer_certificate.acm_certificate_arn = aws_acm_certificate.alignment.arn`
  - Set `viewer_certificate.cloudfront_default_certificate = false`
  - Ensure `viewer_certificate.ssl_support_method = "sni-only"`

### 2.5 Add Route53 DNS Record Resource

- [ ] T013 Add Route53 A record (alias) resource to `infrastructure/main.tf`:
  ```hcl
  resource "aws_route53_record" "alignment" {
    zone_id = var.route53_zone_id
    name    = var.custom_domain
    type    = "A"
    
    alias {
      name                   = aws_cloudfront_distribution.website.domain_name
      zone_id                = aws_cloudfront_distribution.website.hosted_zone_id
      evaluate_target_health = false
    }
  }
  ```

### 2.6 Add Terraform Outputs

- [ ] T014 [P] Add output definitions to `infrastructure/main.tf` (or new `infrastructure/outputs.tf`):
  ```hcl
  output "s3_bucket_name" {
    value       = aws_s3_bucket.website.id
    description = "S3 bucket name for static site"
  }
  
  output "cloudfront_distribution_id" {
    value       = aws_cloudfront_distribution.website.id
    description = "CloudFront distribution ID for cache invalidation"
  }
  
  output "cloudfront_domain_name" {
    value       = aws_cloudfront_distribution.website.domain_name
    description = "CloudFront distribution domain"
  }
  
  output "custom_domain" {
    value       = var.custom_domain
    description = "Custom domain name"
  }
  ```

- [ ] T015 [P] MANDATORY: Verify IAM policy in `infrastructure/security.tf` uses DYNAMIC bucket ARN:
  - **Requirement**: Policy MUST use dynamic bucket ARN reference, NOT hardcoded bucket name
  - [ ] Check current S3 resource ARN in policy:
    - Run: `grep -A 5 'S3DeploymentAccess' infrastructure/security.tf | grep Resource`
    - **MUST contain**: `arn:aws:s3:::${aws_s3_bucket.website.id}*` (dynamic reference)
    - **MUST NOT contain**: Hardcoded bucket name like `arn:aws:s3:::alignment-marcelrienks.com-static` or `arn:aws:s3:::mx5-alignment-365620267529*`
  - [ ] If hardcoded: Update `infrastructure/security.tf` to replace hardcoded ARN with:
    ```json
    "Resource": [
      aws_s3_bucket.website.arn,
      "${aws_s3_bucket.website.arn}/*"
    ]
    ```
  - [ ] Verify CloudFront permissions included:
    - `cloudfront:CreateInvalidation`, `cloudfront:GetDistribution`, `cloudfront:ListDistributions`
  - **Expected outcome**: Policy uses dynamic bucket ARN; hardcoded bucket names completely removed

---

## Phase 3: Terraform Validation & Infrastructure Provisioning

**Purpose**: Validate Terraform configuration and provision AWS resources

**⏳ Duration**: ~20-30 minutes (includes CloudFront activation time)

**Blocking**: Must complete before Phase 4 (need CloudFront distribution ID)

**What**: Initialize Terraform, validate configuration, and apply infrastructure

### 3.1 Terraform Initialization & Validation

- [ ] T016 Run `terraform init` in `infrastructure/` directory to initialize Terraform state
  - Expected: `.terraform/` directory created, backend initialized

- [ ] T017 Run `terraform plan` in `infrastructure/` directory and review planned resources
  - Expected: Plan shows ~5-6 resources to create (S3 bucket, CloudFront distribution, ACM certificate, ACM validation, Route53 record, etc.)
  - Action: Review output and confirm all resources are correct before proceeding

### 3.2 Apply Terraform Configuration

- [ ] T018 Run `terraform apply` in `infrastructure/` directory to provision AWS resources
  - Action: Confirm prompt by typing `yes`
  - Expected: All resources created; Terraform outputs displayed
  - ⏱️ CloudFront distribution takes 5-10 minutes to fully activate (normal)

- [ ] T019 Capture Terraform outputs for later use:
  ```bash
  cd infrastructure
  terraform output -json > outputs.json  # Store for reference
  terraform output cloudfront_distribution_id  # Copy this value
  terraform output s3_bucket_name  # Verify bucket name
  terraform output custom_domain  # Verify domain
  ```

- [ ] T020 [P] Verify Terraform state file created:
  - Check `infrastructure/terraform.tfstate` exists
  - Check `infrastructure/terraform.tfstate.backup` exists (auto-created)
  - **Important**: Do NOT commit tfstate files to git (should be in .gitignore from T003)

---

## Phase 4: GitHub Actions Configuration & Secrets

**Purpose**: Configure GitHub Actions with AWS credentials and CloudFront distribution ID

**⏳ Duration**: ~10 minutes

**Blocking**: Must complete before Phase 5 (workflow needs secrets)

**What**: Add GitHub Actions secrets for automated deployment

### 4.1 GitHub Actions AWS Credentials

- [ ] T021 Verify existing GitHub Actions secrets are configured:
  - Go to GitHub repository → Settings → Secrets and variables → Actions
  - Verify `AWS_ACCESS_KEY_ID` exists (created for github-actions IAM user)
  - Verify `AWS_SECRET_ACCESS_KEY` exists (created for github-actions IAM user)
  - If missing: Create github-actions IAM user in AWS console and generate access keys, then add as GitHub secrets

### 4.2 Add CloudFront Distribution ID Secret

- [ ] T022 Add `CLOUDFRONT_DISTRIBUTION_ID` secret to GitHub Actions:
  - Go to GitHub repository → Settings → Secrets and variables → Actions
  - Click "New repository secret"
  - **Name**: `CLOUDFRONT_DISTRIBUTION_ID`
  - **Value**: (paste from T019 terraform output, e.g., `E1234ABCDEFG`)
  - Click "Add secret"

### 4.3 Verify GitHub Actions Workflow

- [ ] T023 Review existing `.github/workflows/deploy.yml` workflow file:
  - Confirm `on: push: branches: [main]` trigger is set
  - Confirm `npm run test:all-sync` runs before deployment (test gate)
  - Confirm `aws s3 sync site/ ...` deploys to S3 bucket from T019
  - Confirm `aws cloudfront create-invalidation ...` uses `${{ secrets.CLOUDFRONT_DISTRIBUTION_ID }}`
  - No modifications needed if workflow is current; file is production-ready

- [ ] T024 [P] Verify workflow can access GitHub secrets:
  - Go to GitHub Actions tab
  - Check that "Deploy to AWS S3 + CloudFront" workflow exists and is enabled
  - Confirm workflow is triggered on push to `main` branch

---

## Phase 5: Deployment Validation & End-to-End Testing

**Purpose**: Verify infrastructure, DNS, HTTPS, and automated deployment pipeline

**⏳ Duration**: ~15-20 minutes

**Blocking**: None (final validation phase)

**What**: Test infrastructure, verify DNS/HTTPS, test automated deployment

### 5.1 Infrastructure Verification

- [ ] T025 Verify S3 bucket exists and is configured correctly:
  ```bash
  aws s3 ls | grep mx5-alignment
  # Expected: mx5-alignment-365620267529 (or similar)
  
  aws s3api get-bucket-versioning --bucket mx5-alignment-365620267529
  # Expected: VersioningConfiguration Status = Enabled
  
  aws s3api get-bucket-encryption --bucket mx5-alignment-365620267529
  # Expected: ServerSideEncryptionConfiguration with AES256
  ```

- [ ] T026 [P] Verify CloudFront distribution exists and is deployed:
  ```bash
  aws cloudfront get-distribution --id <CLOUDFRONT_DISTRIBUTION_ID>
  # Expected: Distribution Status = Deployed, Enabled = true
  ```

- [ ] T027 [P] Verify S3 bucket files are empty (ready for deployment):
  ```bash
  aws s3 ls s3://mx5-alignment-365620267529/ --recursive
  # Expected: Empty (no output) or only default objects
  ```

- [ ] T028 [P] Verify ACM certificate is active:
  ```bash
  aws acm describe-certificate --certificate-arn <ACM_CERT_ARN> --region us-east-1
  # Expected: CertificateStatus = ISSUED, DomainValidationOptions Status = SUCCESS
  ```

- [ ] T029 [P] Verify IAM policy attached to github-actions user:
  ```bash
  aws iam get-user-policy --user-name github-actions --policy-name <POLICY_NAME>
  # Expected: Policy document shows S3 + CloudFront permissions
  ```

### 5.2 DNS & HTTPS Validation

- [ ] T030 Verify DNS resolution:
  ```bash
  nslookup alignment.marcelrienks.com
  # Expected: resolves to CloudFront domain (d*.cloudfront.net)
  
  dig alignment.marcelrienks.com +short
  # Expected: CNAME or A record pointing to CloudFront
  ```

- [ ] T031 [P] Verify HTTPS certificate is valid:
  ```bash
  # Manual: Open https://alignment.marcelrienks.com in browser
  # Check certificate details (should show alignment.marcelrienks.com, valid, issued by AWS)
  # Or via CLI:
  openssl s_client -connect alignment.marcelrienks.com:443 -servername alignment.marcelrienks.com < /dev/null 2>/dev/null | openssl x509 -noout -text
  # Expected: Subject CN = alignment.marcelrienks.com, Issuer = Amazon RSA
  ```

- [ ] T032 [P] Verify CloudFront responds with correct headers:
  ```bash
  curl -I https://alignment.marcelrienks.com
  # Expected: HTTP 200 OK, Cache-Control header, Server: CloudFront
  ```

### 5.3 End-to-End Deployment Test

- [ ] T033 Perform manual deployment test (first sync):
  ```bash
  # Sync site files to S3
  aws s3 sync site/ s3://mx5-alignment-365620267529/ --delete --cache-control "public, max-age=3600"
  # Expected: Files uploaded (index.html, input.html, report.html, css/, data/, etc.)
  
  # Verify files in S3
  aws s3 ls s3://mx5-alignment-365620267529/ --recursive
  # Expected: List of site files
  ```

- [ ] T034 Verify site loads via CloudFront:
  ```bash
  # Manual: Open https://d*.cloudfront.net in browser (CloudFront domain from T019)
  # Expected: Site loads, shows alignment tool interface
  # Then: Open https://alignment.marcelrienks.com in browser
  # Expected: Same site via custom domain
  ```

- [ ] T035 [P] Verify CloudFront cache invalidation works:
  - Manual: Make small change to `site/index.html` (e.g., add comment)
  - Run: `aws cloudfront create-invalidation --distribution-id <ID> --paths "/*"`
  - Expected: Invalidation completes within 2 minutes
  - Or: Test via GitHub Actions workflow (T036)

### 5.4 GitHub Actions Automated Deployment Test

- [ ] T036 Test automated deployment via GitHub Actions:
  - Push code to `main` branch with small change (e.g., `echo "# Deployment test $(date)" >> README.md`)
  - Go to GitHub Actions tab
  - Watch "Deploy to AWS S3 + CloudFront" workflow run
  - Expected: Tests pass → Deployment succeeds → S3 files updated → CloudFront invalidated
  - Verify workflow steps:
    1. ✅ Checkout code
    2. ✅ Setup Node.js
    3. ✅ Install dependencies (`npm install`)
    4. ✅ Run integration tests (`npm run test:all-sync`)
    5. ✅ Deploy to S3 (`aws s3 sync`)
    6. ✅ Invalidate CloudFront cache
    7. ✅ Deployment complete

- [ ] T037 [P] Verify post-deployment site is live and updated:
  - Open https://alignment.marcelrienks.com in browser
  - Verify site loads and is accessible (may need to refresh or clear cache)
  - Verify any changes from push are reflected
  - Check browser console for no errors

---

## Phase 6: Documentation & Handoff

**Purpose**: Document deployment procedures and validate completeness

**⏳ Duration**: ~10 minutes

**Blocking**: None (final documentation phase)

**What**: Update documentation and create deployment checklists

- [ ] T038 Update `.github/copilot-instructions.md` to reference the new plan path:
  - Change: `specs/004-github-actions-terraform-deployment/plan.md` reference
  - Add context: Terraform infrastructure, GitHub Actions workflow, deployment procedures

- [ ] T039 [P] Create deployment verification checklist at `specs/004-github-actions-terraform-deployment/checklists/deployment-checklist.md`:
  - Pre-deployment: AWS credentials, Terraform, site files ready
  - Infrastructure: S3 bucket, CloudFront, ACM, Route53 active
  - Secrets: AWS credentials + CLOUDFRONT_DISTRIBUTION_ID in GitHub
  - Post-deployment: DNS resolves, HTTPS valid, site loads, cache invalidation works
  - First automated run: Tests pass, deployment succeeds

- [ ] T040 [P] Create Terraform maintenance guide at `specs/004-github-actions-terraform-deployment/checklists/terraform-maintenance.md`:
  - Terraform state file safety (never commit, backup locally)
  - Scaling infrastructure (increase CloudFront TTL, add custom error pages, etc.)
  - Infrastructure updates: terraform plan → terraform apply workflow
  - Rollback procedures: S3 versioning, Terraform state recovery

- [ ] T041 [P] Create GitHub Actions troubleshooting guide at `specs/004-github-actions-terraform-deployment/checklists/github-actions-troubleshooting.md`:
  - Secrets configuration verification
  - AWS credentials rotation
  - CloudFront invalidation failures
  - Test failures before deployment
  - Manual re-runs of workflow

- [ ] T042 Verify all infrastructure as code is version-controlled:
  - Confirm `infrastructure/` files committed to git (except .tfvars, .tfstate)
  - Confirm `.github/workflows/deploy.yml` committed to git
  - Confirm `.gitignore` excludes Terraform state and sensitive files

---

## Implementation Summary

### Task Count by Phase

| Phase | Tasks | Purpose |
|-------|-------|---------|
| **Phase 0: Pre-Implementation Security** | T000 | Verify security mitigations (CRITICAL GATE) |
| **Phase 1: Setup** | T001-T003 | Prerequisites and project setup |
| **Phase 2: Terraform Configuration** | T004-T015 | Infrastructure as code definition |
| **Phase 3: Terraform Provisioning** | T016-T020 | AWS resource creation |
| **Phase 4: GitHub Actions Config** | T021-T024 | Secrets and workflow setup |
| **Phase 5: Validation & Testing** | T025-T037 | Infrastructure and deployment verification |
| **Phase 6: Documentation** | T038-T042 | Documentation and checklists |
| **TOTAL** | **44 Tasks** | Full implementation (includes T000 security gate) |

### Critical Path (Minimum Sequential Tasks)

For fastest deployment, execute in this minimum order:
1. **T000** (Security gate - REQUIRED before anything else)
2. T001-T003 (Setup)
3. T007b (Delete monitoring.tf)
4. T008 (Create terraform.tfvars)
5. T010-T014 (Add Terraform resources)
6. T015 (Verify IAM dynamic ARN)
7. T016-T020 (Terraform init, plan, apply)
8. T022 (Add GitHub secret)
9. T025-T032 (Infrastructure verification)
10. T036 (Automated deployment test)

**GATE**: T000 must PASS; if any check fails, STOP before proceeding to T001

**Estimated time for critical path**: ~50-65 minutes (including CloudFront activation wait + T000 security gate)

### Parallelizable Tasks

These can run in parallel (different files, no inter-dependencies):
- T004-T007: Review infrastructure files
- T009, T012: Add Terraform variables/resources
- T026-T029: Infrastructure verification checks
- T030-T032: DNS and HTTPS validation
- T039-T041: Documentation creation

---

## Success Criteria (Verification)

Upon completion, you should have:

✅ **Pre-Implementation Gate**: All security mitigations verified in code (T000)  
✅ **Infrastructure**: S3 bucket, CloudFront distribution, ACM certificate, Route53 DNS record created in AWS  
✅ **Security**: github-actions IAM user has S3 + CloudFront permissions (least privilege) with DYNAMIC bucket ARN  
✅ **DNS**: `alignment.marcelrienks.com` resolves to CloudFront domain via Route53  
✅ **HTTPS**: Valid SSL certificate for `alignment.marcelrienks.com`  
✅ **Deployment**: Site files sync to S3 and are served via CloudFront  
✅ **CI/CD**: GitHub Actions workflow runs tests before deployment, deploys on success  
✅ **Cache**: CloudFront cache invalidation works (2-minute refresh)  
✅ **Automation**: Pushing to `main` branch automatically deploys (test-gated)  
✅ **Documentation**: Deployment, troubleshooting, and maintenance guides created  

---

## Notes & Constraints

- **Security Gate (T000)**: MANDATORY first step; all checks must PASS before proceeding
- **Monitoring.tf**: Must be deleted (not disabled); out-of-scope for this feature
- **IAM Dynamic ARN**: Policy MUST use dynamic bucket reference; no hardcoded names allowed
- **One-time setup**: Phases 1-4 are one-time; Phase 5-6 are reference/validation
- **Terraform state**: Local state file (`terraform.tfstate`) should be backed up; remote backend recommended for production
- **CloudFront activation**: Distribution takes 5-10 minutes to fully activate; don't panic if initial requests are slow
- **DNS propagation**: Custom domain resolution may take a few minutes after Route53 record creation
- **IAM permissions**: github-actions user must be created separately in AWS (not handled by Terraform in this spec)
- **Site files**: Pre-built files in `site/` directory; no build step required

---

## Rollback Procedures

If something goes wrong:

1. **Rollback deployment**: Use `git revert` + push to `main` → workflow runs again with previous version
2. **Rollback infrastructure**: Keep Terraform state file safe; run `terraform destroy` to tear down, then `terraform apply` to recreate
3. **Recover deleted files**: S3 versioning enabled; restore from previous version via `aws s3api get-object --version-id <ID>`
4. **DNS issues**: Route53 record can be deleted/recreated without CloudFront impact; clear browser cache if needed

