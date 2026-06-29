# Research & Design Decisions: S3 Subdomain Deployment

**Date**: 2026-06-29 | **Feature**: S3 Subdomain Deployment | **Status**: Ready for Phase 1

## Decision: S3 Bucket Configuration for Static Hosting

**Decision**: Use S3 bucket as origin for CloudFront (not S3 static website hosting endpoint).

**Rationale**: 
- CloudFront origin access identity (OAI) pattern is more secure (bucket remains private, only CloudFront can read)
- Allows direct bucket management without needing S3's static site hosting feature
- Supports custom headers, versioning, and lifecycle policies
- Industry standard for S3 + CloudFront deployments

**Alternatives Considered**:
1. S3 static website hosting endpoint → Requires bucket to be public, less secure, forces index.html redirects via 404 error pages
2. S3 REST endpoint directly → Requires CloudFront to access private bucket via OAI (our choice)

**Implementation**: CloudFormation template will define S3 bucket with BlockPublicAccess enabled, CloudFront OAI with read permissions, no public bucket policy.

---

## Decision: CloudFront Cache Behaviors

**Decision**: Two cache behaviors: long TTL for versioned assets, minimal/no cache for index.html and data files.

**Rationale**:
- HTML files (index.html, input.html, report.html) must reflect app updates quickly
- JavaScript/CSS typically versioned or fingerprinted → safe to cache long (1 year or max-age)
- localStorage is used for data persistence, not CloudFront caching
- Prevents stale JS bugs in production while maximizing cache hit rate

**Cache Behavior Setup**:
- Default behavior (index.html, *.html): Cache-Control max-age=0, no caching (or very short TTL like 300s)
- JS/CSS assets (*.js, *.css): Cache-Control max-age=31536000 (1 year)
- Other static assets (images, fonts): Cache-Control max-age=604800 (7 days)

**Invalidation**: Manual CloudFront invalidation via AWS CLI when app is updated. Automation (GitHub Actions) deferred to future feature.

---

## Decision: CORS Configuration

**Decision**: CORS headers not required for initial deployment.

**Rationale**:
- App is single-domain (alignment.example.com)
- All assets served from same CloudFront origin
- No cross-origin API calls (app is client-side only per Constitution Principle I)
- CORS applies to explicit API cross-origin requests; this deployment has none

**Future**: If future features add cross-origin requests (e.g., backend integration), CORS can be added to S3 bucket CORS configuration and CloudFront behavior.

---

## Decision: Route53 Alias Record vs CNAME

**Decision**: Use Route53 alias record (CloudFront alias target).

**Rationale**:
- Alias records are AWS-native, cost-free, and resolve at DNS query time
- CNAME records cannot be used on zone apex (example.com) but CAN be used on subdomain
- Our case: subdomain (alignment.example.com) can use either, but alias is preferred for CloudFront targets
- Alias simplifies failover and health checks if needed later

**Implementation**: Route53 record type A with CloudFront alias target (not CNAME).

---

## Decision: Resource Tagging Strategy

**Decision**: Minimal tagging: Environment, Project, Feature tags.

**Rationale**:
- Cost tracking: User wants to track deployment costs → Environment tag (prod/dev)
- Resource identification: Project (angularity) + Feature (s3-deployment) for filtering
- Reduces CloudFormation complexity while enabling cost allocation

**Tags**:
- `Environment`: production (or staging for pre-prod testing)
- `Project`: angularity
- `Feature`: s3-subdomain-deployment
- `ManagedBy`: cloudformation
- `CreatedDate`: YYYY-MM-DD (optional, for auditing)

---

## Decision: CloudFormation Stack Deletion & Rollback

**Decision**: Full resource cleanup on stack deletion; no orphaned resources.

**Rationale**:
- S3 bucket must be empty before deletion (CloudFormation requirement)
- Route53 alias record is deleted automatically
- CloudFront distribution deleted automatically
- Clean state supports re-deployments and cost control

**Deployment Notes**: 
- Stack creation: Full resources created in correct order (S3 → CloudFront → Route53)
- Stack update: Individual resources updated; CloudFront invalidation may be manual
- Stack deletion: S3 bucket must be emptied first (can add custom resource or document in runbook)

---

## Decision: ACM Certificate Reference

**Decision**: CloudFormation template accepts ACM certificate ARN as parameter.

**Rationale**:
- Certificate already being provisioned by user (wildcard cert)
- User will provide ARN at deployment time
- No need for CloudFormation to create cert (avoids automation complexity, cert validation delays)
- Supports cert reuse across multiple stacks if needed

**Implementation**: `CertificateArn` parameter in CloudFormation template (required, no default). Example value: `arn:aws:acm:us-east-1:123456789012:certificate/12345678-1234-1234-1234-123456789012`

---

## Decision: Idempotency & Re-deployment

**Decision**: Template is fully idempotent; re-running same template causes no failures.

**Rationale**:
- S3 bucket remains unchanged if already exists (CloudFormation detects and skips)
- CloudFront distribution updates without recreation (improves deploy time)
- Route53 record updates without downtime
- Supports CI/CD automation and manual re-runs

**Constraints**: No resource naming conflicts if deploying to same region/domain. If deploying to multiple regions, suffix stack name with region.

---

## Summary: Research Resolved

| Topic | Decision | Status |
|-------|----------|--------|
| S3 bucket access pattern | CloudFront OAI (private bucket) | ✓ Ready for implementation |
| Cache behaviors | Long TTL assets, short TTL HTML | ✓ Ready for implementation |
| CORS | Not required, defer to future | ✓ Ready for implementation |
| DNS record type | Route53 alias (not CNAME) | ✓ Ready for implementation |
| Resource tagging | Environment, Project, Feature | ✓ Ready for implementation |
| Cert provisioning | User provides ACM ARN parameter | ✓ Ready for implementation |
| Stack operations | Full deletion cleanup, update idempotency | ✓ Ready for implementation |

**Next Phase**: Phase 1 design will define data model (CloudFormation parameters/outputs) and quickstart validation guide.
