# GitHub Actions Secrets Configuration Guide

This file documents what secrets need to be configured in GitHub to enable CI/CD deployment.

## Required Secrets for Production Deployment

Configure these in: GitHub → Settings → Secrets and variables → Actions

### 1. AWS Credentials (Required)

**Name**: `AWS_ACCESS_KEY_ID`
- **Value**: `AKIA...` (from AWS IAM)
- **From**: AWS Console → IAM → Users → [your-github-ci-user] → Security credentials → Create access key
- **Description**: Access key for IAM user with S3 and CloudFront permissions

**Name**: `AWS_SECRET_ACCESS_KEY`
- **Value**: `wJalr...` (from AWS IAM)
- **From**: AWS Console → IAM → Users → [your-github-ci-user] → Security credentials → Access key secret
- **Description**: Secret access key (keep private!)

### 2. CloudFront Distribution ID (Required after first deploy)

**Name**: `CLOUDFRONT_DISTRIBUTION_ID`
- **Value**: `E1ABC2DEF34GHI` (CloudFront distribution ID)
- **From**: AWS Console → CloudFront → Distributions → your-distribution → ID
- **Description**: CloudFront distribution ID for cache invalidation
- **Note**: Get after first deployment or from Terraform output

### 3. AWS Region (Optional)

**Name**: `AWS_REGION`
- **Value**: `us-east-1` (recommended region)
- **Default**: If not set, workflow defaults to `us-east-1`

### 4. S3 Bucket Name (Optional)

**Name**: `S3_BUCKET_NAME`
- **Value**: `mx5-alignment-prod`
- **Default**: If not set, workflow will prompt or use configured value

### 5. Slack Notifications (Optional)

**Name**: `SLACK_WEBHOOK_URL`
- **Value**: `https://hooks.slack.com/services/YOUR/WEBHOOK/KEY`
- **From**: Slack Workspace → Settings → Incoming webhooks
- **Description**: For deployment success/failure notifications
- **Optional**: Omit if not using Slack

### 6. Terraform Cloud Token (Optional, for remote state)

**Name**: `TF_API_TOKEN`
- **Value**: `xxxx...` (from Terraform Cloud)
- **From**: Terraform Cloud → User Settings → Tokens → Create API token
- **Description**: For storing Terraform state remotely
- **Optional**: Only needed if using remote state

## How to Add Secrets

### Via GitHub Web UI

1. Go to repository → **Settings** tab
2. Left sidebar → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. **Name**: Enter secret name (e.g., `AWS_ACCESS_KEY_ID`)
5. **Secret**: Paste the value
6. Click **Add secret**

### Via GitHub CLI

```bash
# Install GitHub CLI: https://cli.github.com

# Add secret
gh secret set AWS_ACCESS_KEY_ID --body "AKIA..."

# Add multiple secrets
gh secret set AWS_SECRET_ACCESS_KEY --body "wJalr..."
gh secret set CLOUDFRONT_DISTRIBUTION_ID --body "E1ABC2DEF34GHI"
gh secret set AWS_REGION --body "us-east-1"
```

### Via GitHub API

```bash
# Requires jq and gh CLI
gh api repos/marcelrienks/mx5-nc1/actions/secrets \
  -X POST \
  -f name="AWS_ACCESS_KEY_ID" \
  -f value="AKIA..."
```

## Getting the Values

### AWS Access Keys

1. AWS Console → IAM → Users
2. Select user or create new: `github-ci-deploy`
3. **Security credentials** tab
4. **Create access key**
5. Download CSV or copy:
   - Access Key ID → `AWS_ACCESS_KEY_ID`
   - Secret Access Key → `AWS_SECRET_ACCESS_KEY`

### CloudFront Distribution ID

1. AWS Console → CloudFront → Distributions
2. Find your distribution
3. Copy **ID** field (starts with E)
4. Set as `CLOUDFRONT_DISTRIBUTION_ID`

Or via AWS CLI:
```bash
aws cloudfront list-distributions \
  --query "Distributions[?Comment=='mx5-alignment'].Id" \
  --output text
```

Or via AWS CLI:
```bash
aws cloudfront list-distributions \
  --query "DistributionList.Items[0].Id" \
  --output text
```

## Security Best Practices

✅ **DO:**
- Use dedicated IAM user for CI/CD (not personal credentials)
- Rotate access keys every 90 days
- Use minimal IAM permissions (S3 + CloudFront only)
- Keep secrets file out of version control
- Review who has access to secrets (repository collaborators)

❌ **DON'T:**
- Commit `.env` files to Git
- Share secrets in Slack, email, or chat
- Use personal AWS credentials for CI/CD
- Set secrets to hardcoded values in code
- Store secrets in comments or documentation

## Verification

### Test GitHub Actions Access

```bash
# View available secrets (names only, not values)
gh secret list

# Check if GitHub Actions can access AWS
git push origin main  # Trigger workflow
# Watch: GitHub → Actions → Latest run
```

### Test AWS Credentials Locally

```bash
# Load credentials from .env.production
source .env.production

# Test AWS access
aws sts get-caller-identity
# Should return your AWS Account ID and ARN

# Test S3 access
aws s3 ls
# Should list S3 buckets

# Test CloudFront access
aws cloudfront list-distributions
# Should list CloudFront distributions
```

## Troubleshooting

### Issue: "Error: GitHub Actions requires AWS credentials"

**Cause**: Secrets not set or names are incorrect

**Fix**:
1. Verify secret names (exact case): `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`
2. Check GitHub Settings → Secrets → listed (names visible, values hidden)
3. Re-run workflow (GitHub Actions → workflow → Re-run jobs)

### Issue: "Error: Access Denied to S3"

**Cause**: IAM user lacks S3 permissions

**Fix**:
1. AWS Console → IAM → Users → [your-github-ci-user]
2. Add policies:
   - `AmazonS3FullAccess` OR custom policy with `s3:GetObject`, `s3:PutObject`, `s3:ListBucket`
   - `CloudFrontFullAccess` OR custom policy with `cloudfront:CreateInvalidation`
3. Wait 5 minutes for permission propagation
4. Re-run workflow

### Issue: "Error: Invalid access key"

**Cause**: Credentials are wrong or rotated

**Fix**:
1. AWS Console → IAM → Users → [your-github-ci-user]
2. Create new access key
3. Update GitHub Secrets with new values
4. Delete old access key from AWS

### Issue: "Error: aws-actions/configure-aws-credentials requires AWS_ACCESS_KEY_ID"

**Cause**: Environment variable name mismatch

**Fix**:
1. Check GitHub Secrets use exact names:
   - `AWS_ACCESS_KEY_ID` ✅
   - `AWS_SECRET_ACCESS_KEY` ✅
   - (Not `AWS_ACCESS_KEY` or `AWS_SECRET`)
2. Check workflow file uses `secrets.AWS_ACCESS_KEY_ID` syntax
3. See `.github/workflows/deploy.yml` for correct usage

## Next Steps

1. ✅ Create IAM user: `github-ci-deploy` (see AWS Console guide)
2. ✅ Generate access keys (download CSV)
3. ✅ Add secrets to GitHub (follow "How to Add Secrets" section)
4. ✅ Test by pushing to main: `git push origin main`
5. ✅ Watch GitHub Actions tab for results
6. ✅ Verify S3 upload: `aws s3 ls s3://mx5-alignment-prod/`
7. ✅ Check CloudFront: `curl https://d1234abc.cloudfront.net`

---

**Questions?** See `.github/workflows/deploy.yml` for workflow implementation or `docs/DEPLOYMENT.md` for detailed guides.
