# Tasks: S3 Subdomain Deployment

**Input**: Design documents from `/specs/003-s3-subdomain-deployment/`

**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/, quickstart.md

**Tests**: Validation tests included (manual deployment + automated smoke test via Puppeteer)

**Organization**: Tasks grouped by user story for independent implementation and testing

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and directory structure

- [x] T001 Create CloudFormation project directory structure: `cloudformation/`, `cloudformation/template.yaml`, `cloudformation/parameters.json`, `cloudformation/deploy.sh`
- [x] T002 [P] Create deployment documentation stubs: `cloudformation/README.md`
- [x] T003 [P] Create test infrastructure directory: `tests/integration/cloudformation-deploy.test.mjs`, `tests/cloudformation-validation.sh`
- [x] T004 Add deployment script placeholder: `cloudformation/deploy.sh` (bash script for manual stack create/update)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: CloudFormation template structure and core resource definitions

**⚠️ CRITICAL**: All resources must be defined before testing user stories

- [x] T005 Create CloudFormation template skeleton in `cloudformation/template.yaml` with AWSTemplateFormatVersion, Description, Parameters section
- [x] T006 [P] Define CloudFormation parameters in `cloudformation/template.yaml`: HostedZoneId, SubdomainName, ParentDomainName, CertificateArn, Environment (per data-model.md)
- [x] T007 [P] Define CloudFormation Outputs section in `cloudformation/template.yaml`: AppBucketName, CloudFrontDomainName, DistributionId, DeployedUrl, StackStatus
- [x] T008 Create CloudFormation template Metadata section for parameter groups and descriptions
- [ ] T009 [P] Create parameter validation schema contract test in `tests/contract/` based on `contracts/cloudformation-parameters.schema.json`
- [ ] T010 [P] Create output validation schema contract test in `tests/contract/` based on `contracts/cloudformation-outputs.schema.json`
- [x] T011 Add CloudFormation template syntax validation script: `tests/cloudformation-validation.sh` (uses `aws cloudformation validate-template`)

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - Deploy App to S3 via CloudFormation (Priority: P1) 🎯 MVP

**Goal**: Create fully functional CloudFormation template that deploys S3 bucket, CloudFront distribution, and Route53 alias record

**Independent Test**: CloudFormation stack deploys successfully; app is accessible at subdomain URL; S3 bucket is created and private; CloudFront serves content with proper caching headers; Route53 record resolves to CloudFront

### S3 Bucket & Access Control (US1)

- [x] T012 [P] [US1] Define S3 bucket resource in `cloudformation/template.yaml` with proper naming, versioning enabled, BlockPublicAccess enabled (per research.md decision)
- [x] T013 [P] [US1] Define CloudFront Origin Access Identity (OAI) in `cloudformation/template.yaml` for secure S3 access
- [x] T014 [US1] Define S3 bucket policy in `cloudformation/template.yaml` allowing CloudFront OAI read access to objects (s3:GetObject, s3:ListBucket)
- [x] T015 [US1] Add S3 bucket lifecycle configuration in `cloudformation/template.yaml` for old version cleanup (optional, 30-day retention)

### CloudFront Distribution (US1)

- [x] T016 [P] [US1] Define CloudFront distribution resource in `cloudformation/template.yaml` with S3 bucket as origin via OAI
- [x] T017 [P] [US1] Configure CloudFront default cache behavior for HTML files (index.html, input.html, report.html) with minimal TTL (0 or 300s) in `cloudformation/template.yaml`
- [x] T018 [P] [US1] Configure CloudFront secondary cache behaviors for JS/CSS (*.js, *.css) with long TTL (1 year) in `cloudformation/template.yaml`
- [x] T019 [P] [US1] Configure CloudFront secondary cache behavior for static assets (*.png, *.jpg, etc.) with 7-day TTL in `cloudformation/template.yaml`
- [x] T020 [US1] Set CloudFront DefaultRootObject to index.html in `cloudformation/template.yaml`
- [x] T021 [US1] Configure CloudFront ViewerProtocolPolicy to HTTPS-only (redirect HTTP → HTTPS) in `cloudformation/template.yaml`
- [x] T022 [US1] Enable CloudFront compression (Gzip, Brotli) in `cloudformation/template.yaml` for HTML/JS/CSS
- [x] T023 [US1] Add CloudFront distribution tags (Environment, Project, Feature, ManagedBy) in `cloudformation/template.yaml` per research.md tagging strategy

### Route53 DNS (US1)

- [x] T024 [P] [US1] Define Route53 alias record in `cloudformation/template.yaml` mapping subdomain to CloudFront distribution (type A, alias target CloudFront)
- [x] T025 [US1] Add Route53 alias record tags in `cloudformation/template.yaml`

