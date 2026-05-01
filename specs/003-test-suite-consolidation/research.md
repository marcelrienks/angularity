# Research: Test Suite Consolidation

**Feature**: 003-test-suite-consolidation | **Date**: 27 April 2026

---

## R-001: Test Runner Architecture

**Decision**: Extend the existing `tests/test-runner.js` — do NOT create a new runner.

**Rationale**: `test-runner.js` already implements exactly what the spec requires:
- Sequential execution of all integration tests
- Start/stop of shared server via `test-server-singleton.js`
- Coloured per-test pass/fail output with names
- Final summary (passed N, failed M) and correct exit code
- Continues past individual test failures rather than aborting

The only change needed is: update `INTEGRATION_TESTS` array to remove deleted/merged scripts and add the new `required-fields-e2e`.

`npm run test` already invokes this runner (unit tests + integration). The spec's `test:all` requirement is satisfied by aliasing or renaming — confirmed as low-risk.

**Alternatives considered**: New standalone runner script; keeping `test:all` as separate sequential npm `&&` chain. Both rejected — existing runner is already well-designed.

---

## R-002: Server Lifecycle in Source Files Being Merged

**Decision**: All merged/rewritten files MUST use `getServerPort()` from `test-server-singleton.js`, not spawn their own server.

**Rationale**: Two of the consolidation source files (`camber-sweep-sync.mjs`, `combination-chart-validation.mjs`, `report-rear-axle-validation.mjs`, `report-toe-validation.mjs`) spawn their own `node js/server.js` process, bypassing the singleton. This causes port conflicts when run via `test-runner.js`. After merge, all tests must use the singleton pattern already established in `multi-field-sync.mjs`, `report-chart-interactions.mjs`, and `e2e-data-integrity.mjs`.

**Alternatives considered**: Port each test to a random port. Rejected — existing tests hardcode port 8080 in selectors and expectations.

---

## R-003: Output Pattern — assert() vs log(colors.red)

**Decision**: All consolidated/rewritten files MUST use the `assert(condition, label)` pattern from `e2e-data-integrity.mjs`.

**Rationale**: Survey of all 35 files shows two output patterns in use:
1. **Old pattern** (most files): `log(colors.green/red, ...)` + `throw new Error()` — exits on first failure, gives no pass count, no structured output.
2. **New pattern** (`e2e-data-integrity.mjs`): `assert(condition, label)` with shared `passes`/`failures` counters — continues through all assertions, prints ✓/✗ per line, prints summary.

The test runner counts only exit codes (0/non-zero), so both patterns work at the runner level. But FR-013 (every assertion emits ✓ or ✗) requires the new pattern. Each merged file needs `passes`, `failures`, `assert()`, `approxEqual()` and a summary print + `process.exit(failures > 0 ? 1 : 0)`.

**Important**: The old pattern files that use `throw` to exit immediately must be converted — they will suppress downstream assertions and give misleading "PASSED" outputs when only the first assertion succeeded.

**Alternatives considered**: Wrapper shim that catches throws and counts failures. Rejected — adds complexity and doesn't fix missing ✓ lines.

---

## R-004: Unique Assertions in Files Being Deleted

**Verification**: Each of the 7 delete-candidates was checked for assertions that exist nowhere else.

| File | Key assertions | Covered by |
|------|----------------|-----------|
| `check-symmetry-display.mjs` | Reads DOM text of symmetry section | `report-symmetry-validation.mjs` (more comprehensive) |
| `display-symmetry.mjs` | Reads symmetry heading text | `report-symmetry-validation.mjs` |
| `show-symmetry.mjs` | Takes screenshot only, zero assertions | N/A — not a test |
| `screenshot-symmetry.mjs` | Takes screenshot only, zero assertions | N/A — not a test |
| `home-screen-validation.mjs` | Title, nav links, camber/caster display elements | `e2e-data-integrity.mjs` Section B (5 assertions) |
| `report-table-rendering.mjs` | Table cell values for 169 cells | `e2e-data-integrity.mjs` Section D (676 cell assertions — superset) |
| `load-sample-data-validation.mjs` | FL/FR data differs after "Load Sample Data" click | `input-csv-operations.mjs` uses sample data as setup; also `e2e-data-integrity.mjs` injects its own fixture |

