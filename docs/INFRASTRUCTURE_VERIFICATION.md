# Infrastructure Verification & End-to-End Testing Guide

This guide provides step-by-step verification of AWS infrastructure, DNS/HTTPS configuration, and end-to-end deployment testing.

## Current Infrastructure Status

✅ **Provisioned**:
- S3 Bucket: `mx5-alignment-365620267529` (versioning enabled, encryption enabled)
- CloudFront Distribution: `E3AFTSKLCPTLIM` (deployed)
- CloudFront Domain: `dxfocr58kmlsu.cloudfront.net`

⏳ **Pending Manual Action**:
- Route53 A record (requires custom domain validation)
- ACM Certificate (requires DNS CNAME validation for custom domain)
- Custom Domain: `alignment.marcelrienks.com` (currently NOT configured)

---

## Phase 5.1: Infrastructure Verification (T025-T029)

### T025: Verify S3 Bucket Exists and is Configured

```bash
# List S3 buckets
aws s3 ls | grep mx5-alignment
# Expected output: 2026-05-01 14:32:45 mx5-alignment-365620267529

# Check versioning is enabled
aws s3api get-bucket-versioning --bucket mx5-alignment-365620267529
# Expected: VersioningConfiguration: {Status: Enabled}

# Check encryption is enabled
aws s3api get-bucket-encryption --bucket mx5-alignment-365620267529
# Expected: ServerSideEncryptionConfiguration: {Rules: [{ApplyServerSideEncryptionByDefault: {SSEAlgorithm: AES256}}]}

# Verify bucket blocks public access
aws s3api get-public-access-block --bucket mx5-alignment-365620267529
# Expected: {BlockPublicAcls: true, IgnorePublicAcls: true, BlockPublicPolicy: true, RestrictPublicBuckets: true}

# ✅ All checks passed
```

### T026: Verify CloudFront Distribution is Deployed

```bash
# Get distribution details
aws cloudfront get-distribution --id E3AFTSKLCPTLIM --query 'Distribution.[Status,DistributionConfig.Enabled,DistributionConfig.Origins[0].S3OriginConfig]'
# Expected: [Deployed, true, ...]

# List all distributions
aws cloudfront list-distributions --query 'DistributionList.Items[?Id==`E3AFTSKLCPTLIM`].[Id,Status,Enabled,DomainName]'
# Expected: [[E3AFTSKLCPTLIM, Deployed, true, dxfocr58kmlsu.cloudfront.net]]

# ✅ Deployment status verified
```

### T027: Verify S3 Bucket is Empty (Ready for Deployment)

```bash
# List all objects in S3 bucket
aws s3 ls s3://mx5-alignment-365620267529/ --recursive

# Expected output: Empty (no output or only default objects)
# If files exist: They are from a previous deployment test and can be cleaned
# Cleanup (if needed):
aws s3 rm s3://mx5-alignment-365620267529/ --recursive

# ✅ Bucket is ready for first deployment
```

### T028: Verify ACM Certificate (Current Status: DISABLED)

**Note**: Custom domain ACM certificate is currently disabled due to DNS validation complexity. The site is fully functional on the CloudFront default domain (`dxfocr58kmlsu.cloudfront.net`).

To enable custom domain support later:

```bash
# 1. Create ACM certificate
cd infrastructure
terraform apply -target=aws_acm_certificate.alignment

# 2. AWS Console: ACM → Certificates → <certificate_arn>
#    Note the validation CNAME records and add them to Route53:
#    Name: _xxxx.alignment.marcelrienks.com
#    Type: CNAME
#    Value: _yyyy.acm-validations.aws

# 3. Wait for certificate status to change to ISSUED (usually 2-5 minutes)

# 4. Enable custom domain in infrastructure configuration:
#    (Update infrastructure code if needed)
#    terraform apply

# Verify certificate (when enabled):
aws acm describe-certificate \
  --certificate-arn arn:aws:acm:us-east-1:365620267529:certificate/639db5af-afc0-4a8b-bf11-fe39e0201990 \
  --region us-east-1 \
  --query 'Certificate.[CertificateStatus,DomainName,DomainValidationOptions[0].ValidationStatus]'
# Expected: [ISSUED, alignment.marcelrienks.com, SUCCESS]
```

