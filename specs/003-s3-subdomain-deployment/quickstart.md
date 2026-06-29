# Quickstart: Validate S3 Subdomain Deployment

**Date**: 2026-06-29 | **Feature**: S3 Subdomain Deployment | **Purpose**: End-to-end validation guide

This guide validates that the CloudFormation deployment works correctly and the application functions in production.

## Prerequisites

- AWS CLI v2 installed and configured with credentials for your AWS account
- AWS account with permissions to create S3, CloudFront, Route53, and CloudFormation resources
- ACM wildcard certificate created and ISSUED (not PENDING_VALIDATION)
- Route53 hosted zone for your domain (e.g., example.com)
- `site/` directory populated with app files (index.html, input.html, report.html, css/, js/)

## Setup Phase: Gather Configuration

Before deploying, collect the following values:

```bash
# 1. Get your AWS account ID
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
echo "AWS Account ID: $AWS_ACCOUNT_ID"

# 2. Get your Route53 hosted zone ID
ZONE_ID=$(aws route53 list-hosted-zones --query 'HostedZones[0].Id' --output text | cut -d'/' -f3)
echo "Hosted Zone ID: $ZONE_ID"

# 3. Find your ACM wildcard certificate ARN
CERT_ARN=$(aws acm list-certificates --region us-east-1 --query 'CertificateSummaryList[0].CertificateArn' --output text)
echo "Certificate ARN: $CERT_ARN"

# 4. Define your domain and subdomain
PARENT_DOMAIN="example.com"  # Replace with your domain
SUBDOMAIN="alignment"        # Replace with desired subdomain
ENVIRONMENT="production"     # or "staging"
```

## Phase 1: Validate CloudFormation Template

### 1.1 Syntax Validation

Validate the CloudFormation template before deployment:

```bash
aws cloudformation validate-template \
  --template-body file://cloudformation/template.yaml
```

**Expected Output**: No errors. CloudFormation returns template metadata (Parameters, Outputs, etc.).

**If failed**: Check template YAML syntax. Run `yamllint cloudformation/template.yaml` for details.

### 1.2 Prepare Parameters File

Create a parameters file for your deployment:

```bash
cat > cloudformation/parameters.json <<EOF
[
  {
    "ParameterKey": "HostedZoneId",
    "ParameterValue": "$ZONE_ID"
  },
  {
    "ParameterKey": "SubdomainName",
    "ParameterValue": "$SUBDOMAIN"
  },
  {
    "ParameterKey": "ParentDomainName",
    "ParameterValue": "$PARENT_DOMAIN"
  },
  {
    "ParameterKey": "CertificateArn",
    "ParameterValue": "$CERT_ARN"
  },
  {
    "ParameterKey": "Environment",
    "ParameterValue": "$ENVIRONMENT"
  }
]
EOF

echo "Parameters file created at cloudformation/parameters.json"
```

## Phase 2: Deploy CloudFormation Stack

### 2.1 Create Stack

Deploy the CloudFormation stack:

```bash
STACK_NAME="angularity-s3-deployment-${SUBDOMAIN}"

aws cloudformation create-stack \
  --stack-name "$STACK_NAME" \
  --template-body file://cloudformation/template.yaml \
  --parameters file://cloudformation/parameters.json \
  --region us-east-1

echo "Stack creation initiated: $STACK_NAME"
```

**Expected Output**: StackId (e.g., arn:aws:cloudformation:us-east-1:123456789012:stack/...)

### 2.2 Monitor Stack Creation

Watch stack creation progress:

```bash
aws cloudformation wait stack-create-complete \
  --stack-name "$STACK_NAME" \
  --region us-east-1

echo "Stack creation completed!"
```

**Expected duration**: 5-10 minutes

**If timeout or error**: Check stack events for failure reason:
```bash
aws cloudformation describe-stack-events \
  --stack-name "$STACK_NAME" \
  --region us-east-1 | jq '.StackEvents[] | {Timestamp, LogicalResourceId, ResourceStatus, ResourceStatusReason}'
```

### 2.3 Retrieve Stack Outputs

Get CloudFormation outputs:

```bash
aws cloudformation describe-stacks \
  --stack-name "$STACK_NAME" \
  --region us-east-1 \
  --query 'Stacks[0].Outputs' | jq .
```

**Expected Outputs**:
- `AppBucketName`: S3 bucket for app files
- `CloudFrontDomainName`: CloudFront distribution domain (d123abc.cloudfront.net)
- `DistributionId`: CloudFront distribution ID (for invalidation)
- `DeployedUrl`: Final FQDN (alignment.example.com)

**Save these values for next steps**:
```bash
APP_BUCKET=$(aws cloudformation describe-stacks --stack-name "$STACK_NAME" \
  --region us-east-1 --query 'Stacks[0].Outputs[?OutputKey==`AppBucketName`].OutputValue' --output text)
CF_DOMAIN=$(aws cloudformation describe-stacks --stack-name "$STACK_NAME" \
  --region us-east-1 --query 'Stacks[0].Outputs[?OutputKey==`CloudFrontDomainName`].OutputValue' --output text)
DIST_ID=$(aws cloudformation describe-stacks --stack-name "$STACK_NAME" \
  --region us-east-1 --query 'Stacks[0].Outputs[?OutputKey==`DistributionId`].OutputValue' --output text)
DEPLOYED_URL=$(aws cloudformation describe-stacks --stack-name "$STACK_NAME" \
  --region us-east-1 --query 'Stacks[0].Outputs[?OutputKey==`DeployedUrl`].OutputValue' --output text)

echo "Bucket: $APP_BUCKET"
echo "CloudFront: $CF_DOMAIN"
echo "Distribution ID: $DIST_ID"
echo "App URL: $DEPLOYED_URL"
```

