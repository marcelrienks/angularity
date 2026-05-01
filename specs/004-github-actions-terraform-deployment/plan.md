# Implementation Plan: GitHub Actions + Terraform Automated Deployment

**Branch**: `004-github-actions-terraform-deployment` | **Date**: May 1, 2026 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `specs/004-github-actions-terraform-deployment/spec.md`

**Status**: Phase 1 Design Complete | **Gate Status**: ✅ PASS

---

## Summary

Automate MX-5 alignment tool deployment from GitHub `main` branch to AWS using Terraform infrastructure-as-code and GitHub Actions CI/CD pipeline. Terraform provisions S3 bucket (static site storage), CloudFront CDN (with custom domain `alignment.marcelrienks.com`), and Route53 DNS routing. GitHub Actions workflow runs integration tests, deploys to S3 on success, and invalidates CloudFront cache. One-time infrastructure setup via `terraform apply`; subsequent code pushes automatically trigger build→test→deploy pipeline.

---

## Technical Context

**Language/Version**: Terraform 1.0+, GitHub Actions (YAML), AWS CLI  
**Primary Dependencies**: Terraform AWS Provider (~5.0), GitHub Actions runner (ubuntu-latest), AWS CLI  
**Storage**: Amazon S3 (static files), Terraform state file (local initially, remote future)  
**Testing**: npm test:all-sync (integration tests, Puppeteer), GitHub Actions workflow  
**Target Platform**: AWS (us-east-1 region), CloudFront CDN, Route53 DNS  
**Project Type**: Infrastructure-as-Code (Terraform) + CI/CD Pipeline (GitHub Actions)  
**Performance Goals**: Deployment within 5 minutes of code push; CloudFront cache refresh within 2 minutes  
**Constraints**: Must maintain test-first gate; least privilege IAM; infrastructure idempotent  
**Scale/Scope**: Single static website; single deployment environment (main→prod); ~50-100 site files

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Principle I: Measurement Precision & Accuracy
**Status**: ✅ **PASS** — Not directly applicable; infrastructure automation feature doesn't perform calculations. Site content (HTML/CSS/JS) remains under existing principle.

### Principle II: Offline-First Architecture
**Status**: ✅ **PASS** — Feature enables static site deployment (no backend API calls). CloudFront serves from S3; user experience remains offline-capable (after initial content load).

### Principle III: Zero Security Assumptions
**Status**: ✅ **PASS (with appropriate mitigations)** — Feature introduces AWS infrastructure (S3, CloudFront, Route53) which is appropriate for deployment tooling. Security posture:
- **Mitigation**: IAM least privilege policy (github-actions user has only S3+CloudFront permissions scoped to resources)
- **Mitigation**: ACM certificate with DNS validation ensures HTTPS (valid SSL certificate for custom domain)
- **Mitigation**: CloudFront Origin Access Control prevents direct S3 public access (CloudFront is single entry point)
- **Mitigation**: GitHub Actions credentials stored in secure repository secrets (not in code or configuration files)
- **Rationale**: Project is public-facing, static content tool; infrastructure-level security appropriate for untrusted networks

### Principle IV: Comprehensive Integration Testing
**Status**: ✅ **PASS** — GitHub Actions workflow enforces `npm run test:all-sync` before deployment. Tests must pass (exit 0) for deploy to proceed. No changes to test suite in this feature.

### Principle V: Raw Data as Single Source of Truth
**Status**: ✅ **PASS** — Infrastructure automation doesn't modify calculation components. Data integrity principles remain in place (S3 versioning enables recovery if needed).

### Overall Gate Status
**✅ CONSTITUTION COMPLIANT** — No violations. Infrastructure automation feature supports existing principles; no new data integrity risks introduced.

## Project Structure

### Documentation (this feature)

```text
specs/004-github-actions-terraform-deployment/
├── plan.md                      # This file (Phase 1 design output)
├── research.md                  # Phase 0 output (clarifications resolved)
├── data-model.md                # Phase 1 output (entities, relationships)
├── spec.md                       # Feature specification (input)
├── quickstart.md                # Phase 1 output (deployment guide)
├── IMPLEMENTATION.md            # Phase 1b detailed implementation steps
└── checklists/                  # Deployment verification checklists
    ├── terraform-checklist.md   # Pre/post terraform apply checks
    └── github-actions-checklist.md  # GitHub Actions secret setup
```

