# CloudFormation Deployment: S3 Subdomain

AWS infrastructure-as-code for deploying Angularity application to S3 bucket with CloudFront CDN and Route53 DNS on a subdomain of existing domain.

## Quick Start

1. **Prerequisites**:
   - AWS account with permissions for S3, CloudFront, Route53, CloudFormation
   - ACM wildcard certificate provisioned and ISSUED
   - Route53 hosted zone for your domain

2. **Deploy**:
   ```bash
   # Gather configuration values
   ZONE_ID=$(aws route53 list-hosted-zones --query 'HostedZones[0].Id' --output text | cut -d'/' -f3)
   CERT_ARN=$(aws acm list-certificates --region us-east-1 --query 'CertificateSummaryList[0].CertificateArn' --output text)

   # Create stack
   aws cloudformation create-stack \
     --stack-name angularity-s3-deployment \
     --template-body file://template.yaml \
     --parameters \
       ParameterKey=HostedZoneId,ParameterValue=$ZONE_ID \
       ParameterKey=SubdomainName,ParameterValue=alignment \
       ParameterKey=ParentDomainName,ParameterValue=example.com \
       ParameterKey=CertificateArn,ParameterValue=$CERT_ARN

   # Wait for completion
   aws cloudformation wait stack-create-complete --stack-name angularity-s3-deployment

   # Get outputs
   aws cloudformation describe-stacks --stack-name angularity-s3-deployment --query 'Stacks[0].Outputs'
   ```

3. **Upload app files**:
   ```bash
   BUCKET=$(aws cloudformation describe-stacks --stack-name angularity-s3-deployment \
     --query 'Stacks[0].Outputs[?OutputKey==`AppBucketName`].OutputValue' --output text)
   aws s3 sync site/ s3://$BUCKET/ --delete
   ```

4. **Verify**:
   - Visit app URL from outputs (e.g., alignment.example.com)
   - Verify page loads, no 404 errors
   - Check browser DevTools Network tab: only CloudFront requests, no API calls

## Documentation

- **Architecture**: See [data-model.md](../specs/003-s3-subdomain-deployment/data-model.md)
- **Design Decisions**: See [research.md](../specs/003-s3-subdomain-deployment/research.md)
- **Validation Guide**: See [quickstart.md](../specs/003-s3-subdomain-deployment/quickstart.md)

## Files

- `template.yaml` — CloudFormation template (S3, CloudFront, Route53)
- `parameters.json` — Parameter values for deployment
- `deploy.sh` — Bash script for stack creation
- `invalidate-cache.sh` — CloudFront cache invalidation helper
- `cleanup-bucket.sh` — S3 bucket cleanup before stack deletion

## Structure

```
cloudformation/
├── README.md (this file)
├── template.yaml (CloudFormation template)
├── parameters.json (parameters file)
├── deploy.sh (deployment script)
├── invalidate-cache.sh (cache invalidation)
└── cleanup-bucket.sh (bucket cleanup)
```

## Troubleshooting

