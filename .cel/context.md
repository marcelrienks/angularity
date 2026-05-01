# MX-5 NC1 Alignment System — Project Context
**Last Updated**: May 1, 2026  
**Cache Status**: Fresh scan completed

---

## Project Purpose

**What**: Web-based digital analysis tool for DIY home mechanics to optimize Mazda MX-5 NC1 wheel alignment.

**Why**: Enable precise, affordable wheel alignment at home by analyzing trade-offs between camber, caster, and toe across a 13×13 grid of eccentric bolt position combinations.

**Core Innovation**: 
- Value symmetry (FL/FR match on alignment values, not bolt positions)
- Three optima per wheel (best compromise, best camber, best caster)
- Client-side only (no server, data stays local)
- Discrete grid (169 configurations per wheel)

**Status**: MVP Complete (Phase 3) — 149 tests passing, AWS S3+CloudFront deployment ready.

---

## Architecture & Tech Stack

### Languages & Frameworks
- **Frontend**: Vanilla JavaScript (ES6+) + HTML/CSS
- **Backend**: Node.js (Express-like via `js/server.js`) — static file serving only
- **Testing**: Jest (unit) + Puppeteer (integration/E2E)
- **Infrastructure**: AWS (S3 + CloudFront), Terraform IaC

### Core Modules (21 total)
| Module | Purpose |
|--------|---------|
| `washer-math.js` | Physics calculations (camber, caster, toe formulas) |
| `interpolation.js` | Bilinear interpolation for grid analysis |
| `input-grid.js` | UI for capturing measurements at bolt positions |
| `csv-io.js` | Import/export CSV (PERSIST schema) |
| `localstorage-io.js` | Browser persistence (gridState, settings) |
| `report-engine.js` | Three optima analysis + scoring algorithm |
| `report-ui.js` | Results visualization (tables, charts) |
| `washer-diagram.js` | Eccentric bolt position diagrams |
| `constants.js` | Configuration (grid dimensions, bolt ranges) |
| `error-handler.js` | Centralized error management |
| (+ 11 more) | Chart building, dummy data, UI utilities |

### Data Flow
1. **INPUT PAGE** → Measurements captured in 13×13 grid → localStorage (gridState)
2. **REPORT PAGE** → gridState loaded → Physics calculations → Three optima computed → Results visualized

### System Constraints
- Discrete positions only (−6 to +6 per bolt = 13 positions)
- Front wheels only (FL/FR) — rear wheels (RL/RR) calculated from front
- All math client-side; no server processing
- CSV import/export for data persistence and sharing

---

## Key Workflows

### Complete Alignment Workflow (Mechanic Perspective)
1. **Setup**: Enter factory target values (e.g., camber −1.5°, caster 5.0°)
2. **Capture**: Make physical measurements at 13×13 bolt positions using:
   - Caster tool (20° sweep method)
   - Digital camber gauge
   - String box (toe measurement)
3. **Analysis**: Input grid → Report page auto-calculates three optima
4. **Decision**: Choose best compromise, best camber, or best caster based on driving priorities
5. **Adjustment**: Apply recommended bolt positions; re-measure to validate

### Developer Workflow
1. **Contribute**: Local dev via `npm install && npm run start`
2. **Test**: Run `npm test` (Puppeteer suite) or `npm run test:unit` (Jest)
3. **Debug**: Use `DEBUGGING.md` for data tracing; browser DevTools for UI
4. **Deploy**: GitHub Actions CI/CD → `npm run deploy` → AWS S3+CloudFront

### Data Integration Workflows
- **CSV Import** → Validate schema → Load to localStorage
- **CSV Export** → Serialize gridState → Download
- **localStorage Sync** → Auto-save on field change → Persist across sessions

---

## Documentation Map

