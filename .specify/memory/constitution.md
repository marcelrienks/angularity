# MX-5 NC1 Alignment Tool Constitution

## Core Principles

### I. Measurement Precision & Accuracy (NON-NEGOTIABLE)
All calculations, interpolations, and derived values MUST be independently verifiable from raw measurement data. No cascading calculations; each analysis component reads directly from raw inputs. Rounding and display precision defined in constants.js; calculations use full precision. Any tolerance thresholds (symmetry, color coding) must be explicit and documented.

### II. Offline-First Architecture
All data storage MUST be client-side only (browser localStorage). No backend server, no cloud API calls for data persistence, no external dependencies for core functionality. User data never leaves their machine. Optional: CSV export/import for manual backup and sharing. Static site deployment supported (S3 + CloudFront or equivalent).

### III. Zero Security Assumptions (Appropriate to Static Scope)
No authentication, no authorization checks, no sensitive data handling required. This is a personal/local analysis tool. If deployed to public hosting, security is not in scope; assume public/untrusted network and don't collect sensitive information beyond local storage.

### IV. Comprehensive Integration Testing (Test-Required)
All end-to-end workflows MUST have passing integration tests via Puppeteer (or equivalent real-browser testing). Minimum coverage: input page → report generation → data persistence → wheel symmetry analysis. 30+ passing tests required before "complete" status. Jest unit tests optional; Puppeteer integration tests mandatory.

### V. Raw Data as Single Source of Truth (Calculation Integrity)
Every report section (table, chart, symmetry panel, bolt diagram) calculates independently from raw measurement grid. No section feeds derived data into another section's calculations. Cross-reference only for verification, not calculation input. Prevents error cascading; isolates bugs to single component.

## Technology Stack

**Static Site**: HTML5 + CSS3 + vanilla JavaScript (no framework dependency required).

**Storage**: Browser localStorage API. No backend server. No database.

**Optional Hosting**: S3 + CloudFront (AWS), Netlify, Vercel, or any static host. Terraform IaC available for AWS deployment.

**Testing**: Puppeteer v20+ for real-browser integration tests. Jest optional for unit tests.

**Build**: Vite (Phase 3b optional optimization); currently works without bundling.

## Data Integrity & Quality Standards

1. **Raw Data Validation** — CSV import MUST validate headers and data types before storage
2. **Interpolation Strategy** — Bilinear interpolation for sparse grids; document fallback behavior (nearest neighbor at edges)
3. **Calculation Verification** — All derived values (caster, score, deltas) traceable to raw input via formula and constant reference
4. **Color Coding** — Threshold definitions in constants.js; UI applies defined tiers (GREEN/ORANGE/RED). No magic numbers in CSS.
5. **localStorage Limits** — Graceful handling if quota exceeded; user notified with error message, not silent failure

## Testing & Validation Requirements

1. **Integration Tests** — Required for:
   - Input grid (13×13) rendering and data persistence
   - CSV import/export round-trip (data fidelity)
   - Report generation for all 4 wheels (FL/FR/RL/RR)
   - Symmetry analysis (front axle + rear axle)
   - Toe integration (if implemented)
   - Page reloads without data loss

2. **Minimum Test Count** — 30+ Puppeteer tests passing before release

3. **Test Execution** — `npm run test:all-sync` MUST pass locally; gate deployment on passing status

4. **Test Documentation** — Each test file in tests/integration/ MUST include purpose, scenario, and success criteria in comments

## Documentation Requirements

All significant features, algorithms, and design decisions MUST be documented:
- **ARCHITECTURE.md** — System design, module roles, data flow
- **DECISIONS.md** — Rationale for all non-obvious design choices
- **QUICK-START.md** — Setup, running tests, common dev tasks
- **TESTING.md** — Test coverage matrix, how to run tests
- **README.md** — User-facing overview and measurement procedures (for mechanics)

Documentation supersedes code comments for explaining intent.

## Governance

### Amendment Process
1. Constitution changes require explicit rationale (justify MAJOR/MINOR/PATCH bump)
2. Changes documented in commit message and this file's version line
3. All templates updated if principles change (plan-template.md, spec-template.md, etc.)
4. Backwards compatibility: MAJOR only for principle removals; MINOR for principle additions

### Version Bumping Rules
- **MAJOR**: Principle removal, principle redefinition incompatible with prior work
- **MINOR**: New principle added, existing principle expanded, new mandatory section
- **PATCH**: Clarification, wording refinement, non-semantic change

### Compliance Verification
- PR review checklist: "Does this comply with constitution principles?" (especially Principles I, IV, V)
- Tests serve as compliance gate (cannot merge if integration tests fail)

### Runtime Guidance
See [docs/DECISIONS.md](docs/DECISIONS.md) and [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for implementation details.

---

**Version**: 1.0.0 | **Ratified**: 2026-04-25 | **Last Amended**: 2026-04-25