### T029: Verify IAM Policy for GitHub Actions

```bash
# Get the IAM policy JSON from Terraform output
cd infrastructure
terraform output iam_policy_github_actions

# Verify policy has required permissions:
# ✅ s3:GetObject, s3:PutObject, s3:DeleteObject, s3:ListBucket
# ✅ cloudfront:CreateInvalidation, cloudfront:ListInvalidations, cloudfront:GetInvalidation
# ✅ cloudfront:GetDistribution, cloudfront:ListDistributions

# If using github-actions IAM user:
aws iam get-user-policy --user-name github-actions --policy-name mx5-alignment-deployment
# Expected: Policy document shows S3 + CloudFront permissions (no wildcard actions)

# ✅ IAM policy verified
```

---

## Phase 5.2: DNS & HTTPS Validation (T030-T032)

### T030: Verify DNS Resolution

**Note**: Custom domain DNS is currently NOT configured. CloudFront default domain works immediately:

```bash
# Test CloudFront default domain (works immediately)
nslookup dxfocr58kmlsu.cloudfront.net
# Expected: resolves to CloudFront IP(s)

# Custom domain DNS (when enabled later):
nslookup alignment.marcelrienks.com
# Expected: CNAME or A record pointing to dxfocr58kmlsu.cloudfront.net

# Or use dig:
dig dxfocr58kmlsu.cloudfront.net +short
# Expected: IP address(es)

# ✅ CloudFront domain resolves correctly
```

### T031: Verify HTTPS Certificate

```bash
# Test CloudFront default domain (has AWS-managed certificate)
openssl s_client -connect dxfocr58kmlsu.cloudfront.net:443 -servername dxfocr58kmlsu.cloudfront.net < /dev/null 2>/dev/null | openssl x509 -noout -text | grep -A 2 "Subject:"
# Expected: Subject CN = *.cloudfront.net

# Test custom domain (when enabled with ACM certificate):
openssl s_client -connect alignment.marcelrienks.com:443 -servername alignment.marcelrienks.com < /dev/null 2>/dev/null | openssl x509 -noout -text | grep -A 2 "Subject:"
# Expected: Subject CN = alignment.marcelrienks.com, Issuer: Amazon RSA

# ✅ HTTPS certificate is valid
```

### T032: Verify CloudFront Headers

```bash
# Test CloudFront default domain
curl -I https://dxfocr58kmlsu.cloudfront.net/
# Expected output:
# HTTP/2 403 (Forbidden - because bucket is empty and CloudFront redirects to index.html)
# Server: CloudFront
# X-Cache: Error from CloudFront (because bucket is empty)

# After deployment (with site files):
curl -I https://dxfocr58kmlsu.cloudfront.net/index.html
# Expected:
# HTTP/2 200 OK
# Cache-Control: public, max-age=3600
# Server: CloudFront
# X-Cache: Hit from cloudfront

# ✅ CloudFront headers verified
```

---

## Phase 5.3: End-to-End Deployment Test (T033-T035)

### T033: Manual Deployment Test (First Sync)

```bash
# Change to alignment directory
cd /Users/marcelrienks/workspace/mx5-nc1/alignment

# Sync site files to S3
aws s3 sync site/ s3://mx5-alignment-365620267529/ \
  --delete \
  --cache-control "public, max-age=3600"

# Expected output:
# upload: site/index.html to s3://mx5-alignment-365620267529/index.html
# upload: site/input.html to s3://mx5-alignment-365620267529/input.html
# upload: site/report.html to s3://mx5-alignment-365620267529/report.html
# upload: site/css/shared.css to s3://mx5-alignment-365620267529/css/shared.css
# ... (all site files uploaded)

# Verify files in S3
aws s3 ls s3://mx5-alignment-365620267529/ --recursive | head -20
# Expected: List of site files (index.html, input.html, report.html, css/shared.css, data/alignment-FL.csv, data/alignment-FR.csv, js/*, etc.)

# Count files uploaded
aws s3 ls s3://mx5-alignment-365620267529/ --recursive | wc -l
# Expected: ~30-40 files (HTML, CSS, JavaScript, CSV data files)

# ✅ First deployment successful
```