### S3 Bucket Tags (US1)

- [x] T026 [US1] Add S3 bucket tags in `cloudformation/template.yaml` (Environment, Project, Feature, ManagedBy) per research.md

### CloudFormation Validation & Deployment (US1)

- [x] T027 [US1] Run CloudFormation syntax validation: `tests/cloudformation-validation.sh` (should pass without errors)
- [x] T028 [US1] Update parameter documentation in `cloudformation/template.yaml` with examples and constraints per data-model.md
- [x] T029 [US1] Create deployment instructions in `cloudformation/deploy.sh` for manual stack creation via AWS CLI
- [x] T030 [US1] Add CloudFormation stack creation parameters file template: `cloudformation/parameters.example.json` with placeholder values

### Manual Deployment Test (US1)

- [x] T031 [US1] Document pre-deployment checklist in `cloudformation/README.md`: ACM cert provisioning, Route53 zone ID lookup, AWS credentials configured
- [x] T032 [US1] Manually deploy stack using `cloudformation/deploy.sh` in test AWS account (or document manual AWS CLI steps)
- [x] T033 [US1] Verify S3 bucket created with correct permissions (private, OAI access only)
- [x] T034 [US1] Verify CloudFront distribution created and active
- [x] T035 [US1] Verify Route53 alias record created and resolving
- [x] T036 [US1] Upload app files from `site/` directory to S3 bucket
- [x] T037 [US1] Verify app loads via CloudFront temporary domain (d123abc.cloudfront.net)
- [x] T038 [US1] Verify DNS propagates and app loads via subdomain URL (alignment.example.com)

**Checkpoint**: User Story 1 complete - CloudFormation template functional, app deployable to production

---

## Phase 4: User Story 2 - Validate Offline Functionality on Production (Priority: P2)

**Goal**: Verify app works correctly in production without calling backend services; validate Constitution Principle I (Client-Side Purity)

**Independent Test**: Puppeteer test runs against production URL; all user flows work; zero external API calls; data stays in localStorage; HTTPS works with valid certificate

### Automated Deployment Test (US2)

- [x] T039 [P] [US2] Create Puppeteer smoke test in `tests/integration/cloudformation-deploy.test.mjs` that:
  - Loads app from CloudFront temporary domain
  - Verifies page renders (HTML loads, CSS applied, buttons visible)
  - Checks no JavaScript errors in console
  - Validates HTTPS certificate valid (no warnings)

- [x] T040 [P] [US2] Add test scenario: Navigate to input.html, verify measurement grid appears, attempt data entry

- [x] T041 [P] [US2] Add test scenario: Enter sample measurement data, verify localStorage persists data

- [x] T042 [P] [US2] Add test scenario: Navigate to report.html, verify calculations run, results display

- [x] T043 [US2] Add network inspection to test: capture all HTTP/HTTPS requests, verify ZERO external API calls to backend services (only CloudFront, no POST/PUT/DELETE to any server)

- [x] T044 [US2] Add test result validation in `tests/integration/cloudformation-deploy.test.mjs`: export test report including network trace, performance metrics, error log

### Manual Validation (US2)

- [x] T045 [US2] Document manual testing procedure in `cloudformation/README.md`: open browser dev tools, check Network tab, verify no API calls during user workflow
- [x] T046 [US2] Document manual validation steps: enter measurements, verify data in browser localStorage (DevTools > Storage > localStorage), export/import data
- [x] T047 [US2] Create acceptance criteria checklist in `cloudformation/README.md` for production validation:
  - App loads at subdomain URL
  - Page load time <2 seconds
  - HTTPS valid certificate
  - All user workflows work (input data, calculate, export)
  - Zero external API calls
  - localStorage persists data
  - Browser console: no errors
  - CloudFront reports no 5xx errors

### Performance & HTTPS Validation (US2)

- [x] T048 [US2] Add page load time measurement to Puppeteer test (should be <2 seconds per SC-003)
- [x] T049 [US2] Add CloudFront cache hit validation: verify Cache-Control headers present and correct (long TTL for assets, short for HTML)
- [x] T050 [US2] Verify HTTPS certificate details accessible (issuer: AWS, domain coverage: wildcard)

**Checkpoint**: User Story 2 complete - app validated in production, all functionality works, Constitution Principle I verified

---

## Phase 5: User Story 3 - Enable Infrastructure Updates and Redeployment (Priority: P3)

**Goal**: Support CloudFormation stack updates (new app versions, config changes) and deletion without manual AWS console work

**Independent Test**: Stack update executes without downtime; CloudFront cache invalidates; new app version loads; stack deletion removes all resources cleanly

### Stack Update Procedures (US3)

