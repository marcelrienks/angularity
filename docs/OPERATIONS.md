# MX5 Alignment Tool - Operations Runbook

**Version**: 1.0.0  
**Last Updated**: April 12, 2026  
**Environment**: Production (AWS S3 + CloudFront)  

This runbook provides step-by-step procedures for operating the MX5 alignment tool in production.

---

## 📋 Table of Contents

1. [Quick Reference](#quick-reference)
2. [Daily Operations](#daily-operations)
3. [Deployment Procedures](#deployment-procedures)
4. [Monitoring & Alerts](#monitoring--alerts)
5. [Troubleshooting](#troubleshooting)
6. [Incident Response](#incident-response)
7. [Maintenance & Backups](#maintenance--backups)
8. [Rollback & Recovery](#rollback--recovery)

---

## Quick Reference

### Critical Contacts

- **On-call**: [Your team name]
- **Escalation**: [Manager/Lead]
- **AWS Support**: [Account alias]

### System Endpoints

- **Production**: `https://d1234abc.cloudfront.net` or `https://alignment.example.com`
- **Monitoring Dashboard**: AWS CloudWatch → `mx5-alignment-dashboard`

### Key AWS Resources

| Resource | Name | Location |
|----------|------|----------|
| S3 Bucket | `mx5-alignment-prod` | AWS → S3 |
| CloudFront | `E1ABC2DEF34GHI` | AWS → CloudFront |
| SNS Alerts | `mx5-alignment-alerts` | AWS → SNS |
| CloudWatch | `mx5-alignment-dashboard` | AWS → CloudWatch |

### Common Commands

```bash
# Check deployment status
aws cloudfront get-distribution --id E1ABC2DEF34GHI --query 'Distribution.Status'

# View recent deployments
git log --oneline -10

# Monitor S3 uploads
aws s3 ls s3://mx5-alignment-prod/ --recursive

# Tail error logs
aws logs tail /aws/cloudfront/mx5-alignment-prod --follow

# Invalidate cache (emergency)
aws cloudfront create-invalidation --distribution-id E1ABC2DEF34GHI --paths "/*"
```

---

## Daily Operations

### 1. Health Check

**Frequency**: Daily (start of shift)  
**Time**: < 5 minutes

```bash
#!/bin/bash

echo "🔍 Running health check..."

# 1. Site accessibility
echo "  Testing site accessibility..."
STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://d1234abc.cloudfront.net)
if [ "$STATUS" = "200" ]; then
  echo "  ✓ Site accessible (HTTP 200)"
else
  echo "  ✗ Site returned HTTP $STATUS - INVESTIGATE"
fi

# 2. CloudFront status
echo "  Checking CloudFront distribution..."
DIST_STATUS=$(aws cloudfront get-distribution --id E1ABC2DEF34GHI --query 'Distribution.Status' --output text)
if [ "$DIST_STATUS" = "Enabled" ]; then
  echo "  ✓ Distribution enabled"
else
  echo "  ✗ Distribution status: $DIST_STATUS - INVESTIGATE"
fi

# 3. S3 bucket
echo "  Checking S3 bucket..."
aws s3 ls s3://mx5-alignment-prod/index.html && echo "  ✓ S3 bucket accessible" || echo "  ✗ S3 bucket inaccessible"

# 4. Cache hit ratio
echo "  Checking cache performance..."
CACHE_HIT=$(aws cloudfront get-distribution-statistics --distribution-id E1ABC2DEF34GHI --query 'Statistics.CacheHitRatio' --output text 2>/dev/null)
if [ ! -z "$CACHE_HIT" ]; then
  echo "  ✓ Cache hit ratio: ${CACHE_HIT}%"
else
  echo "  ℹ Cache metrics not yet available"
fi

echo ""
echo "Health check complete!"
```

### 2. Error Monitoring

**Frequency**: Every 4 hours (or on-demand)  
**Time**: < 10 minutes

```bash
# Check for error spikes
aws logs filter-log-events \
  --log-group-name "/aws/cloudfront/mx5-alignment-prod" \
  --filter-pattern "ERROR" \
  --max-items 100

# View CloudWatch metrics
aws cloudwatch get-metric-statistics \
  --namespace AWS/CloudFront \
  --metric-name 4xxErrorRate \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Average
```

### 3. Cost Monitoring

**Frequency**: Weekly  
**Time**: < 5 minutes

```bash
# Estimate monthly costs
echo "Estimating CloudFront costs..."
aws ce get-cost-and-usage \
  --time-period Start=$(date -d '30 days ago' +%Y-%m-%d),End=$(date +%Y-%m-%d) \
  --granularity MONTHLY \
  --metrics BlendedCost \
  --group-by Type=DIMENSION,Key=SERVICE
```

---

## Deployment Procedures

### 1. Standard Deployment (via GitHub Actions)

**Prerequisites**:
- All tests passing
- Code reviewed and merged to main
- No active incidents

**Procedure**:

```bash
# 1. Ensure on main branch
git checkout main
git pull origin main

# 2. Run validation
npm run validate-deployment

# 3. Test locally
npm run test:all-sync

# 4. Deploy (GitHub Actions will handle)
git push origin main
# OR commit and push if changes were made

# 5. Monitor deployment
# - Go to GitHub → Actions tab
# - Watch workflow run
# - Verify S3 upload and CloudFront invalidation

# 6. Verify production
curl https://d1234abc.cloudfront.net/
curl https://d1234abc.cloudfront.net/input.html
curl https://d1234abc.cloudfront.net/report.html

# 7. Final validation
npm run test:all-sync  # Or manual smoke test in browser
```

**Duration**: 5-10 minutes  
**Rollback Time if Needed**: 2 minutes

### 2. Manual Deployment (Local/Direct)

**Use when**:
- GitHub Actions is unavailable
- Emergency hotfix needed
- Testing staging environment

**Procedure**:

```bash
# 1. Load production credentials
source .env.production

# 2. Validate environment
npm run validate-deployment prod

# 3. Run tests
npm run test:all-sync

# 4. Deploy
npm run deploy

# 5. Monitor CloudFront invalidation
aws cloudfront get-invalidation \
  --distribution-id $CLOUDFRONT_DISTRIBUTION_ID \
  --id [invalidation-id-from-deploy-output]

# 6. Verify deployment
curl https://d1234abc.cloudfront.net
```

### 3. Staged Rollout (If Needed)

For major changes, deploy to staging first:

```bash
# 1. Deploy to staging
source .env.staging
npm run deploy

# 2. Test on staging
curl https://staging-alignment.example.com

# 3. If OK, deploy to production
source .env.production
npm run deploy

# 4. Verify both environments
curl https://d1234abc.cloudfront.net
```

---

## Monitoring & Alerts

### CloudWatch Dashboard

**Location**: AWS Console → CloudWatch → Dashboards → `mx5-alignment-dashboard`

**Metrics Displayed**:
- CloudFront requests (total)
- Cache hit ratio (%)
- 4xx error rate (%)
- 5xx error rate (%)
- Bytes downloaded
- S3 object count

**Action if Alert Triggered**:
1. Check metric value
2. Assess if threshold was crossed consistently (not spike)
3. Compare with historical baseline
4. Investigate root cause if elevated

### SNS Alerts

**Alarms Configured**:
- `mx5-alignment-4xx-error-rate-high`: 4xx errors > 5%
- `mx5-alignment-5xx-error-rate-high`: 5xx errors > 1%
- `mx5-alignment-cache-hit-rate-low`: Cache hit < 70%

**When Alert Fires**:
1. **Email notification** sent to configured address
2. **Check dashboard** for details
3. **Investigate** root cause:
   - Check S3 bucket policy
   - Verify CloudFront configuration
   - Review error logs
4. **Take action** based on findings

### Manual Alert Checking

```bash
# Get all alarms
aws cloudwatch describe-alarms

# Get specific alarm state
aws cloudwatch describe-alarms --alarm-names mx5-alignment-4xx-error-rate-high

# Get metric data
aws cloudwatch get-metric-statistics \
  --namespace AWS/CloudFront \
  --metric-name 4xxErrorRate \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Average,Maximum
```

---

## Troubleshooting

### Issue: Site Returns 403 Forbidden

**Symptoms**:
- `curl` returns HTTP 403
- "Access Denied" in browser

**Investigation**:
```bash
# 1. Check S3 bucket policy
aws s3api get-bucket-policy --bucket mx5-alignment-prod

# 2. Verify CloudFront OAC
aws cloudfront get-origin-access-control --id [oac-id]

# 3. Check if origin is correct
aws cloudfront get-distribution --id E1ABC2DEF34GHI | grep -i origin
```

**Resolution**:
- S3 bucket policy must allow CloudFront origin access control
- See infrastructure/security.tf for correct policy
- Re-apply: `cd infrastructure && terraform apply`

### Issue: Stale Content (Old Version Still Showing)

**Symptoms**:
- CSS/JS changes not showing
- Old HTML content served

**Investigation**:
```bash
# Check cache headers
curl -I https://d1234abc.cloudfront.net/index.html

# Check CloudFront cache policy
aws cloudfront get-distribution --id E1ABC2DEF34GHI | grep -i cache
```

**Resolution**:
```bash
# Manually invalidate cache
aws cloudfront create-invalidation \
  --distribution-id E1ABC2DEF34GHI \
  --paths "/*"

# Wait for invalidation to complete (~5 minutes)
aws cloudfront get-invalidation \
  --distribution-id E1ABC2DEF34GHI \
  --id [invalidation-id]
```

### Issue: High Error Rate (4xx or 5xx)

**Symptoms**:
- CloudWatch alarm firing
- Users reporting errors

**Investigation**:
```bash
# Check error logs
aws logs filter-log-events \
  --log-group-name "/aws/cloudfront/mx5-alignment-prod" \
  --filter-pattern "ERROR" \
  --start-time $(date -d '1 hour ago' +%s)000 \
  --end-time $(date +%s)000

# Get error statistics
aws cloudwatch get-metric-statistics \
  --namespace AWS/CloudFront \
  --metric-name 4xxErrorRate \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 60 \
  --statistics Average,Maximum
```

**Resolution** (depends on error type):
- **4xx errors** (client error): Check request from client, verify file exists
- **5xx errors** (server error): Rare with static S3 content, check S3 services

### Issue: Slow Performance / High Latency

**Symptoms**:
- Site loads slowly
- Cache hit ratio below 70%

**Investigation**:
```bash
# Check cache hit ratio
aws cloudfront get-distribution-statistics \
  --distribution-id E1ABC2DEF34GHI

# Measure load time
time curl https://d1234abc.cloudfront.net/index.html > /dev/null
```

**Resolution**:
- Low cache hit: Check cache policy TTL (should be 3600+ seconds)
- Increase CloudFront PriceClass if using limited edge locations
- Enable compression in CloudFront (should already be on)
- Minify CSS/JS files

---

## Incident Response

### Severity Levels

| Level | Description | Response Time | Example |
|-------|-------------|---|---------|
| Critical | Service down, > 50% users affected | 15 min | Site returns 500 errors |
| High | Major feature broken, > 10% users | 30 min | Input page not responsive |
| Medium | Feature partially broken, < 10% | 1-2 hours | Single wheel broken |
| Low | Minor issue, no user impact | Next day | Typo in documentation |

### Incident Checklist

**On Alert** (within 5 minutes):
- [ ] Acknowledge alert in SNS/Slack
- [ ] Verify issue is real (manual test)
- [ ] Note time incident started
- [ ] Check CloudWatch dashboard

**Initial Investigation** (within 15 minutes):
- [ ] Determine severity level
- [ ] Identify affected components
- [ ] Check recent deployments
- [ ] Review error logs

**Mitigation** (within 30 minutes):
- [ ] For code issues: Rollback to last known good version
- [ ] For AWS issues: Check service health, reapply Terraform
- [ ] For performance: Invalidate CloudFront cache
- [ ] Communicate status to stakeholders

**Resolution & Post-Incident**:
- [ ] Document root cause
- [ ] Create action items to prevent recurrence
- [ ] Update runbook if procedure was unclear
- [ ] Schedule retrospective if critical incident

### Rollback Procedure

If deployment causes issues:

```bash
# 1. Identify last good commit
git log --oneline -10

# 2. Revert to previous version
git revert HEAD
git push origin main

# GitHub Actions will automatically deploy this revert

# 3. Verify rollback
curl https://d1234abc.cloudfront.net

# 4. If stuck, manual rollback
source .env.production

# Get S3 history (if versioning enabled)
aws s3api list-object-versions --bucket mx5-alignment-prod

# Copy previous version to current
aws s3 cp s3://mx5-alignment-prod/index.html?versionId=xxx s3://mx5-alignment-prod/index.html

# Invalidate cache
aws cloudfront create-invalidation --distribution-id E1ABC2DEF34GHI --paths "/*"
```

---

## Maintenance & Backups

### Weekly Maintenance

- Review CloudWatch dashboard
- Check S3 bucket size and costs
- Verify no orphaned resources
- Test disaster recovery plan

### Monthly Maintenance

- Rotate AWS credentials (if using long-lived keys)
- Review and update this runbook
- Test rollback procedure
- Analyze cost trends

### Quarterly Maintenance

- Security audit (update S3, CloudFront policies)
- Performance review (cache hit ratio, latency)
- Dependency updates (npm packages)
- Capacity planning

### Backup Strategy

**File Backups**:
- S3 versioning enabled (keeps last 30 days)
- GitHub repository is permanent backup
- .env files: **NOT** backed up (see `.env.README` for setup instructions)

**Data Backups**:
- No persistent data (all localStorage in browser)
- CSV exports are user responsibility
- No database to back up

**Terraform State Backups**:
- Local: Kept in `.git` history
- Remote (recommended): S3 with versioning + DynamoDB locks

---

## Rollback & Recovery

### Full Site Restore

If entire site needs to be restored:

```bash
# 1. Ensure infrastructure exists
cd infrastructure
terraform apply

# 2. Sync latest files to S3
cd ..
apt install awscli  # or brew install awscli
source .env.production
npm run deploy

# 3. Invalidate CloudFront
aws cloudfront create-invalidation --distribution-id E1ABC2DEF34GHI --paths "/*"

# 4. Verify
curl https://d1234abc.cloudfront.net
```

### Database/State Recovery

**Not applicable** - this system has no database.

### Access Recovery (Lost Credentials)

```bash
# 1. If AWS credentials lost: Create new IAM user with S3 + CloudFront permissions
# 2. If GitHub secrets lost: Go to Settings → Secrets → Re-add values
# 3. If S3 access lost: Check bucket policy and OAC configuration
# 4. If CloudFront lost: Recreate via Terraform: terraform apply
```

---

## Contact & Escalation

- **Team Lead**: [Name, phone, email]
- **On-call Rotation**: [Link to schedule]
- **AWS Support**: [Account alias, contact]
- **Slack Channel**: #mx5-alignment-ops
- **Status Page**: [Internal/external status URL]

---

## Useful Links

- [AWS CloudFront Console](https://console.aws.amazon.com/cloudfront)
- [AWS S3 Console](https://console.aws.amazon.com/s3)
- [CloudWatch Monitoring](https://console.aws.amazon.com/cloudwatch)
- [GitHub Actions](https://github.com/marcelrienks/mx5-nc1/actions)
- [Terraform Documentation](https://terraform.io/docs)
- [Project DEPLOYMENT Guide](docs/DEPLOYMENT.md)

---

**Last Updated**: April 12, 2026  
**Status**: Production  
**Maintainer**: [Your name]