### T034: Verify Site Loads via CloudFront

```bash
# Test CloudFront default domain
curl -s https://dxfocr58kmlsu.cloudfront.net/index.html | head -20
# Expected: HTML content with <!DOCTYPE html>, <title>, etc.

# Or open in browser:
# https://dxfocr58kmlsu.cloudfront.net/

# Expected display:
# - MX5 NC1 Wheel Alignment Tool interface loads
# - No 403/404 errors
# - CSS and JavaScript load correctly (check browser console)

# Check custom domain (when enabled):
# https://alignment.marcelrienks.com/
# Expected: Same site content via custom domain

# ✅ Site loads and is functional
```

### T035: Verify CloudFront Cache Invalidation

```bash
# Method 1: Test via AWS CLI
aws cloudfront create-invalidation \
  --distribution-id E3AFTSKLCPTLIM \
  --paths "/*"

# Expected output: 
# Invalidation: {
#   Id: I1234567EXAMPLE,
#   CreateTime: 2026-05-01T14:35:00.000Z,
#   Status: InProgress
# }

# Check invalidation status
aws cloudfront get-invalidation \
  --distribution-id E3AFTSKLCPTLIM \
  --id I1234567EXAMPLE

# Expected: Status = Completed (usually within 2 minutes)

# Method 2: Test via GitHub Actions (see T036 below)

# ✅ Cache invalidation works correctly
```

---

## Phase 5.4: GitHub Actions Automated Deployment Test (T036-T037)

### T036: Test Automated Deployment via GitHub Actions

**Prerequisites**: GitHub Actions secrets must be configured (CLOUDFRONT_DISTRIBUTION_ID, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY)

```bash
# Make a test change
echo "# Test deployment $(date)" >> README.md

# Commit and push to main
git add README.md
git commit -m "test: trigger github actions deployment"
git push origin main

# Monitor workflow execution:
# Go to: GitHub → Actions tab → "Deploy to AWS S3 + CloudFront"
# Click the latest workflow run and watch progress

# Expected workflow steps:
# 1. ✅ Checkout code
# 2. ✅ Setup Node.js (18.x)
# 3. ✅ Install dependencies (npm install)
# 4. ✅ Run integration tests (npm run test:all-sync)
#    - Should run tests for input validation, CSV processing, data integrity
# 5. ✅ Deploy to S3 (aws s3 sync)
#    - Files synced to mx5-alignment-365620267529
# 6. ✅ Invalidate CloudFront cache
#    - Cache invalidation request sent to E3AFTSKLCPTLIM
# 7. ✅ Deployment complete

# Expected output in workflow logs:
# "✅ Deployed to S3 (mx5-alignment-365620267529)"
# "✅ Invalidated CloudFront cache"
# "🚀 Deployment Complete!"

# If any step fails:
# - Check the error logs in the GitHub Actions tab
# - Common issues:
#   - Tests failed: Run `npm run test:all-sync` locally to debug
#   - AWS credentials: Verify AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY secrets
#   - CloudFront distribution: Verify CLOUDFRONT_DISTRIBUTION_ID secret is set

# ✅ Automated deployment successful
```

### T037: Verify Post-Deployment Site is Live

```bash
# After GitHub Actions workflow completes, verify the site is updated

# Method 1: Browser (CloudFront default domain)
# Open: https://dxfocr58kmlsu.cloudfront.net/
# Expected:
# - Site loads without errors
# - Latest version of files displayed
# - No cached old version (cache was invalidated in workflow)

# Method 2: CLI verification
curl -s https://dxfocr58kmlsu.cloudfront.net/index.html | grep -o "<title>.*</title>"
# Expected: <title>MX5 Wheel Alignment Tool</title>

# Check X-Cache header (shows if response came from cache or origin)
curl -I https://dxfocr58kmlsu.cloudfront.net/index.html | grep -i "x-cache"
# Expected: "X-Cache: Hit from cloudfront" (after cache is warmed)

# ✅ Post-deployment verification complete
```

