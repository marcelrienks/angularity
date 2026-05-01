# ⚠️ GitHub Actions Setup - REQUIRED MANUAL STEPS

**Status**: Workflow file is in place and will trigger on push to main, but **WILL FAIL** without secrets configured.

---

## What's Working ✅

- [x] Workflow file at `.github/workflows/deploy.yml` 
- [x] Triggers on: push to main branch
- [x] Tests run: `npm run test:all-sync`
- [x] Infrastructure provisioned: S3, CloudFront, IAM
- [x] Manual deployment works: `aws s3 sync` + `aws cloudfront create-invalidation`

## What's NOT Working ❌

- [ ] GitHub Actions secrets are NOT configured
- [ ] Without secrets, workflow will FAIL (can't authenticate to AWS)
- [ ] No workflow runs show in GitHub Actions tab yet

---

## ACTION REQUIRED: Add GitHub Secrets (Manual Step in GitHub UI)

### Step 1: Generate AWS Access Keys

**Option A: Create dedicated IAM user** (RECOMMENDED)

```bash
AWS Console:
1. IAM → Users → Create user: "github-actions"
2. Security credentials → Create access key
3. Download CSV with Access Key ID and Secret Access Key
```

**Option B: Use existing AWS credentials**

```bash
AWS Console:
1. Your AWS account → Security credentials
2. Access keys → Create access key
3. Download the credentials
```

### Step 2: Add Secrets to GitHub Repository

```
GitHub Repository:
1. Go to: Settings → Secrets and variables → Actions
2. Click: "New repository secret"

Add these 3 secrets:
```

#### Secret 1: `AWS_ACCESS_KEY_ID`
```
Name:  AWS_ACCESS_KEY_ID
Value: AKIA... (from AWS CSV)
```

#### Secret 2: `AWS_SECRET_ACCESS_KEY`
```
Name:  AWS_SECRET_ACCESS_KEY
Value: wJal... (from AWS CSV)
```

#### Secret 3: `CLOUDFRONT_DISTRIBUTION_ID`
```
Name:  CLOUDFRONT_DISTRIBUTION_ID
Value: E3AFTSKLCPTLIM
```

### Step 3: Verify Secrets Are Configured

GitHub → Settings → Secrets and variables → Actions

You should see all 3 secrets listed with green checkmarks:
```
✅ AWS_ACCESS_KEY_ID
✅ AWS_SECRET_ACCESS_KEY
✅ CLOUDFRONT_DISTRIBUTION_ID
```

---

## After Secrets Are Configured

Once you add the 3 secrets above:

1. **Push to main** (or any commit):
   ```bash
   git push origin main
   ```

2. **Check GitHub Actions tab**:
   - GitHub repository → Actions tab
   - You should see "Deploy to AWS S3 + CloudFront" workflow running
   - Status: Tests running → Deploy → Cache invalidation

3. **Watch the workflow**:
   - Click the latest workflow run
   - Watch live logs as tests run and deployment happens
   - Should complete in 5-10 minutes

---

## Expected Workflow Steps

When secrets are configured and workflow runs:

```
✓ Checkout code
✓ Setup Node.js 18
✓ Install dependencies (npm install)
✓ Run integration tests (npm run test:all-sync)
  └─ If tests FAIL: Deployment is skipped
  └─ If tests PASS: Deployment proceeds
✓ Configure AWS credentials
✓ Deploy to S3 (aws s3 sync)
✓ Invalidate CloudFront cache
✓ Deployment complete
```

---

## If Workflow Fails

### "AWS_ACCESS_KEY_ID not set"

→ Secret not added to GitHub  
→ Go to Settings → Secrets and variables → Actions  
→ Add the missing secret

### "Tests failed"

→ Run locally first: `npm run test:all-sync`  
→ Fix test failures  
→ Push again

### "CloudFront invalidation failed"

→ Verify CLOUDFRONT_DISTRIBUTION_ID is correct (E3AFTSKLCPTLIM)  
→ Check distribution exists: `aws cloudfront get-distribution --id E3AFTSKLCPTLIM`

---

## Summary

**What you need to do**:
1. Add 3 secrets to GitHub (Settings → Secrets and variables → Actions)
2. Push code to main (or any branch)
3. Check GitHub Actions tab to watch workflow run

**Time required**: 5 minutes to add secrets, then automated deployment on every push.

**Current status**:
- ✅ Workflow file ready (`.github/workflows/deploy.yml`)
- ✅ Infrastructure deployed (S3, CloudFront, IAM)
- ✅ Manual deployment works
- ❌ Automated workflow needs secrets to be configured

---

## Quick Checklist

- [ ] Generate AWS access keys (IAM console)
- [ ] Add AWS_ACCESS_KEY_ID to GitHub Secrets
- [ ] Add AWS_SECRET_ACCESS_KEY to GitHub Secrets
- [ ] Add CLOUDFRONT_DISTRIBUTION_ID (E3AFTSKLCPTLIM) to GitHub Secrets
- [ ] Push to main branch
- [ ] Check GitHub Actions tab for workflow run
- [ ] Verify deployment in Actions logs
- [ ] (Optional) Check site is updated at https://dxfocr58kmlsu.cloudfront.net/

---

**Once secrets are added, all future pushes to main will automatically:**
1. Run tests
2. Deploy to S3
3. Invalidate CloudFront cache
4. Site updates live (2-3 minutes)

This is the last manual step needed before fully automated deployments work.
