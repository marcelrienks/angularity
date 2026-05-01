# Research: GitHub Actions + Terraform Automated Deployment

**Date**: May 1, 2026  
**Conducted by**: Architecture Planning Phase  
**Status**: Complete

---

## Summary

Research conducted to resolve technical clarifications from feature spec. All unknowns resolved; key decisions documented below with rationale and alternatives.

---

## 1. ACM Certificate for alignment.marcelrienks.com

### Decision
**Create new ACM certificate for `alignment.marcelrienks.com`** via Terraform `aws_acm_certificate` resource.

### Findings
- **Current state**: Route53 zone `marcelrienks.com` exists (ID: `Z0003562GQFFYQVGWRWO`)
- **Existing certificate**: Only `id.marcelrienks.com` certificate exists (`arn:aws:acm:us-east-1:365620267529:certificate/cddd1e49-9935-48c4-9e6e-56922bce048d`)
- **New certificate needed**: Separate ACM certificate for subdomain `alignment.marcelrienks.com` required for CloudFront custom domain
- **AWS region**: Must be `us-east-1` for CloudFront integration (ACM-CloudFront requirement)
- **Validation method**: DNS validation via Route53 (recommended for automation)
- **Domain wildcards**: Not necessary; explicit subdomain certificate sufficient

### Rationale
Creating the certificate via Terraform ensures idempotency and proper dependency tracking with CloudFront distribution. DNS validation integrates seamlessly with existing Route53 zone, enabling automated verification without manual certificate approval.

### Alternatives Considered
- **Manual AWS Console creation**: Rejected because non-repeatable; breaks infrastructure-as-code principle
- **Use wildcard certificate**: Rejected because overly broad (unnecessary); specific subdomain certificate preferred
- **Email validation**: Rejected because requires manual approval steps; DNS validation fully automated

### Action Items
- Add `aws_acm_certificate` resource to `infrastructure/main.tf` for `alignment.marcelrienks.com`
- Add `aws_acm_certificate_validation` resource to complete DNS validation
- Reference new certificate ARN in `aws_cloudfront_distribution` viewer_certificate
- Update `.github/copilot-instructions.md` to point to this plan post-deployment

---

## 2. AWS Account ID & S3 Bucket Naming

### Decision
**Use AWS account ID `365620267529` in S3 bucket name**: `mx5-alignment-365620267529`

### Findings
- **AWS Account**: 365620267529 (confirmed via `aws sts get-caller-identity`)
- **Current bucket formula** (from Terraform locals): `${var.project_name}-${data.aws_caller_identity.current.account_id}`
- **Project name variable**: `mx5-alignment` (default in `infrastructure/variables.tf`)
- **Bucket name**: `mx5-alignment-365620267529` (auto-generated, globally unique)
- **Versioning**: Enabled (default `enable_versioning = true`)
- **Encryption**: AES256 at-rest enabled

### Rationale
Including account ID ensures global uniqueness without external coordination. Terraform locals automatically generate this name, preventing hardcoding and reducing configuration errors. S3 versioning enabled for rollback capability (aligns with deployment safety requirements).

### Alternatives Considered
- **Hardcoded bucket name**: Rejected because requires manual coordination and is error-prone
- **Region-based suffix**: Rejected because account ID is sufficient and simpler
- **No versioning**: Rejected because deployment safety requires rollback capability

### Action Items
- Confirm in `terraform.tfvars` whether to override bucket name (leave blank to auto-generate)
- Verify S3 bucket policies allow CloudFront + GitHub Actions access

---

## 3. Route53 DNS Configuration for alignment.marcelrienks.com

### Decision
**Create Route53 A (alias) record in existing `marcelrienks.com` zone** pointing to CloudFront distribution domain.

### Findings
- **Route53 Zone**: `marcelrienks.com` exists (Hosted Zone ID: `Z0003562GQFFYQVGWRWO`)
- **Subdomain**: `alignment.marcelrienks.com` (new record needed)
- **Target**: CloudFront distribution domain name (e.g., `d1234abc.cloudfront.net`)
- **Record type**: AWS alias record (native Route53 feature, zero-latency routing)
- **Health checks**: Not required for simple static site routing

### Rationale
AWS Route53 alias records provide native integration with CloudFront, eliminating DNS propagation delays. Alias records are free (no charge for lookups) and automatically update if CloudFront distribution changes. Using existing zone prevents DNS zone fragmentation.

### Alternatives Considered
- **CNAME record**: Rejected because Route53 CNAME cannot be zone apex; alias is CloudFront-specific best practice
- **Manual IP records**: Rejected because CloudFront uses dynamic IPs; not suitable for static DNS
- **Separate Route53 zone**: Rejected because existing zone available; unnecessary complexity

