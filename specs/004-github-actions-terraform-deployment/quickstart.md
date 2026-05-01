# Quick Start: GitHub Actions + Terraform Deployment

**Feature**: 004-github-actions-terraform-deployment  
**Duration**: ~15 minutes setup + 5 minutes per deployment (automated thereafter)  
**Prerequisites**: AWS account, Terraform installed, GitHub repository, git CLI

---

## 🚀 Deployment in 7 Steps

### Step 1: Prepare terraform.tfvars

Create `infrastructure/terraform.tfvars` with production values:

```hcl
aws_region             = "us-east-1"
environment            = "prod"
project_name           = "mx5-alignment"
custom_domain          = "alignment.marcelrienks.com"
acm_certificate_arn    = "arn:aws:acm:us-east-1:365620267529:certificate/CERT-ID-HERE"
cache_ttl_seconds      = 3600
enable_versioning      = true
enable_monitoring_alerts = false
route53_zone_id        = "Z0003562GQFFYQVGWRWO"
```

**Important**: Don't commit `terraform.tfvars` to git (contains sensitive IDs). Add to `.gitignore`:
```
infrastructure/terraform.tfvars
infrastructure/terraform.tfstate*
```

### Step 2: Initialize Terraform

```bash
cd infrastructure
terraform init
```

**Expected output**: Terraform initialized; `.terraform/` directory created.

### Step 3: Review Infrastructure Plan

```bash
terraform plan
```

**Review output**: Shows resources to create:
- ✅ S3 bucket: `mx5-alignment-365620267529`
- ✅ CloudFront distribution with custom domain
- ✅ ACM certificate: `alignment.marcelrienks.com`
- ✅ Route53 A record (alias)

### Step 4: Apply Terraform Configuration

```bash
terraform apply
```

**Expected output** (after confirmation):
```
Apply complete! Resources have been created.

Outputs:

cloudfront_distribution_id = "E1234ABCDEFG"
cloudfront_domain_name = "d1234abcdefg.cloudfront.net"
s3_bucket_name = "mx5-alignment-365620267529"
custom_domain = "alignment.marcelrienks.com"
```

**⏱️ Timing**: CloudFront distribution takes ~5-10 minutes to fully activate.

### Step 5: Capture Terraform Output

```bash
terraform output cloudfront_distribution_id
```

Copy this value; you'll need it for GitHub secrets.

### Step 6: Configure GitHub Secrets

1. Navigate to GitHub repository Settings → Secrets and variables → Actions
2. Add new secret:
   - **Name**: `CLOUDFRONT_DISTRIBUTION_ID`
   - **Value**: (paste distribution ID from Step 5, e.g., `E1234ABCDEFG`)
3. Save

**Verify**: GitHub Actions workflow can now retrieve distribution ID for cache invalidation.

### Step 7: Test Deployment

#### Option A: Manual Trigger (Recommended for Testing)
```bash
git push origin main
# Or manually trigger via GitHub:
# Settings → Actions → Deploy to AWS S3 + CloudFront → Run workflow
```

#### Option B: Automatic Trigger (After Confirmation)
Just push code to `main` branch; workflow runs automatically.

**Monitor execution**:
1. Go to GitHub Actions tab
2. Watch "Deploy to AWS S3 + CloudFront" workflow
3. Confirm: Tests pass → Deployment succeeds

**Expected workflow steps**:
```
✅ Setup Node.js
✅ Install dependencies
✅ Run integration tests (npm run test:all-sync)
✅ Deploy to S3 (aws s3 sync)
✅ Invalidate CloudFront cache
✅ Deployment complete
```

---

## ✅ Verification Checklist

After deployment completes, verify:

- [ ] **S3 bucket exists**: `aws s3 ls | grep mx5-alignment`
- [ ] **S3 files uploaded**: `aws s3 ls s3://mx5-alignment-365620267529/ --recursive | wc -l` (should show file count)
- [ ] **CloudFront domain accessible**: Open `https://d1234abcdefg.cloudfront.net` in browser (replace with actual domain)
- [ ] **Custom domain resolves**: Open `https://alignment.marcelrienks.com` in browser
- [ ] **HTTPS certificate valid**: Check certificate details (should show `alignment.marcelrienks.com`)
- [ ] **DNS resolution correct**: `nslookup alignment.marcelrienks.com` (should resolve to CloudFront domain)
- [ ] **Site loads**: Homepage displays without errors
- [ ] **Cache invalidation worked**: Make a small change to `site/index.html`, push, verify update appears within 2 minutes

---

## 🔧 Common Commands

### Manual Deployment (without GitHub Actions)
```bash
# Build if needed
npm run build

# Sync to S3
aws s3 sync site/ s3://mx5-alignment-365620267529/ --delete

# Invalidate CloudFront cache
aws cloudfront create-invalidation \
  --distribution-id E1234ABCDEFG \
  --paths "/*"
```

### Infrastructure Maintenance

```bash
# View current infrastructure
terraform show

# Update infrastructure after changes
terraform plan
terraform apply

# Destroy infrastructure (careful!)
terraform destroy
```

### GitHub Actions Troubleshooting

```bash
# View deployment logs
# GitHub UI: Actions tab → Workflow run → View logs

# Re-run workflow
# GitHub UI: Actions tab → Workflow run → Re-run jobs

# Check AWS credentials
aws sts get-caller-identity
```

---

## 📋 Post-Deployment Checklist

- [ ] All Terraform resources created successfully
- [ ] GitHub secrets configured (`CLOUDFRONT_DISTRIBUTION_ID` available)
- [ ] ACM certificate is ACTIVE (not pending validation)
- [ ] Route53 record resolves custom domain to CloudFront
- [ ] First automated deployment succeeded
- [ ] Site loads with HTTPS and valid certificate
- [ ] Stakeholders notified of live deployment
- [ ] Documentation updated (this quickstart, deployment procedures)

---

## 🚨 Troubleshooting

### Issue: Terraform apply fails with "certificate not found"
**Solution**: Verify `acm_certificate_arn` in `terraform.tfvars` is correct:
```bash
aws acm list-certificates --region us-east-1 | jq '.CertificateSummaryList[]'
```

### Issue: CloudFront shows 403 errors
**Solution**: Verify S3 bucket policy and OAC configuration:
```bash
aws s3api get-bucket-policy --bucket mx5-alignment-365620267529
```

### Issue: GitHub Actions workflow fails with "secrets not found"
**Solution**: Verify GitHub secrets exist:
1. Settings → Secrets and variables → Actions
2. Check `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `CLOUDFRONT_DISTRIBUTION_ID` are present

### Issue: DNS not resolving custom domain
**Solution**: Verify Route53 record created:
```bash
aws route53 list-resource-record-sets --hosted-zone-id Z0003562GQFFYQVGWRWO | jq '.ResourceRecordSets[] | select(.Name=="alignment.marcelrienks.com.")'
```

### Issue: Deployment takes >5 minutes
**Solution**: Normal on first deployment (CloudFront propagation). Subsequent deployments should be 3-5 minutes.

---

## 📞 Support Resources

- **Terraform Docs**: https://registry.terraform.io/providers/hashicorp/aws/latest
- **AWS CloudFront Docs**: https://docs.aws.amazon.com/cloudfront/
- **GitHub Actions Docs**: https://docs.github.com/en/actions
- **Feature Spec**: [spec.md](spec.md)
- **Implementation Plan**: [plan.md](plan.md)
- **Data Model**: [data-model.md](data-model.md)
- **Research**: [research.md](research.md)