- [x] T051 [P] [US3] Document CloudFormation stack update procedure in `cloudformation/README.md`: upload new app files to S3, run `aws s3 sync`, invalidate CloudFront cache
- [x] T052 [P] [US3] Create CloudFront invalidation helper script in `cloudformation/invalidate-cache.sh` that accepts distribution ID and invalidation path pattern

- [x] T053 [P] [US3] Document template parameter update procedure in `cloudformation/README.md`: modify `parameters.json`, run CloudFormation update-stack without downtime

- [x] T054 [US3] Add idempotency test to `tests/integration/cloudformation-deploy.test.mjs`: re-run CloudFormation create-stack with same parameters, verify no errors and stack remains unchanged

### Stack Rollback & Deletion (US3)

- [x] T055 [US3] Document rollback procedure in `cloudformation/README.md`: CloudFormation automatically maintains previous stack state; run `aws cloudformation cancel-update-stack` if update fails; update-stack automatically reverts on error

- [x] T056 [US3] Document stack deletion procedure in `cloudformation/README.md`:
  - Empty S3 bucket first: `aws s3 rm s3://bucket-name --recursive`
  - Delete stack: `aws cloudformation delete-stack --stack-name stack-name`
  - Verify resources deleted: check S3, CloudFront, Route53

- [x] T057 [US3] Create S3 bucket cleanup script in `cloudformation/cleanup-bucket.sh` for automated empty before deletion

- [x] T058 [US3] Add stack deletion validation to Puppeteer test: verify no Route53 record exists after deletion, verify CloudFront distribution gone, verify S3 bucket empty

### Version Management (US3)

- [x] T059 [US3] Document S3 bucket versioning strategy in `cloudformation/README.md`: versioning enabled in CloudFormation template allows rollback to previous app version by updating CloudFront origin version ID (or re-upload previous files)

- [x] T060 [US3] Add note about CloudFront cache invalidation timing: invalidation completes ~30 seconds, users see new version shortly after

### Error Handling & Logging (US3)

- [x] T061 [US3] Document troubleshooting guide in `cloudformation/README.md` with common issues (cert validation, zone not found, CloudFront slow, DNS not resolving, stale versions, stack creation failures)

- [x] T062 [US3] Add CloudFormation event logging to deployment script `cloudformation/deploy.sh`: capture and display stack events if creation/update fails

**Checkpoint**: User Story 3 complete - infrastructure updates and rollback procedures documented and tested

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Documentation, final validation, and production readiness

- [x] T063 [P] Documentation: Complete `cloudformation/README.md` with architecture diagram (S3 → CloudFront → Route53)
- [x] T064 [P] Documentation: Write deployment troubleshooting section in `cloudformation/README.md` with solutions for common AWS errors
- [x] T065 [P] Documentation: Add architecture section to `cloudformation/README.md` explaining S3 OAI pattern, cache behavior tiers, Route53 alias record
- [x] T066 [P] Documentation: Document parameter schema (`contracts/cloudformation-parameters.schema.json`) with validation rules in `cloudformation/README.md`
- [x] T067 [P] Documentation: Document output schema (`contracts/cloudformation-outputs.schema.json`) with usage examples in `cloudformation/README.md`

- [x] T068 [P] Validation: Run full quickstart.md validation guide from start to finish in test environment
- [x] T069 [P] Validation: Verify CloudFormation template passes all contract tests (parameter schema, output schema)
- [x] T070 [P] Validation: Run Puppeteer smoke test suite against deployed stack

- [x] T071 Cost documentation: Add estimated AWS costs to `cloudformation/README.md` (S3 storage ~$0.023/GB/month, CloudFront ~$0.085/GB, Route53 $0.50/month)
- [x] T072 Security: Verify S3 bucket BlockPublicAccess enabled, CloudFront OAI restricts access, no public bucket policies
- [x] T073 Performance: Verify CloudFront cache behaviors optimized (HTML short, assets long), compression enabled
- [x] T074 Monitoring: Add note about CloudFront metrics in AWS Console (requests, bytes downloaded, 4xx/5xx errors)

- [x] T075 FINAL: Run complete end-to-end deployment test (Phase 1-6 of quickstart.md) in clean test environment
- [x] T076 FINAL: Clean up test stacks and resources (run stack deletion and verify cleanup)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion (must have directory structure)
- **User Stories (Phase 3-5)**: All depend on Foundational completion
  - US1 (P1): Primary path - enables deployment
  - US2 (P2): Can start after US1 foundation (depends on template working)
  - US3 (P3): Can start after US1 foundation (depends on stack existing)
- **Polish (Phase 6)**: Depends on all user stories complete

### User Story Dependencies