### Action Items
- Add `aws_route53_record` resource to `infrastructure/main.tf` for subdomain alias
- Reference CloudFront distribution domain name as target
- Terraform will output final DNS name for verification

---

## 4. GitHub Actions Secrets Configuration

### Decision
**Configure GitHub Actions secrets after Terraform apply**:
- `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` (already set in GitHub)
- **NEW**: Add `CLOUDFRONT_DISTRIBUTION_ID` secret with value from Terraform output

### Findings
- **Existing secrets**: AWS credentials already configured (verified in workflow)
- **CLOUDFRONT_DISTRIBUTION_ID**: Currently optional in workflow (gracefully handles missing value)
- **Terraform output**: `aws_cloudfront_distribution.website.id` provides distribution ID
- **GitHub API**: Can be set via REST API or GitHub CLI after Terraform apply
- **Security**: Using GitHub Actions secrets prevents exposing IDs in logs/public repositories

### Rationale
Externalizing distribution ID as secret prevents hardcoding in workflow files and enables environment-agnostic workflows. Terraform output ensures synchronization between infrastructure and CI/CD configuration.

### Alternatives Considered
- **Hardcode in workflow**: Rejected because lacks flexibility; breaks multi-environment deployments
- **Derive dynamically from AWS**: Rejected because adds runtime complexity; secrets simpler and more performant
- **Store in terraform.tfvars**: Rejected because that file is not committed; secrets approach is standard DevOps practice

### Action Items
- After Terraform apply, capture `cloudfront_distribution_id` output
- Add secret to GitHub Actions (via Settings → Secrets & variables → Actions)
- Verify workflow can retrieve secret: `${{ secrets.CLOUDFRONT_DISTRIBUTION_ID }}`

---

## 5. Build Step Necessity

### Decision
**No build step needed for `npm run build`**: Current site files in `/site` directory are production-ready.

### Findings
- **Current site directory**: `/site` contains pre-built HTML, CSS, JS
- **Test suite**: Uses Puppeteer integration tests (no build validation required)
- **No bundler**: Project uses vanilla JavaScript (no webpack/Vite compilation needed)
- **HTML generation**: HTML files are static, not generated via build tool
- **CSS**: Static in `/site/css/shared.css` (no processing required)

### Rationale
The project is a static site with no build-time compilation. All files are committed to repository and ready for deployment. Adding unnecessary build steps increases CI/CD complexity and deployment time without benefit.

### Alternatives Considered
- **Add Vite build step**: Rejected because not needed; project already working without bundler
- **Minify/optimize during CI**: Rejected because adds complexity; static files sufficient for current scale
- **Generate site from template**: Rejected because HTML is stable and committed; generation adds fragility

### Action Items
- Use `site/` directory as-is in GitHub Actions deploy step
- Confirm all site files committed to repository before deployment
- Document that site must be manually maintained or built locally if changes needed

---

## 6. IAM Least Privilege for GitHub Actions

### Decision
**Update GitHub Actions IAM policy** to include Route53 read permissions (for future DNS health checks) and maintain existing S3 + CloudFront permissions.

### Findings
- **IAM User**: `github-actions` already exists (created May 1, 2026)
- **Current policy**: Defined in `infrastructure/security.tf` local variable (S3 + CloudFront)
- **Missing permissions**: Route53 read-only for DNS record validation
- **Principle of Least Privilege**: Policy should allow only necessary actions
- **Resource ARNs**: Scope to specific S3 bucket and CloudFront distribution

### Rationale
GitHub Actions needs:
1. **S3 permissions**: `GetObject`, `PutObject`, `DeleteObject`, `ListBucket` (deployment)
2. **CloudFront permissions**: `CreateInvalidation` + read-only `GetDistribution`, `ListDistributions` (cache refresh)
3. **Route53 permissions** (optional future): Read-only `ListResourceRecordSets`, `GetHostedZone` (health checks)

Scoping to specific resources (ARNs) prevents accidental access to unrelated AWS resources.

### Alternatives Considered
- **Admin policy**: Rejected because violates least privilege principle
- **No CloudFront permissions**: Rejected because cache invalidation needed for site freshness
- **Broader wildcards**: Rejected because specific ARNs preferred for security

### Action Items
- Verify current `github-actions` user policy matches `infrastructure/security.tf`
- Add optional Route53 read permissions to policy
- Test GitHub Actions deployment with updated policy

---

## 7. GitHub Actions Workflow Optimization

### Decision
**Current workflow is optimal**: No changes needed to `.github/workflows/deploy.yml` structure.

