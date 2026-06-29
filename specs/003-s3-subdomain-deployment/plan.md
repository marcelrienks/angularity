# Implementation Plan: S3 Subdomain Deployment

**Branch**: `003-s3-subdomain-deployment` | **Date**: 2026-06-29 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/003-s3-subdomain-deployment/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Deploy Angularity application to AWS S3 with CloudFront CDN and Route53 DNS, using CloudFormation infrastructure-as-code template. App remains fully client-side; deployment adds production hosting on subdomain of existing domain with wildcard HTTPS certificate. Template must be idempotent (safe to re-run) and support stack updates/deletions without manual AWS console intervention.

## Technical Context

**Language/Version**: CloudFormation YAML (AWS infrastructure-as-code)

**Primary Dependencies**: AWS CloudFormation, S3, CloudFront, Route53, ACM (AWS Certificate Manager)

**Storage**: S3 bucket (static file storage, no database)

**Testing**: AWS CloudFormation validation, manual deployment test, app functionality test in production

**Target Platform**: AWS cloud (us-east-1 or configurable region)

**Project Type**: Infrastructure-as-code (deployment automation)

**Performance Goals**: Page load <2s (SC-003), deployment completes in <5min (SC-002)

**Constraints**: No downtime on stack update, idempotent (safe to redeploy), wildcard cert already provisioned in ACM

**Scale/Scope**: Single S3 bucket, single CloudFront distribution, single Route53 alias record, tagged resources for cost tracking

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

✅ **Principle I — Client-Side Purity**: CloudFormation is deployment infrastructure only. Does not add server-side processing, APIs, or data transmission. App code unchanged; all calculations remain in browser. ✓

✅ **Principle III — Integration-Test Coverage**: Deployment must be validated by: (1) CloudFormation template validation, (2) manual test of deployed app (entry, calculation, export), (3) verification of zero external API calls in production. Tests can reuse existing Puppeteer suite or add smoke test. ✓

⚠️ **Other Principles**: Principles II (physics), IV (discrete grid), V (wheel optimization) are orthogonal to deployment and require no justification.

**Gate Status**: PASS — Deployment does not violate Constitution. Proceed to Phase 0.

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
cloudformation/
├── template.yaml              # CloudFormation template (S3, CloudFront, Route53, ACM)
├── parameters.json            # Parameter overrides (subdomain, hosted zone ID, cert ARN)
└── deploy.sh                  # Bash script for deploying stack (or use AWS CLI)

site/                          # Existing app files (unchanged by this feature)
├── index.html
├── input.html
├── report.html
└── css/
    └── shared.css

tests/
├── integration/
│   └── cloudformation-deploy.test.mjs   # Puppeteer test: verify deployed app works
└── cloudformation-validation.sh         # Validate template before deployment
```

**Structure Decision**: Infrastructure-as-code lives in `cloudformation/` directory. No changes to app source (`site/`) or test structure. Template validation and app smoke test added to existing test suite. Deployment is manual CloudFormation stack create/update; CI/CD automation deferred to future feature.

## Complexity Tracking

> **No violations** — Constitution Check passed without justifications needed. Deployment is straightforward static hosting with no architectural complexity.