### Developer Reference (In /docs/)
| Document | Focus | Key Sections |
|----------|-------|--------------|
| **QUICKSTART.md** | Setup & first steps | Installation, project structure, common tasks |
| **ARCHITECTURE.md** | System design | 13×13 grid, three optima, data flow, visualizations |
| **API.md** | Module reference | 21 modules, APIs, usage examples |
| **MODULES.md** | Deep module docs | Responsibility, dependencies, detailed examples |
| **INTERNALS.md** | Algorithm details | Physics formulas, interpolation, scoring logic |
| **TESTING.md** | Test coverage | Jest + Puppeteer test matrix, how to run |
| **OPERATIONS.md** | Production | Deployment, monitoring, health checks |
| **GUIDE.md** | User guide | How to use the tool, measurement procedures |
| **DESIGN.md** | Design decisions | 8 strategic choices + rationale |
| **PERSISTENCE.md** | Data storage | CSV schema, localStorage structure, examples |
| **DEBUGGING.md** | Troubleshooting | Data tracing, impact analysis, maintenance |
| **CONTRIBUTING.md** | Development | Code style, PR process, testing requirements |

### Infrastructure
- **Terraform**: `/infrastructure/` (provider, main, monitoring, security, variables)
- **Deployment Scripts**: `/scripts/` (deploy.sh, setup-aws-infrastructure.sh, validate-deployment.sh)

### Examples & Templates
- **CSV Examples**: `/examples/` (measurement templates, export samples)
- **Specs**: `/specs/001-`, `/specs/002-`, `/specs/003-` (active spec-driven development)

---

## Current Status

### What's Complete
✅ MVP core functionality (measurements → three optima → visual recommendations)  
✅ 149 integration + unit tests passing  
✅ AWS S3+CloudFront deployment pipeline ready  
✅ CSV import/export with validation  
✅ localStorage persistence  
✅ Rear wheel symmetry calculations  
✅ Comprehensive documentation (14+ focused docs)  

### Active Development (Spec 003)
📋 **Spec 003: Test Suite Consolidation** — In progress  
- Consolidating 30+ integration tests into cohesive test groups
- Improving test readability and maintainability
- Plan & spec in `/specs/003-test-suite-consolidation/`

### Known Limitations
- No RL/RR editing UI (rear calculated from front)
- No server-side persistence (browser-local only)
- Physical measurement procedures vehicle-specific (MX-5 focused)

---

## Test Coverage

### Unit Tests
- Jest config: `tests/jest.unit.config.js`
- Run: `npm run test:unit`
- Coverage: `npm run test:coverage`

### Integration Tests (Puppeteer)
- 33+ integration tests covering:
  - Input grid rendering & data validation
  - CSV import/export workflows
  - Report page calculations
  - Rear axle symmetry
  - UI responsiveness
  - Chart interactions
- Run individual: `npm run test:[name]` (e.g., `npm run test:e2e-data-integrity`)
- Run all: `npm test`

### E2E Test Suite
- Tests: `/tests/integration/*.mjs`
- Config: `tests/jest-puppeteer.config.js`
- Server: `tests/test-server-singleton.js`

---

## Document Hash Registry (Change Detection)

File hashes scanned (MD5 format):
- README.md: `c453763fcd3722e19cceb8982fd6f84f`
- docs/ARCHITECTURE.md: `f75b75e51e7745cd19e74198df940347`
- docs/API.md: `dd0abd3380e775dc6f7bb59711802edb`
- docs/GUIDE.md: `69a4fede4b87a7c60c9c8185d9a85fa5`
- docs/INTERNALS.md: `5949ae0b80c0fa6d8c60be0edcb0ad17`
- docs/OPERATIONS.md: `acbf2e3615d2f0fed98fa6ca5109cc52`
- docs/CONTRIBUTING.md: `6be475b17077beee61adc4820e5ad82d`
- docs/DEPLOYMENT-SETUP.md: `c23332d56bcdd06589f19839828835e5`
- docs/README.md: `dc18b249c4907e207c314bc4be5c0b8f`
- infrastructure/README.md: `dc35af52f3697993748ba78b8f317abf`

**Status**: Hash registry initialized for change detection on future runs.

---

## Quick Access Paths

| Need | Path |
|------|------|
| Start developing | `js/server.js` + `site/index.html` |
| Add a test | `/tests/integration/*.mjs` |
| Read module API | `docs/API.md` + `docs/MODULES.md` |
| Update infrastructure | `/infrastructure/main.tf` |
| Check test status | `npm test` or individual test names |
| Deploy to AWS | `npm run deploy` or `scripts/deploy.sh` |

---

## Session Notes
(Empty — use for task-specific context)