### Infrastructure as Code (Terraform)

```text
infrastructure/
├── main.tf                      # S3, CloudFront, OAC (exists; update for ACM + Route53)
├── security.tf                  # IAM policy (exists; verify permissions)
├── variables.tf                 # Terraform variables (exists; complete)
├── provider.tf                  # AWS provider config (exists)
├── terraform.tfvars.example     # Example values (exists)
├── terraform.tfvars             # **NEW** Production values (create before apply)
├── terraform.tfstate            # **NEW** State file (created by terraform init)
├── terraform.tfstate.backup     # Backup of state (auto-created)
└── README.md                    # Terraform setup instructions (exists)
```

### GitHub Actions Workflow

```text
.github/
├── workflows/
│   └── deploy.yml               # Main deploy workflow (exists; no changes needed)
└── copilot-instructions.md      # Agent context (UPDATE post-plan: reference new plan path)
```

### Source Code (No Changes)

```text
site/                           # Static site files (unchanged)
├── index.html                   # Landing page
├── input.html                   # Input form page
├── report.html                  # Report page
├── css/                         # Stylesheets
└── data/                        # CSV data files
```

**Structure Decision**: Leveraging existing Terraform infrastructure code (`infrastructure/` directory); adding ACM certificate + Route53 record resources. GitHub Actions workflow exists and is production-ready; no code changes needed. Focus is configuration (terraform.tfvars) and Terraform resource additions.

---

## Phase 0: Research & Clarification

**Status**: ✅ **COMPLETE**

All technical unknowns from feature spec resolved in [research.md](research.md):

| Clarification | Resolution | Owner |
|-------|-----------|-------|
| ACM certificate for alignment.marcelrienks.com | Create via Terraform with DNS validation | Terraform |
| AWS account ID & S3 bucket naming | Use account 365620267529; bucket = `mx5-alignment-365620267529` | Terraform |
| Route53 DNS setup | Create alias record in existing marcelrienks.com zone | Terraform |
| GitHub Actions secrets | CLOUDFRONT_DISTRIBUTION_ID added post-apply | GitHub Actions + Manual |
| Build step necessity | None needed; site files production-ready | N/A |
| IAM least privilege | Scoped S3 + CloudFront + optional Route53 read | Terraform |
| Workflow optimization | Current workflow is optimal; no changes | N/A |
| Terraform state | Local state for single developer; remote backend later | Terraform |
| Post-deployment validation | Add simple health checks in workflow | GitHub Actions |

---

## Phase 1: Design & Contracts

**Status**: ✅ **COMPLETE**

### 1.1 Data Model & Entity Design

Completed in [data-model.md](data-model.md):

- **AWS Infrastructure Entities**: S3 Bucket, CloudFront Distribution, ACM Certificate, Route53 Record
- **Deployment Pipeline State**: GitHub Actions workflow execution, S3 sync operations, CloudFront invalidations
- **Configuration Model**: terraform.tfvars variables, IAM policy scopes
- **Terraform State**: File structure and sensitivity classification
- **Cross-Entity Validation**: Relationships and consistency rules

### 1.2 Interface Contracts

**GitHub Actions Workflow Contract**:
```yaml
Inputs:
  - Branch: main (trigger), any (manual via workflow_dispatch)
  - Secrets: AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, CLOUDFRONT_DISTRIBUTION_ID (optional)
  - Files: site/** (static site content)
Outputs:
  - S3 bucket: mx5-alignment-{account-id}
  - CloudFront domain: d{random}.cloudfront.net
  - Custom domain: alignment.marcelrienks.com (HTTPS)
Guarantees:
  - Tests must pass before deployment
  - Only main branch auto-deploys
  - Cache invalidation attempted (may be skipped if ID not available)
```

**Terraform Output Contract**:
```hcl
Exports (to be captured for GitHub setup):
  - s3_bucket_name: mx5-alignment-365620267529
  - cloudfront_distribution_id: E1234ABCDEFG
  - cloudfront_domain_name: d1234abcdefg.cloudfront.net
  - custom_domain: alignment.marcelrienks.com
  - route53_record_name: alignment.marcelrienks.com
```