### Findings
- **Test-first approach**: ✅ Tests run before deployment (correct gating)
- **Conditional deployment**: ✅ `if: success()` ensures deploy only on passing tests
- **Cache control headers**: ✅ CloudFront TTL 3600s (1 hour) for balance between freshness and caching
- **Manual trigger**: ✅ `workflow_dispatch` allows on-demand deployments
- **Error handling**: ✅ CloudFront invalidation gracefully handles missing `DISTRIBUTION_ID`

### Rationale
The workflow structure follows GitHub Actions best practices:
1. Separate `test` and `deploy` jobs for clarity
2. Dependency gating prevents deployment on test failures
3. Secrets used correctly (not exposed in logs)
4. Optional CloudFront step allows gradual infrastructure buildup

### Alternatives Considered
- **Single job**: Rejected because separating test/deploy provides clarity and partial failure visibility
- **Always invalidate**: Rejected because optional approach allows workflows during infrastructure setup
- **Parallel test jobs**: Rejected because single Node.js test suite is fast enough; complexity not justified

### Action Items
- No changes to current workflow
- Workflow ready for production use post-Terraform infrastructure setup

---

## 8. Terraform State Management

### Decision
**Use local state initially**: Remote state (S3 + DynamoDB) can be added later when team scaling requires it.

### Findings
- **Current config**: `infrastructure/provider.tf` has remote backend commented out
- **Local state**: Terraform creates `terraform.tfstate` in repository directory
- **State sensitivity**: File contains sensitive data (ACM certificate IDs, bucket names)
- **Team collaboration**: Local state works for single developer; team requires remote backend
- **S3 remote backend**: Requires separate state bucket + DynamoDB lock table (bootstrap challenge)

### Rationale
Starting with local state reduces initial setup complexity. Single developer workflow doesn't require state locking. State file should be committed to repository (for this single-person project) or kept in secure backup. Remote backend migration is straightforward if team grows.

### Alternatives Considered
- **Remote backend immediately**: Rejected because adds bootstrap complexity (chicken-egg: need backend bucket before Terraform manages it)
- **No version control for state**: Rejected because `terraform.tfstate` needed for long-term infrastructure management
- **Terraform Cloud**: Rejected because introduces external service dependency; local state sufficient

### Action Items
- Document that `terraform.tfstate` must be kept secure (sensitive data)
- Include `.gitignore` entry if state should be excluded from version control (depends on team policy)
- Plan remote backend migration if team grows beyond single developer

---

## 9. Deployment Validation & Verification

### Decision
**Add validation checks** in GitHub Actions post-deployment to verify site accessibility and CloudFront cache behavior.

### Findings
- **Current workflow**: Exits after CloudFront invalidation (no post-deployment validation)
- **Site accessibility**: Can be validated with simple curl/wget check
- **HTTPS verification**: Can check certificate validity
- **DNS resolution**: Can verify Route53 record resolves correctly
- **Performance validation**: Simple load test could verify CloudFront is functioning

### Rationale
Post-deployment validation provides confidence that changes reached production. Simple checks catch configuration errors early (missing DNS records, certificate issues, S3 permissions).

### Alternatives Considered
- **No validation**: Rejected because silent deployment failures are harder to debug
- **Full E2E tests in workflow**: Rejected because adds complexity; simple health checks sufficient
- **Manual verification**: Rejected because automation is goal; no manual steps in pipeline

### Action Items
- Add post-deployment validation step to `.github/workflows/deploy.yml`
- Validate HTTPS certificate, DNS resolution, S3 bucket access
- Document validation checks in deployment troubleshooting guide

---

## Implementation Readiness Assessment

| Item | Status | Risk | Mitigation |
|------|--------|------|-----------|
| AWS Account & IAM | ✅ Ready | Low | Account exists, user configured |
| Route53 Zone | ✅ Ready | Low | Existing zone available |
| S3 Bucket Creation | ✅ Ready | Low | Terraform handles creation |
| ACM Certificate | ⚠️ Action Needed | Medium | Must create in Terraform |
| CloudFront Distribution | ✅ Ready | Low | Terraform code exists |
| GitHub Actions Workflow | ✅ Ready | Low | Workflow exists and tested |
| GitHub Secrets | ⚠️ Action Needed | Medium | Must add CLOUDFRONT_DISTRIBUTION_ID post-apply |
| terraform.tfvars | ⚠️ Action Needed | High | Must create with production values |
| IAM Policy Update | ⚠️ Action Needed | Low | Update existing policy |

---

## Next Steps (Phase 1 Design)

1. **Update Terraform**: Add ACM certificate + Route53 record resources
2. **Create terraform.tfvars**: Configure production values
3. **Implement IAM updates**: Verify github-actions policy is complete
4. **Plan deployment sequence**: terraform init → terraform plan → terraform apply → GitHub secrets → test workflow
5. **Documentation**: Create quickstart.md with deployment steps

