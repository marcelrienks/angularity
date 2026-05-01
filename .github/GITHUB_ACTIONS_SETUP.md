# GitHub Actions Deployment Setup Guide

This guide explains how to configure GitHub Actions with the necessary AWS credentials and CloudFront distribution ID for automated deployment to AWS S3 + CloudFront.

## Prerequisites

- GitHub repository access (Settings → Secrets and variables → Actions)
- AWS credentials for `github-actions` IAM user (or root account temporarily)
- CloudFront distribution ID from Terraform output

## Configuration Steps

### Step 1: Create/Verify AWS Credentials

#### Option A: Create dedicated `github-actions` IAM user (RECOMMENDED)

1. **AWS Console** → **IAM** → **Users** → **Create user**
   - Username: `github-actions`
   - Access type: Programmatic access (Access Key + Secret Key)
   - DO NOT add to any groups
   - Click "Create user"

2. **Attach inline policy** to the `github-actions` user:
   - Click on the user → **Add inline policy** → **JSON** tab
   - Paste the following policy:

```json
{
  "Statement": [
    {
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ],
      "Effect": "Allow",
      "Resource": [
        "arn:aws:s3:::mx5-alignment-365620267529",
        "arn:aws:s3:::mx5-alignment-365620267529/*"
      ],
      "Sid": "S3DeploymentAccess"
    },
    {
      "Action": [
        "cloudfront:CreateInvalidation",
        "cloudfront:ListInvalidations",
        "cloudfront:GetInvalidation"
      ],
      "Effect": "Allow",
      "Resource": "arn:aws:cloudfront::365620267529:distribution/E3AFTSKLCPTLIM",
      "Sid": "CloudFrontInvalidation"
    },
    {
      "Action": [
        "cloudfront:GetDistribution",
        "cloudfront:ListDistributions"
      ],
      "Effect": "Allow",
      "Resource": "*",
      "Sid": "CloudFrontRead"
    }
  ],
  "Version": "2012-10-17"
}
```

3. **Create Access Keys** for `github-actions` user:
   - Click on the user → **Security credentials** tab → **Create access key**
   - Select: Access Key - Programmatic access
   - Download CSV with Access Key ID and Secret Access Key
   - Keep these secure! (You'll use them in the next step)

#### Option B: Use root account credentials (TEMPORARY ONLY)

1. **AWS Console** → **IAM** → **Users** → (your root account)
2. **Security credentials** tab → **Access keys** → **Create access key**
3. Download the credentials

⚠️ **WARNING**: Using root account credentials is a security risk. Switch to Option A as soon as possible.

### Step 2: Add GitHub Actions Secrets

1. **GitHub Repository** → **Settings** → **Secrets and variables** → **Actions**
2. Click **New repository secret**

#### Secret 1: AWS_ACCESS_KEY_ID

- **Name**: `AWS_ACCESS_KEY_ID`
- **Value**: (Paste the Access Key ID from the CSV file)
- Click **Add secret**

#### Secret 2: AWS_SECRET_ACCESS_KEY

- **Name**: `AWS_SECRET_ACCESS_KEY`
- **Value**: (Paste the Secret Access Key from the CSV file)
- Click **Add secret**

#### Secret 3: CLOUDFRONT_DISTRIBUTION_ID

- **Name**: `CLOUDFRONT_DISTRIBUTION_ID`
- **Value**: `E3AFTSKLCPTLIM` (CloudFront distribution ID from Terraform output)
- Click **Add secret**

### Step 3: Verify Secrets are Configured

Run the following command to verify secrets are accessible:

```bash
# GitHub UI: Settings → Secrets and variables → Actions
# You should see:
# ✅ AWS_ACCESS_KEY_ID
# ✅ AWS_SECRET_ACCESS_KEY
# ✅ CLOUDFRONT_DISTRIBUTION_ID
```

All three should be visible with a green checkmark.

### Step 4: Test the Deployment Workflow

1. **Trigger a test deployment**:
   ```bash
   # Make a small change and push to main
   echo "# Test deployment $(date)" >> README.md
   git add README.md
   git commit -m "test: trigger github actions deployment"
   git push origin main
   ```

2. **Monitor the workflow**:
   - Go to **GitHub** → **Actions** tab
   - Click **Deploy to AWS S3 + CloudFront** workflow
   - Watch the steps:
     1. ✅ Checkout code
     2. ✅ Setup Node.js
     3. ✅ Install dependencies (`npm install`)
     4. ✅ Run tests (`npm run test:all-sync`)
     5. ✅ Deploy to S3 (`aws s3 sync`)
     6. ✅ Invalidate CloudFront cache
     7. ✅ Deployment complete

3. **Verify deployment**:
   - Check S3 bucket: `aws s3 ls s3://mx5-alignment-365620267529/`
   - Should see site files (index.html, input.html, etc.)

## Troubleshooting

### "CLOUDFRONT_DISTRIBUTION_ID not set"

- The workflow will skip CloudFront invalidation if the secret is not set
- Add the `CLOUDFRONT_DISTRIBUTION_ID` secret and retry

### "S3 access denied" or "CloudFront unauthorized"

- Verify the IAM policy was attached correctly to the `github-actions` user
- Check the policy has the correct S3 bucket name and CloudFront distribution ID
- Verify the Access Key ID and Secret Access Key are correct in GitHub secrets

### "Tests failed, deployment skipped"

- The workflow only deploys if tests pass (`if: success()`)
- Run `npm run test:all-sync` locally to debug test failures
- Fix tests and push again

### "CloudFront invalidation failed"

- Verify the CLOUDFRONT_DISTRIBUTION_ID is correct (should be `E3AFTSKLCPTLIM`)
- Check the distribution still exists: `aws cloudfront get-distribution --id E3AFTSKLCPTLIM`
- Verify the IAM policy includes `cloudfront:CreateInvalidation` permission

## Secrets Reference

| Secret Name | Value | Source |
|---|---|---|
| `AWS_ACCESS_KEY_ID` | `AKIA...` | AWS IAM Access Key |
| `AWS_SECRET_ACCESS_KEY` | `wJal...` | AWS IAM Secret Key |
| `CLOUDFRONT_DISTRIBUTION_ID` | `E3AFTSKLCPTLIM` | Terraform output |

## Security Best Practices

✅ **Do**:
- Use a dedicated `github-actions` IAM user (not root account)
- Scope the IAM policy to only S3 and CloudFront permissions needed
- Rotate access keys every 90 days
- Review GitHub Actions logs for any exposed secrets

❌ **Don't**:
- Hardcode AWS credentials in workflow files
- Use root account credentials for CI/CD
- Commit `.env` files or credentials to git
- Log secrets in workflow output (`echo` commands removed from deploy.yml)

## Next Steps

After completing this setup:

1. **Test the deployment** (Step 4 above)
2. **Verify the site is live**: `https://dxfocr58kmlsu.cloudfront.net` (CloudFront domain)
3. **Verify custom domain** (when ACM certificate is manually validated): `https://alignment.marcelrienks.com`
4. **Monitor CloudFront** for cache invalidation completion

## Additional Resources

- [GitHub Actions Secrets Documentation](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- [AWS IAM Best Practices](https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html)
- [Terraform AWS Provider - CloudFront](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudfront_distribution)