See [quickstart.md troubleshooting section](../specs/003-s3-subdomain-deployment/quickstart.md#troubleshooting).

## Updating Deployment

### Redeploy New App Version

1. **Update app files in `site/` directory**

2. **Sync to S3**:
   ```bash
   BUCKET=$(aws cloudformation describe-stacks \
     --stack-name angularity-s3-deployment \
     --query 'Stacks[0].Outputs[?OutputKey==`AppBucketName`].OutputValue' --output text)
   
   aws s3 sync site/ s3://$BUCKET/ --delete
   ```

3. **Invalidate CloudFront cache**:
   ```bash
   DIST_ID=$(aws cloudformation describe-stacks \
     --stack-name angularity-s3-deployment \
     --query 'Stacks[0].Outputs[?OutputKey==`DistributionId`].OutputValue' --output text)
   
   bash cloudformation/invalidate-cache.sh $DIST_ID "/*"
   ```

4. **Verify**:
   - Changes visible within ~30 seconds
   - Visit https://alignment.example.com and verify new version

### Update CloudFormation Stack

1. **Modify `cloudformation/template.yaml`** (e.g., cache behavior, tags, etc.)

2. **Validate changes**:
   ```bash
   bash tests/cloudformation-validation.sh cloudformation/template.yaml
   ```

3. **Apply update**:
   ```bash
   bash cloudformation/deploy.sh
   ```
   Stack update applies without downtime (~2-5 minutes).

4. **Verify**:
   - Check CloudFormation stack status: UPDATE_COMPLETE
   - App still accessible at https://alignment.example.com
   - No downtime observed

### Stack Rollback

If CloudFormation update fails:
- Cancel: `aws cloudformation cancel-update-stack --stack-name angularity-s3-deployment`
- Stack automatically reverts to previous state
- App remains available during rollback

### Stack Deletion

1. **Empty S3 bucket** (required before deletion):
   ```bash
   BUCKET=$(aws cloudformation describe-stacks \
     --stack-name angularity-s3-deployment \
     --query 'Stacks[0].Outputs[?OutputKey==`AppBucketName`].OutputValue' --output text)
   
   bash cloudformation/cleanup-bucket.sh $BUCKET
   ```

2. **Delete CloudFormation stack**:
   ```bash
   aws cloudformation delete-stack --stack-name angularity-s3-deployment
   ```

3. **Wait for completion**:
   ```bash
   aws cloudformation wait stack-delete-complete --stack-name angularity-s3-deployment
   ```

4. **Verify cleanup**:
   ```bash
   # Verify bucket gone
   aws s3 ls | grep alignment
   
   # Verify CloudFront distribution gone
   aws cloudfront list-distributions | grep alignment.example.com
   
   # Verify Route53 record gone
   aws route53 list-resource-record-sets --hosted-zone-id Z1234567890ABC | grep alignment
   ```

## Cost

Estimated monthly costs:
- S3 storage: ~$0.023/GB/month
- CloudFront: ~$0.085/GB (varies by region)
- Route53: $0.50/month
- Total for typical site: $5-15/month

## Security

- S3 bucket is private (BlockPublicAccess enabled)
- CloudFront uses Origin Access Identity (OAI) for restricted access
- HTTPS enforced (HTTP redirects to HTTPS)
- All resources tagged for audit trail
- No public bucket policy (CloudFront OAI only)
- Encryption in transit (TLS 1.2+)
- ACM certificate auto-renewed by AWS

## Monitoring & Observability

### CloudFront Metrics

View in AWS Console: CloudFront → Distributions → Your distribution → Monitoring

Key metrics:
- **Requests**: Total requests to distribution
- **Bytes Downloaded**: Traffic served from CloudFront
- **Cache Statistics**: Cache hit ratio
- **4xx/5xx Errors**: HTTP error counts
- **Latency**: Request latency from CloudFront edge locations

Alarms can be set via CloudWatch for:
- High error rates (>1% 4xx/5xx)
- Low cache hit ratio (<80%)
- High latency (>1s)

### S3 Metrics

View in AWS Console: S3 → Buckets → Your bucket → Metrics

Key metrics:
- **Object Count**: Number of objects in bucket
- **Storage Size**: Total storage used
- **Request Count**: API requests (GetObject, ListBucket, etc.)
- **Replication Metrics**: If versioning is used

### Route53 Health Checks

Optional: Set up Route53 health checks to verify subdomain is accessible:
- Type: HTTPS
- Protocol: HTTPS
- Port: 443
- Path: /index.html
- Alarm: Trigger SNS notification if health check fails

## Detailed Deployment Procedure

### Pre-Deployment Checklist

- [ ] ACM wildcard certificate is provisioned and in ISSUED status
- [ ] Route53 hosted zone exists for your parent domain
- [ ] AWS account has CloudFormation, S3, CloudFront, Route53 permissions
- [ ] AWS credentials configured (aws configure or AWS_PROFILE env var)
- [ ] `site/` directory populated with app files (index.html, input.html, report.html, css/, js/)

### Manual Stack Deployment Steps

1. **Gather Configuration**:
   ```bash
   # Get Route53 zone ID
   aws route53 list-hosted-zones --query 'HostedZones[0].{Name:Name,Id:Id}' --output table
   
   # Get ACM certificate ARN
   aws acm list-certificates --region us-east-1 --query 'CertificateSummaryList[0:3].{DomainName:DomainName,CertificateArn:CertificateArn}' --output table
   ```

2. **Create Parameters File**:
   ```bash
   cp cloudformation/parameters.example.json cloudformation/parameters.json
   # Edit parameters.json with your values:
   # - HostedZoneId: from Route53 (e.g., Z1234567890ABC)
   # - SubdomainName: desired subdomain prefix (e.g., alignment)
   # - ParentDomainName: your domain (e.g., example.com)
   # - CertificateArn: from ACM (arn:aws:acm:...)
   ```

3. **Validate Template**:
   ```bash
   bash tests/cloudformation-validation.sh cloudformation/template.yaml
   ```
   Expected: "✓ CloudFormation template is valid"

4. **Deploy Stack**:
   ```bash
   bash cloudformation/deploy.sh
   ```
   Expected: Stack creation takes 5-10 minutes. Watch for status updates.

5. **Verify Deployment**:
   ```bash
   # Get stack outputs
   aws cloudformation describe-stacks \
     --stack-name angularity-s3-deployment \
     --query 'Stacks[0].Outputs[*].[OutputKey,OutputValue]' \
     --output table
   ```
   Expected outputs:
   - AppBucketName: S3 bucket name
   - CloudFrontDomainName: d123abc.cloudfront.net
   - DistributionId: E1234ABCD5678
   - DeployedUrl: alignment.example.com

6. **Upload App Files**:
   ```bash
   # Get bucket name from outputs
   BUCKET=$(aws cloudformation describe-stacks \
     --stack-name angularity-s3-deployment \
     --query 'Stacks[0].Outputs[?OutputKey==`AppBucketName`].OutputValue' --output text)
   
   # Sync files from site/ directory
   aws s3 sync site/ s3://$BUCKET/ --delete
   ```

7. **Verify S3 Bucket**:
   ```bash
   # Check bucket exists and is private
   aws s3api get-bucket-public-access-block --bucket $BUCKET
   # Expected: BlockPublicAcls=true, BlockPublicPolicy=true
   
   # List uploaded files
   aws s3 ls s3://$BUCKET/ --recursive
   ```

8. **Test CloudFront Access** (before DNS propagates):
   ```bash
   # Get CloudFront domain from outputs
   CF_DOMAIN=$(aws cloudformation describe-stacks \
     --stack-name angularity-s3-deployment \
     --query 'Stacks[0].Outputs[?OutputKey==`CloudFrontDomainName`].OutputValue' --output text)
   
   # Test HTTPS access
   curl -I https://$CF_DOMAIN/index.html
   # Expected: HTTP/2 200 OK (or 304 if cached)
   ```

9. **Verify Route53 DNS** (wait 5-10 minutes for propagation):
   ```bash
   # Check DNS resolution
   nslookup alignment.example.com
   # Expected: Should resolve to CloudFront distribution
   
   # Test via subdomain URL
   curl -I https://alignment.example.com/index.html
   # Expected: HTTP/2 200 OK
   ```

### Resource Verification Checklist

- [ ] S3 bucket created and private (BlockPublicAccess enabled)
- [ ] S3 bucket has versioning enabled
- [ ] CloudFront OAI exists and has bucket read permissions
- [ ] CloudFront distribution is active and DEPLOYED
- [ ] CloudFront domain resolves and returns 200 OK
- [ ] Route53 alias record created and resolves
- [ ] Subdomain resolves to CloudFront
- [ ] App loads via https://alignment.example.com
- [ ] Browser DevTools shows no security warnings (valid HTTPS cert)

### Production Validation Checklist

#### Manual Validation

1. **Open Browser DevTools** (F12):
   - Go to Application → Storage → Local Storage
   - Note values stored (app state)
   - Go to Network tab
   - Load page with filter enabled (XHR/Fetch)

2. **Verify App Functionality**:
   - [ ] Navigate to input.html
   - [ ] Enter measurement data
   - [ ] Check Local Storage (should have data persisted)
   - [ ] Navigate to report.html
   - [ ] Verify calculations run (no server calls)
   - [ ] Check Network tab: ZERO POST/PUT/DELETE requests
   - [ ] Only GET requests to CloudFront
   - [ ] Export/download data (should trigger download, not upload)

3. **Performance Check**:
   - [ ] Page load time: Note in Network tab under "DOMContentLoaded" timing
   - [ ] Target: <2 seconds (per SC-003)
   - [ ] Check Response headers for "via: CloudFront" (indicates CDN is serving)
   - [ ] Check Cache-Control header: HTML should be short-lived, JS/CSS long-lived

4. **Certificate Validation**:
   - [ ] Click padlock icon in address bar
   - [ ] Verify certificate issuer: AWS
   - [ ] Verify subject: *.example.com (or exact domain)
   - [ ] Verify no browser warnings or certificate errors

#### Automated Validation

```bash
# Run Puppeteer smoke test
npm run test:cloudformation-deploy

# Expected output:
# ✓ App loads at CloudFront domain
# ✓ HTTPS certificate is valid
# ✓ Zero external API calls made
# ✓ No POST/PUT/DELETE requests made
# ✓ localStorage is available
# ✓ Page load time is under 2 seconds
# ... (all tests pass)
```

## Status

Implementation in progress. See [tasks.md](../specs/003-s3-subdomain-deployment/tasks.md) for task breakdown.