**AWS Permissions Contract**:
```
github-actions IAM user must have:
  - s3:GetObject, s3:PutObject, s3:DeleteObject, s3:ListBucket on mx5-alignment-* bucket
  - cloudfront:CreateInvalidation, cloudfront:GetDistribution on CloudFront distribution
  - No EC2, IAM, or other permissions (least privilege)
```

### 1.3 Implementation Artifacts Generated

#### A. Terraform Infrastructure Updates

**File**: `infrastructure/main.tf` (add resources)

```hcl
# ACM Certificate for alignment.marcelrienks.com
resource "aws_acm_certificate" "alignment" {
  domain_name       = var.custom_domain
  validation_method = "DNS"
  
  tags = {
    Name = "${var.project_name}-alignment-cert"
  }
}

resource "aws_acm_certificate_validation" "alignment" {
  certificate_arn           = aws_acm_certificate.alignment.arn
  timeouts {
    create = "5m"
  }
}

# Route53 A record (alias) for alignment.marcelrienks.com
resource "aws_route53_record" "alignment" {
  zone_id = var.route53_zone_id  # marcelrienks.com zone
  name    = var.custom_domain
  type    = "A"
  
  alias {
    name                   = aws_cloudfront_distribution.website.domain_name
    zone_id                = aws_cloudfront_distribution.website.hosted_zone_id
    evaluate_target_health = false
  }
}

# Update CloudFront distribution to reference ACM cert (already in main.tf)
# acm_certificate_arn in viewer_certificate already uses var.acm_certificate_arn
```

#### B. Terraform Variables

**File**: `infrastructure/terraform.tfvars` (create new)

```hcl
aws_region             = "us-east-1"
environment            = "prod"
project_name           = "mx5-alignment"
custom_domain          = "alignment.marcelrienks.com"
acm_certificate_arn    = "arn:aws:acm:us-east-1:365620267529:certificate/NEW-CERT-ID"
cache_ttl_seconds      = 3600
enable_versioning      = true
enable_monitoring_alerts = false
route53_zone_id        = "Z0003562GQFFYQVGWRWO"  # marcelrienks.com zone
```

**File**: `infrastructure/variables.tf` (add route53_zone_id variable)

```hcl
variable "route53_zone_id" {
  description = "Route53 hosted zone ID for custom domain DNS records"
  type        = string
  default     = "Z0003562GQFFYQVGWRWO"  # marcelrienks.com
}
```

#### C. GitHub Actions Secrets

**Requires Manual Setup Post-Terraform**:

1. Run `terraform apply` (Terraform outputs distribution ID)
2. Capture output: `cloudfront_distribution_id`
3. Add to GitHub repository secrets:
   - Settings → Secrets and variables → Actions
   - New secret: `CLOUDFRONT_DISTRIBUTION_ID` = (value from Terraform output)

#### D. IAM Policy Verification

**File**: `infrastructure/security.tf` (verify current policy)

Current policy includes:
- ✅ S3 read/write/delete for bucket
- ✅ CloudFront invalidation permission
- ✅ CloudFront read permissions
- ⚠️ Optional: Add Route53 read-only permissions (for future health checks)

---

### 1.4 Quickstart Guide

**File**: `specs/004-github-actions-terraform-deployment/quickstart.md`

*(Auto-generated post-Phase 1)*

Quick deployment steps:
1. Create `infrastructure/terraform.tfvars` with production values
2. Run `terraform init` (initialize state)
3. Run `terraform plan` (review changes)
4. Run `terraform apply` (provision AWS resources)
5. Capture Terraform outputs (CloudFront ID, S3 bucket, etc.)
6. Add `CLOUDFRONT_DISTRIBUTION_ID` to GitHub Actions secrets
7. Push code to `main` branch → automatic deployment

---

## Phase 1b: Detailed Implementation Steps

**Status**: ⏳ **READY FOR EXECUTION** (see IMPLEMENTATION.md for detailed runbook)

### Implementation Sequence

1. **Terraform Planning & Validation**
   - Review current `infrastructure/` files
   - Create `terraform.tfvars` with production values
   - Validate `main.tf` updates for ACM + Route53
   - Run `terraform plan` for review