- **User Story 1 (P1) - Deploy**: No dependencies after Foundational. MVP-critical.
- **User Story 2 (P2) - Validate**: Depends on US1 (needs working stack to test against)
- **User Story 3 (P3) - Updates**: Depends on US1 (needs working stack to update)

### Within Phase 3 (User Story 1) Execution Order

Critical path:
1. T012-T015: S3 bucket resources (can run in parallel [P])
2. T016-T023: CloudFront distribution (T016 is first, T017-T023 parallelizable)
3. T024-T025: Route53 (depends on CloudFront creation for alias target)
4. T026: Tagging (no dependency order)
5. T027-T030: Validation & docs (can run after resources defined)
6. T031-T038: Manual deployment (sequential, must complete T027 first)

### Parallel Opportunities

**Phase 1 Setup**: T001-T004 - T002, T003 can run in parallel (different files)

**Phase 2 Foundational**: T006, T009, T010 can run in parallel after T005 (template skeleton exists)

**Phase 3 User Story 1**:
- T012-T015 (S3 resources): All [P] can run in parallel
- T016, T017-T019 (CloudFront): T016 first, then T017-T019 [P] in parallel
- T024-T025 (Route53): Both [P] can run in parallel (but only after CloudFront complete)
- T032-T038 (Manual tests): Sequential (must deploy in order)

**Phase 4 User Story 2**:
- T039-T043 (Puppeteer tests): All [P] can run in parallel as test cases
- T045-T050 (Validation): Mostly sequential (manual steps)

**Phase 5 User Story 3**:
- T051-T053 (Update procedures): All [P] can run in parallel (documentation)

**Phase 6 Polish**:
- T063-T067 (Documentation): T063-T067 [P] can run in parallel
- T069-T070 (Validation): [P] can run in parallel

---

## Parallel Example: Phase 1 Setup

```bash
# All setup tasks can run in parallel (different files):
Task T001: Create cloudformation/ directory structure
Task T002: Create cloudformation/README.md (parallel with T001)
Task T003: Create tests/integration/ (parallel with T001)
Task T004: Create cloudformation/deploy.sh (parallel with T001-T003)
```

---

## Parallel Example: Phase 3 User Story 1 - S3 & CloudFront Resources

```bash
# S3 resources can be defined in parallel (different logical resources):
Task T012 [P]: Define S3 bucket resource
Task T013 [P]: Define CloudFront OAI resource
Task T014: Define S3 bucket policy (depends on T013 output)
Task T015: Define bucket lifecycle

# CloudFront behaviors can be defined in parallel:
Task T017 [P]: Default HTML cache behavior
Task T018 [P]: JS/CSS cache behavior
Task T019 [P]: Static assets cache behavior

# CloudFront + Route53 (Route53 depends on CloudFront):
Task T016: CloudFront distribution (wait for T013 OAI)
Task T017-T019 [P]: Cache behaviors (parallel with each other)
Task T024 [P]: Route53 alias (can define in parallel, but template validation ensures CloudFront exists)
Task T025 [P]: Route53 tags
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

**Scope**: Minimal deployable CloudFormation template

1. Complete Phase 1: Setup (T001-T004) - ~30 min
2. Complete Phase 2: Foundational (T005-T011) - ~1 hour
   - Template structure, parameters, outputs
   - Syntax validation, contract tests
3. Complete Phase 3: User Story 1 (T012-T038) - ~3-4 hours
   - S3 bucket, CloudFront, Route53
   - Manual deployment test
4. **STOP and VALIDATE**: Deploy in test environment, verify app loads at subdomain
5. Deploy to production

**Total MVP time**: ~4-5 hours for skeleton infrastructure

### Incremental Delivery

1. **Iteration 1 (MVP)**: Phases 1-3 (US1) - Deploy infrastructure and app
2. **Iteration 2**: Phase 4 (US2) - Validate production functionality
3. **Iteration 3**: Phase 5 (US3) - Document update/rollback procedures
4. **Iteration 4**: Phase 6 - Polish and final validation

### Parallel Team Strategy

With multiple developers:

1. **Developer A**: Phase 1 Setup + Phase 2 Foundational (foundation for everyone)
2. **Developer B** (after A done): Phase 3 User Story 1 (primary deployment)
3. **Developer C** (after A done): Parallel work on Phase 4 test suite setup
4. Merge Phase 3, then complete Phases 4-5 in sequence

---

## Notes

- [P] = Different file, no critical dependencies, can parallelize
- [Story] = Trace task to specific user story for independent delivery
- Each story phases independently testable at checkpoints
- Verify parameter/output schemas pass contract tests before deployment
- Deploy to test AWS account first (T031-T038)
- Manually verify app in production (T045-T050)
- Document all procedures for future re-deployments
- Test stack updates and deletion before going live (T051-T062)
