# Data Model: S3 Subdomain Deployment

**Date**: 2026-06-29 | **Feature**: S3 Subdomain Deployment | **Status**: Design phase

## CloudFormation Template Structure

The deployment is defined by a single CloudFormation template (`cloudformation/template.yaml`). This document describes the parameters (inputs), resources, and outputs.

### Parameters (User-Provided Inputs)

Parameters allow the CloudFormation template to be reused across environments and configurations.

#### HostedZoneId
- **Type**: String (AWS::Route53::HostedZone::Id)
- **Description**: Route53 hosted zone ID for the existing domain (e.g., Z1234567890ABC)
- **Required**: Yes
- **Source**: User obtains from AWS Console → Route53 → Hosted Zone details
- **Example**: Z1234567890ABC
- **Validation**: Must be a valid hosted zone ID in the user's AWS account

#### SubdomainName
- **Type**: String
- **Description**: Subdomain prefix for the app (e.g., "alignment" → alignment.example.com)
- **Required**: Yes
- **Default**: None
- **Example**: alignment
- **Validation**: Must match DNS label format (alphanumeric, hyphens, lowercase, 1-63 chars)
- **Constraint**: Cannot contain dots (single label only)

#### ParentDomainName
- **Type**: String
- **Description**: Full parent domain name (e.g., example.com)
- **Required**: Yes
- **Example**: example.com
- **Validation**: Must match domain name format (valid DNS domain)
- **Note**: Used to construct FQDN: `{SubdomainName}.{ParentDomainName}`

#### CertificateArn
- **Type**: String
- **Description**: ARN of wildcard ACM certificate (must already exist)
- **Required**: Yes
- **Format**: arn:aws:acm:{region}:{account-id}:certificate/{uuid}
- **Example**: arn:aws:acm:us-east-1:123456789012:certificate/12345678-1234-1234-1234-123456789012
- **Validation**: Must be a valid ACM certificate ARN; certificate must cover `*.{ParentDomainName}`
- **Pre-condition**: User must provision wildcard certificate in ACM before deployment

#### AppSourceBucket
- **Type**: String
- **Description**: S3 bucket where app files (site/) are staged before deployment
- **Required**: No (defaults to inline deployment; see notes)
- **Example**: angularity-staging
- **Note**: Alternative: files uploaded directly to S3 bucket after stack creation

#### Environment
- **Type**: String
- **AllowedValues**: [production, staging, development]
- **Default**: production
- **Description**: Deployment environment for tagging
- **Validation**: Must be one of allowed values

### Resources (AWS Infrastructure)

Resources are deployed in this order: S3 Bucket → CloudFront Origin Access Identity → CloudFront Distribution → Route53 Alias Record.

#### S3 Bucket
- **Logical ID**: AppBucket
- **Type**: AWS::S3::Bucket
- **Properties**:
  - **BucketName**: {subdomain}-{parent-domain}-{account-id} (ensures global uniqueness)
  - **BlockPublicAccess**: All blocks enabled (bucket remains private)
  - **Versioning**: Enabled (supports rollback of app versions)
  - **LifecycleConfiguration**: Optional (delete old versions after 30 days)
- **Access Pattern**: CloudFront only (via OAI); no public access
- **Retention**: Persistent (survives stack updates; deletion requires manual emptying)

#### CloudFront Origin Access Identity (OAI)
- **Logical ID**: OriginAccessIdentity
- **Type**: AWS::CloudFront::CloudFrontOriginAccessIdentity
- **Properties**:
  - **Comment**: Identifies OAI for reference
- **Purpose**: Grants CloudFront read permission to private S3 bucket
- **Relationship**: Referenced by CloudFront distribution and S3 bucket policy

#### S3 Bucket Policy
- **Logical ID**: AppBucketPolicy
- **Type**: AWS::S3::BucketPolicy
- **Properties**:
  - **Bucket**: Reference to AppBucket
  - **PolicyDocument**: Allows CloudFront OAI to read objects (s3:GetObject)