## Phase 3: Deploy Application Files

### 3.1 Upload Site Files to S3

Copy app files to S3 bucket:

```bash
aws s3 sync site/ s3://$APP_BUCKET/ --delete

echo "Files uploaded to $APP_BUCKET"
```

**Verify upload**:
```bash
aws s3 ls s3://$APP_BUCKET/ --recursive
```

Expected: index.html, input.html, report.html, css/shared.css, js/* files listed.

### 3.2 Invalidate CloudFront Cache

Invalidate CloudFront to serve fresh files:

```bash
aws cloudfront create-invalidation \
  --distribution-id "$DIST_ID" \
  --paths "/*"

echo "CloudFront cache invalidated"
```

## Phase 4: Validate Application Functionality

### 4.1 Test via CloudFront Domain (Temporary)

Test via CloudFront domain before DNS propagates:

```bash
curl -s https://$CF_DOMAIN/index.html | head -20
```

Expected: HTML content starts with `<!DOCTYPE html>` or `<html>`.

### 4.2 Test via Subdomain (After DNS Propagation)

Wait 5-10 minutes for DNS to propagate, then test:

```bash
curl -s https://$DEPLOYED_URL/index.html | head -20
```

Expected: Same HTML content as CloudFront domain.

### 4.3 Automated App Functionality Test

Run Puppeteer test to verify app logic works in production:

```bash
npm run test:cloudformation-deploy
```

**Test Scenarios**:
1. Load index.html → verify page renders, CSS loads, buttons visible
2. Navigate to input.html → verify measurement grid appears
3. Enter test measurement data → verify data persists in localStorage
4. Navigate to report.html → verify calculations run, no server calls made
5. Check Network tab → verify zero API calls to external services

**Expected Result**: All scenarios pass. Network tab shows only CloudFront (GET requests), no POST/PUT to backend.

### 4.4 Verify Data Privacy (No Server Calls)

Inspect browser network traffic:

```bash
# Start Puppeteer test with network logging
npm run test:cloudformation-deploy -- --log-network
```

**Verify**:
- No POST/PUT requests to any backend
- No external API calls
- All data stays in browser (localStorage only)
- CloudFront serves static files only (no server-side code execution)

## Phase 5: Stack Updates (Optional Testing)

### 5.1 Test Stack Update

Update CloudFormation stack with modified template (e.g., cache behavior change):

```bash
aws cloudformation update-stack \
  --stack-name "$STACK_NAME" \
  --template-body file://cloudformation/template.yaml \
  --parameters file://cloudformation/parameters.json \
  --region us-east-1

aws cloudformation wait stack-update-complete \
  --stack-name "$STACK_NAME" \
  --region us-east-1

echo "Stack update completed!"
```

**Expected**: Update completes in 2-5 minutes without downtime.

### 5.2 Deploy New App Version

Update app in S3 and invalidate CloudFront:

```bash
aws s3 sync site/ s3://$APP_BUCKET/ --delete
aws cloudfront create-invalidation --distribution-id "$DIST_ID" --paths "/*"
```

**Verify**: New version accessible within 30 seconds at `https://$DEPLOYED_URL`.

## Phase 6: Cleanup (Tear Down)

### 6.1 Empty S3 Bucket

CloudFormation requires bucket to be empty before deletion:

```bash
aws s3 rm s3://$APP_BUCKET --recursive
```

### 6.2 Delete Stack

```bash
aws cloudformation delete-stack \
  --stack-name "$STACK_NAME" \
  --region us-east-1

aws cloudformation wait stack-delete-complete \
  --stack-name "$STACK_NAME" \
  --region us-east-1

echo "Stack deleted!"
```

**Verify**: All AWS resources (S3, CloudFront, Route53 record) deleted.

```bash
aws s3 ls | grep $APP_BUCKET  # Should not exist
aws cloudfront list-distributions --query 'DistributionList.Items[0].DomainName'  # Should not include our domain
aws route53 list-resource-record-sets --hosted-zone-id "$ZONE_ID" | grep "$SUBDOMAIN"  # Should not exist
```

---

## Success Criteria Checklist

- [ ] CloudFormation template validates without errors
- [ ] Stack creation completes in <10 minutes
- [ ] S3 bucket created and populated with app files
- [ ] CloudFront distribution active and caching
- [ ] Route53 alias record created and resolves to CloudFront
- [ ] App loads at subdomain URL (https://alignment.example.com)
- [ ] Page load time <2 seconds
- [ ] HTTPS works with valid certificate (no browser warnings)
- [ ] App functionality tests pass (all scenarios)
- [ ] Network inspection shows zero backend API calls
- [ ] Data persists in localStorage, not sent to server
- [ ] Stack update completes without downtime
- [ ] Stack deletion removes all resources cleanly
- [ ] Can redeploy stack with same template without errors

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Certificate validation fails | Check cert is ISSUED and covers `*.{parent-domain}`. Verify ARN format. |
| Route53 zone not found | Verify HostedZoneId is correct; try `aws route53 list-hosted-zones`. |
| CloudFront slow/404 | Wait 5min for propagation. Check S3 bucket has files via `aws s3 ls s3://$APP_BUCKET`. |
| DNS not resolving | Check Route53 alias record created; DNS propagation takes 5-10 min. Use `nslookup` to verify. |
| App shows stale version | Invalidate CloudFront: `aws cloudfront create-invalidation --distribution-id $DIST_ID --paths "/*"`. |
| Stack creation fails | Check CloudFormation events: `aws cloudformation describe-stack-events --stack-name $STACK_NAME`. |