---

## Phase 6: Documentation & Handoff (T038-T042)

### Documentation Files Created

- **`.github/GITHUB_ACTIONS_SETUP.md`**: Complete setup guide for GitHub Actions secrets
- **`docs/DEPLOYMENT.md`**: Deployment verification procedures
- **`docs/TROUBLESHOOTING.md`**: Common issues and solutions

### T038-T042 Checklists

**T038**: Create deployment verification checklist
- [ ] Infrastructure provisioned (S3, CloudFront, IAM)
- [ ] GitHub Actions secrets configured (AWS credentials, CloudFront ID)
- [ ] Manual deployment test successful (site loads via CloudFront)
- [ ] Automated deployment test successful (GitHub Actions workflow runs)
- [ ] Site is live and accessible via CloudFront domain

**T039**: Document Terraform maintenance procedures
- [ ] How to update Terraform configuration
- [ ] How to import existing AWS resources into Terraform state
- [ ] How to destroy infrastructure (if needed)
- [ ] How to manage infrastructure versions and state backups

**T040**: Create GitHub Actions troubleshooting guide
- [ ] Common workflow failures and solutions
- [ ] How to debug test failures
- [ ] How to check AWS credentials validity
- [ ] How to invalidate CloudFront cache manually

**T041**: Finalize Terraform documentation
- [ ] Document all variables and their defaults
- [ ] Explain CloudFront OAC (Origin Access Control) configuration
- [ ] Provide examples for scaling (multiple distributions, regions)

**T042**: Commit all changes to git
- [ ] All infrastructure files committed (except .tfstate files)
- [ ] GitHub Actions workflow committed
- [ ] Documentation committed
- [ ] All changes pushed to main branch

---

## Quick Reference: Useful Commands

### Check Deployment Status

```bash
# CloudFront distribution status
aws cloudfront get-distribution --id E3AFTSKLCPTLIM --query 'Distribution.Status'

# S3 bucket contents
aws s3 ls s3://mx5-alignment-365620267529/ --recursive | wc -l

# CloudFront recent invalidations
aws cloudfront list-invalidations --distribution-id E3AFTSKLCPTLIM --query 'InvalidationList.Items[].[Id,Status,CreateTime]' --output table

# Check GitHub Actions workflow
gh run view --repo marcelrienks/alignment --json status
```

### Common Issues

**Site shows 403 Forbidden**
- CloudFront cannot access S3 bucket because files not uploaded
- Run: `aws s3 sync site/ s3://mx5-alignment-365620267529/ --delete`

**Site shows old version**
- CloudFront is serving cached version
- Invalidate cache: `aws cloudfront create-invalidation --distribution-id E3AFTSKLCPTLIM --paths "/*"`

**GitHub Actions deployment fails**
- Check AWS credentials are correct: `aws sts get-caller-identity`
- Verify GitHub secrets are set: GitHub → Settings → Secrets and variables → Actions
- Check test failures: `npm run test:all-sync`

---

## Summary

✅ **Completed**:
- Infrastructure provisioned (S3, CloudFront)
- GitHub Actions workflow configured
- IAM policy scoped correctly
- Documentation created

⏳ **Manual Actions Remaining**:
1. Configure GitHub Actions secrets (AWS credentials, CloudFront ID)
2. Run test deployment to verify workflow
3. (Optional) Enable custom domain with ACM certificate validation

🎯 **Next Steps**:
1. Follow `.github/GITHUB_ACTIONS_SETUP.md` to configure GitHub Actions secrets
2. Trigger a test deployment by pushing to main branch
3. Monitor workflow in GitHub Actions tab
4. Verify site is live at CloudFront domain