- **Effect**: ALLOW for `s3:GetObject`, `s3:ListBucket`
- **Principal**: CloudFront OAI
- **Resource**: AppBucket and AppBucket/*

#### CloudFront Distribution
- **Logical ID**: AppDistribution
- **Type**: AWS::CloudFront::Distribution
- **Properties**:
  - **DomainName**: AppBucket S3 regional endpoint (e.g., bucket.s3.us-east-1.amazonaws.com)
  - **OriginAccessIdentity**: Reference to OAI
  - **CNAME/Alias**: Configured separately via Route53 (not in CloudFront CNAME field)
- **Cache Behaviors**:
  - **Default Behavior** (HTML files):
    - Paths: index.html, input.html, report.html
    - TTL: 0 (no caching) or 300 seconds
    - Compress: Enabled
    - Viewer Protocol Policy: https-only
  - **Secondary Behavior** (JavaScript/CSS):
    - Paths: *.js, *.css
    - TTL: 31536000 (1 year)
    - Compress: Enabled
  - **Secondary Behavior** (Static assets):
    - Paths: *.png, *.jpg, *.gif, *.woff, *.woff2
    - TTL: 604800 (7 days)
- **Error Handling**: 404 errors returned to viewer (not redirected via 404.html)
- **ViewerProtocolPolicy**: HTTPS-only (redirects HTTP to HTTPS)
- **DefaultRootObject**: index.html
- **Enabled**: true
- **Tags**: Environment, Project, Feature

#### Route53 Alias Record
- **Logical ID**: AppDomainAlias
- **Type**: AWS::Route53::RecordSet
- **Properties**:
  - **HostedZoneId**: Parameter input
  - **Name**: {subdomain}.{parent-domain} (FQDN)
  - **Type**: A (alias record)
  - **AliasTarget**:
    - **DNSName**: CloudFront distribution domain name
    - **HostedZoneId**: CloudFront zone ID (Z2FDTNDATAQYW2)
    - **EvaluateTargetHealth**: false
- **Relationship**: Resolves FQDN to CloudFront distribution

#### Certificate Association (CloudFront)
- **Integration**: CloudFront distribution references ACM certificate via CertificateArn parameter
- **No separate resource**: Certificate already exists in ACM; template only references it
- **Constraint**: Certificate must cover `*.{parent-domain}` or exact FQDN

### Outputs (CloudFormation Stack Outputs)

Outputs provide values for user reference after deployment.

#### AppBucketName
- **Description**: S3 bucket name for uploading app files
- **Value**: AppBucket logical ID resolved to bucket name
- **Use**: User copies `/site` directory contents to this bucket post-deployment

#### CloudFrontDomainName
- **Description**: CloudFront distribution domain name
- **Value**: CloudFront distribution domain name (e.g., d123abc.cloudfront.net)
- **Use**: Temporary access to app before DNS propagates

#### DistributionId
- **Description**: CloudFront distribution ID for invalidation operations
- **Value**: CloudFront distribution ID
- **Use**: Manual cache invalidation via AWS CLI (`aws cloudfront create-invalidation`)

#### DeployedUrl
- **Description**: Final FQDN where app is accessible
- **Value**: {subdomain}.{parent-domain}
- **Use**: User visits this URL after DNS propagates (~5-10 minutes)

#### StackStatus
- **Description**: CloudFormation stack status for reference
- **Value**: Stack status (CREATE_COMPLETE, UPDATE_COMPLETE, etc.)

### Relationships & Constraints

```
S3 Bucket (private, OAI-gated)
    ↓ (read via OAI)
CloudFront Origin Access Identity
    ↓ (has permission via bucket policy)
CloudFront Distribution
    ↓ (HTTPS, caching, compression)
Route53 Alias Record
    ↓ (DNS resolution)
Browser (user visits alignment.example.com)
    ↓ (HTTPS connection)
App loads from CloudFront (cached)
```

### Validation Rules

| Rule | When | Action |
|------|------|--------|
| Hosted zone must exist | Parameter input | CloudFormation fails if zone ID invalid |
| Certificate must exist in ACM | Parameter input | CloudFormation fails if ARN invalid |
| Certificate must cover subdomain | Parameter input | Deployment may fail at CF validation if cert doesn't match domain |
| S3 bucket name must be globally unique | Creation | CloudFormation generates suffix to ensure uniqueness |
| Subdomain must be valid DNS label | Parameter input | Validation constraint in template |
| Parent domain matches hosted zone | Design assumption | Manual verification by user before deployment |

### Data State Transitions

**Initial**: No resources exist
↓
**During Creation**: Resources created in order (S3 → OAI → CloudFront → Route53)
↓
**Active**: S3 bucket holds app files, CloudFront caches, Route53 resolves, users access via FQDN
↓
**Update**: Stack update modifies specific resource (e.g., cache behavior change, tags) without recreation
↓
**Deletion**: Route53 deleted first, CloudFront deleted, S3 bucket marked for deletion (requires manual emptying)

---

## Entity Definitions

### S3 Bucket Entity
- **Represents**: Static file storage for the web application
- **Attributes**:
  - BucketName (immutable, globally unique)
  - Region (us-east-1 recommended for CloudFront)
  - Versioning (enabled for rollback support)
  - VersionRetention (30 days default)
- **Key Attributes for Feature**:
  - BlockPublicAccess: true (private bucket, only CloudFront access)
  - BucketPolicy: Allows CloudFront OAI read-only access
- **Lifecycle**: Created with stack, persists through updates, survives deletion (manual cleanup needed)

### CloudFront Distribution Entity
- **Represents**: CDN layer for global content delivery, caching, HTTPS termination
- **Attributes**:
  - DistributionId (AWS-assigned, used for invalidation)
  - DomainName (d123abc.cloudfront.net)
  - Enabled (true = active)
  - Origin (S3 bucket via OAI)
- **Cache Behaviors**: Multiple per distribution (HTML, JS, CSS, etc. with different TTLs)
- **Lifecycle**: Deployed once, may be updated (certificate, behaviors, tags)

### Route53 Record Entity
- **Represents**: DNS alias record mapping subdomain to CloudFront distribution
- **Attributes**:
  - Name (FQDN: alignment.example.com)
  - Type (A: alias record)
  - AliasTarget (CloudFront distribution)
  - HostedZoneId (user-provided)
- **Relationships**: Must reference existing hosted zone; must resolve to valid CloudFront distribution
- **Lifecycle**: Created with stack, deleted on stack deletion

### ACM Certificate Entity (External)
- **Represents**: SSL/TLS certificate for HTTPS
- **Attributes**:
  - CertificateArn (user-provided)
  - DomainName (wildcard: *.example.com)
  - Status (ISSUED or PENDING_VALIDATION)
  - RenewalEligibility (auto-renewal by AWS)
- **Lifecycle**: Provisioned outside CloudFormation by user; referenced by CloudFront
- **Constraint**: Must be ISSUED status before deployment; must cover subdomain FQDN