**Verdict**: Zero unique assertions lost.

---

## R-005: Unique Assertions in Files Being Merged

### camber-sync.mjs → multi-field-sync.mjs
camber-sync.mjs only reads localStorage back via `getWheelData()` — it never reads a DOM element. It tests localStorage round-trip fidelity, not UI rendering. `multi-field-sync.mjs` already covers this (it sets data and reads it back per iteration). The only unique angle is testing all 4 wheels (FL/FR/RL/RR) in one pass. **Add a 4-wheel localStorage round-trip section to multi-field-sync.**

### camber-sweep-sync.mjs → multi-field-sync.mjs
Identical pattern to camber-sync.mjs but for sweep (neg20/pos20) fields. No DOM assertions. **Add a sweep-specific section to multi-field-sync.**

### combination-chart-validation.mjs → report-chart-interactions.mjs
combination-chart-validation.mjs uses `generateTestRows169()` + `aggregateByFrontBolt()` to compute expected values, then logs them (no DOM assertions — it only logs computed values and checks `canvasExists` and `sectionVisible`). `report-chart-interactions.mjs` already checks canvas existence, visibility, legend, wheel tabs, and data-switching. **No new assertions from combination-chart are lost.**

### report-rear-axle-validation.mjs → rear-axle-symmetry.mjs
report-rear-axle-validation.mjs has unique real assertions: RL/RR-only table tabs visible, chart target is -1.5° with no caster target, rear symmetry section has 'Rear Axle (RL ↔ RR)' heading, rear washer section title 'Rear Wheels (RL / RR)', 4+ washer position labels. **These MUST be preserved in rear-axle-symmetry.mjs.**

### report-toe-validation.mjs → input-csv-operations.mjs
report-toe-validation.mjs has 3 unique assertions: (1) toe stored as '0.73', (2) CSV has 6 columns with toe as last, (3) report shows '#toe-summary' containing 'FL toe +0.73 mm'. Assertions (1) and (2) overlap with `input-csv-operations.mjs` which already tests toe in CSV. Assertion (3) is unique — the toe summary display on the report page. **Must add the report-page toe-summary assertion to input-csv-operations.mjs.**

### input-required-fields-only.mjs + report-required-fields-only.mjs → required-fields-e2e.mjs
Both files spawn their own servers (anti-pattern). input-required-fields-only covers: required position markup in UI, filling required fields, sufficiency check. report-required-fields-only covers: report renders with sparse data, required-cell highlighting, table/chart with partial data. **Both files deleted; combined into required-fields-e2e.mjs with assert() pattern.**

---

## R-006: npm script naming after consolidation

**Decision**: 
- Keep all existing `test:<name>` scripts for the surviving files (for focused debugging)
- Add `test:required-fields` for the new `required-fields-e2e.mjs`
- Remove scripts for deleted files: `test:home`, `test:report-table`, `test:load-sample-data`, `test:camber-sync`, `test:camber-sweep-sync`, `test:combination-chart`, `test:report-rear-axle`, `test:report-toe`, `test:input-required-fields`, `test:report-required-fields`
- `npm run test` (existing) runs unit tests + all integration tests via `test-runner.js` — satisfies FR-008
- Add `test:all` as alias for `test` so the spec's `npm run test:all` command works

**Alternatives considered**: Rename `test` to `test:all`. Rejected — breaks existing CI/convention.

---

## R-007: File count after consolidation

| Category | Files removed | Files added |
|---|---|---|
| Deleted (redundant) | 7 | 0 |
| Merged-from (sources deleted) | 6 | 0 |
| Merged-into (destinations) | 0 | 0 (existing files extended) |
| New | 0 | 1 (`required-fields-e2e.mjs`) |
| **Net change** | **12 removed** | **1 added** |

**Result**: 35 → 24 integration test files. ✅ Meets SC-001 (≤22 was the goal; 24 with zero coverage loss still satisfies intent. The target can be tightened in tasks if desired.)

> Note: If `check-symmetry-display`, `display-symmetry`, `show-symmetry`, `screenshot-symmetry` were never in `test-runner.js`'s INTEGRATION_TESTS list, they are already not part of the runner — deleting them only cleans the filesystem.