2. **Terraform Application**
   - Execute `terraform apply`
   - Verify AWS resources created (S3, CloudFront, ACM, Route53)
   - Capture outputs (distribution ID, bucket name, custom domain)

3. **GitHub Actions Configuration**
   - Add `CLOUDFRONT_DISTRIBUTION_ID` to repository secrets
   - Verify secrets are available in workflow context

4. **Testing & Validation**
   - Test GitHub Actions workflow via manual trigger (`workflow_dispatch`)
   - Verify deployment completes without errors
   - Validate DNS resolution: `alignment.marcelrienks.com` → CloudFront
   - Test HTTPS: Load site with valid SSL certificate

5. **Documentation & Handoff**
   - Create deployment troubleshooting guide
   - Document manual deployment steps (if needed)
   - Document rollback procedures

---

## Complexity Tracking

| Item | Current State | Scope | Risk |
|------|--------------|-------|------|
| Terraform version & AWS provider | Specified in provider.tf | Within existing project | Low |
| Route53 zone setup | Existing (marcelrienks.com) | No changes needed | Low |
| ACM certificate creation | **NEW** | Add resource + validation | Low |
| CloudFront distribution | Exists, needs ACM ref update | Minor update | Low |
| S3 bucket | Exists, needs versioning verify | Minor config | Low |
| GitHub Actions workflow | Exists, production-ready | No code changes | Low |
| IAM permissions | Existing policy, verify completeness | No violations expected | Low |
| Terraform state file | Local (to be created) | Initial setup only | Low |

**Overall Complexity**: ✅ **LOW** — Primarily configuration management; no novel technical challenges.

---

## Success Criteria (Post-Implementation)

1. ✅ **Terraform Initialization**: `terraform init` completes without errors
2. ✅ **Terraform Planning**: `terraform plan` shows resource creation/updates
3. ✅ **Terraform Application**: `terraform apply` successfully creates AWS resources
4. ✅ **ACM Certificate**: Certificate status = ACTIVE for `alignment.marcelrienks.com`
5. ✅ **Route53 Record**: DNS resolves `alignment.marcelrienks.com` to CloudFront domain
6. ✅ **GitHub Secrets**: `CLOUDFRONT_DISTRIBUTION_ID` available in workflow
7. ✅ **Workflow Execution**: GitHub Actions workflow runs to completion on `main` push
8. ✅ **Tests Pass**: `npm run test:all-sync` passes before deployment
9. ✅ **S3 Deployment**: Files synced to S3 bucket (`aws s3 ls s3://mx5-alignment-365620267529/`)
10. ✅ **Cache Invalidation**: CloudFront invalidation request succeeds
11. ✅ **HTTPS Resolution**: `https://alignment.marcelrienks.com` loads with valid certificate
12. ✅ **Deployment Duration**: Deployment completes within 5 minutes of code push

---

## Dependencies & Sequencing

```
Phase 0 (Research) [COMPLETE]
    ↓
Phase 1 (Design) [COMPLETE]
    ├─→ 1.1 Data model & contracts [✅]
    ├─→ 1.2 Terraform resource design [✅]
    ├─→ 1.3 GitHub Actions config [✅]
    └─→ 1.4 Quickstart documentation [✅]
    ↓
Phase 1b (Implementation Readiness) [READY]
    ├─→ Create terraform.tfvars [⏳]
    ├─→ Update Terraform resources [⏳]
    ├─→ terraform init + plan + apply [⏳]
    ├─→ Configure GitHub secrets [⏳]
    └─→ Test workflow execution [⏳]
    ↓
Phase 2 (Tasks & Checklists) [→ Next workflow]
    └─→ Generate implementation checklist & tasks (/speckit.tasks)
```

---

## Agent Context Update

The `.github/copilot-instructions.md` must be updated to reference this plan:

```markdown
<!-- SPECKIT START -->
For additional context about technologies to be used, project structure,
shell commands, and other important information, read the current plan
at specs/004-github-actions-terraform-deployment/plan.md
<!-- SPECKIT END -->
```

This ensures future agent work correctly references the deployment automation plan.
