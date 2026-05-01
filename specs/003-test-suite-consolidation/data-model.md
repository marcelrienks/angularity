# Data Model: Test Suite Consolidation

**Feature**: 003-test-suite-consolidation | **Date**: 27 April 2026

---

## File Inventory

### Deleted files (no merge needed)

| File | Reason |
|------|--------|
| `tests/integration/check-symmetry-display.mjs` | Debug script; zero real assertions; covered by `report-symmetry-validation.mjs` |
| `tests/integration/display-symmetry.mjs` | Data-extraction only; no assertions |
| `tests/integration/show-symmetry.mjs` | Screenshot only; no assertions |
| `tests/integration/screenshot-symmetry.mjs` | Screenshot only; duplicate of show-symmetry |
| `tests/integration/home-screen-validation.mjs` | Covered by `e2e-data-integrity.mjs` Section B |
| `tests/integration/report-table-rendering.mjs` | Covered by `e2e-data-integrity.mjs` Section D (superset) |
| `tests/integration/load-sample-data-validation.mjs` | Sample button tested implicitly; no unique assertions |

### Consolidation merges

#### Merge 1: Sync tests → `multi-field-sync.mjs`

| Source | Unique assertions to preserve |
|--------|-------------------------------|
| `camber-sync.mjs` | All-4-wheel (FL/FR/RL/RR) localStorage round-trip: set `{ neg20, zero, pos20 }` per wheel, read back, assert identical. |
| `camber-sweep-sync.mjs` | FL/FR sweep-specific round-trip: set `{ camberPos20, camberNeg20 }`, read back, assert identical. |

**Destination**: `tests/integration/multi-field-sync.mjs`
- Add Section: "4-wheel camber round-trip (all wheels)" — 4 assertions
- Add Section: "FL/FR sweep round-trip" — 2 assertions
- Convert all existing sections to `assert()` pattern
- Remove `serverProcess` spawn; use `getServerPort()` singleton

#### Merge 2: Chart test → `report-chart-interactions.mjs`

| Source | Unique assertions to preserve |
|--------|-------------------------------|
| `combination-chart-validation.mjs` | None — all assertions are `log(...)` statements with no `assert()` calls; canvas/section visibility already in destination. |

**Destination**: `tests/integration/report-chart-interactions.mjs`
- No new assertions needed — source had none
- Convert destination to `assert()` pattern throughout (currently uses `log(colors.red)` + `process.exit(1)`)

#### Merge 3: Rear axle → `rear-axle-symmetry.mjs`

| Source | Unique assertions to preserve |
|--------|-------------------------------|
| `report-rear-axle-validation.mjs` | RL/RR-only table tabs visible (2 tabs); `debug.targetCamber === -1.5`; `debug.targetCaster === null`; chartNoteCamber contains 'Camber -1.5°'; chartNoteCaster starts with 'Toe '; symmetry section has 'Rear Axle (RL ↔ RR)' text; washer section has 'Rear Wheels (RL / RR)' title; ≥4 washer position labels. |

**Destination**: `tests/integration/rear-axle-symmetry.mjs`
- Add Section: "Rear-only report sections" — 8 assertions
- Convert destination to `assert()` pattern
- Remove `serverProcess` spawn from source; use `getServerPort()` singleton

#### Merge 4: Toe → `input-csv-operations.mjs`

| Source | Unique assertions to preserve |
|--------|-------------------------------|
| `report-toe-validation.mjs` | Report page `#toe-summary` contains 'FL toe +0.73 mm'. (Toe localStorage storage and CSV column already in destination.) |

**Destination**: `tests/integration/input-csv-operations.mjs`
- Add assertion: after navigating to report.html, `#toe-summary` text includes 'FL toe +0.73 mm'
- Convert destination to `assert()` pattern
- Remove `serverProcess` spawn from source

#### Merge 5: Required fields → new `required-fields-e2e.mjs`

| Source | Unique assertions to preserve |
|--------|-------------------------------|
| `input-required-fields-only.mjs` | 25 required position inputs fillable; required positions have `required` indicator class; data sufficiency check passes. |
| `report-required-fields-only.mjs` | Report renders with sparse data; required-cell borders present; table and chart load with partial data. |

**Destination**: `tests/integration/required-fields-e2e.mjs` (NEW)
- Section A: Fill only the 5×5 required grid (25 cells)
- Section B: Assert all 25 required positions fillable and marked
- Section C: Navigate to report — assert table renders, required-cell styling present
- Section D: Assert chart loads with partial data
- Full `assert()` pattern; uses `getServerPort()` singleton

#### Unconsolidated file requiring conversion

| File | Action |
|------|--------|
| `tests/integration/rear-wheel-heatmaps.mjs` | CONVERT — fix selectors, switch from `serverProcess` spawn to `getServerPort()` singleton, assert() pattern, add npm script, register in runner |

**Notes**: 8 real assertions (throw pattern). Tests `#section-heatmaps` feature (implemented in `site/report.html`). Current selectors `[data-wheel="RL"] canvas` are incorrect — actual canvas IDs are `#camber-heatmap`, `#caster-heatmap`, `#proximity-heatmap`. Selectors must be corrected during conversion.

---

## `test-runner.js` INTEGRATION_TESTS update

### Remove from list:
```
'test:home'             → deleted
'test:camber-sync'      → merged into multi-field-sync
'test:camber-sweep-sync'→ merged into multi-field-sync
'test:load-sample-data' → deleted
'test:combination-chart'→ merged into report-chart-interactions
'test:report-table'     → deleted
'test:report-rear-axle' → merged into rear-axle-symmetry
'test:report-required-fields' → merged into required-fields-e2e
'test:report-toe'       → merged into input-csv-operations
'test:input-required-fields'  → merged into required-fields-e2e
```

### Add to list:
```
'test:required-fields'  → new required-fields-e2e.mjs
```

### Final INTEGRATION_TESTS list (22 items, in execution order):
```javascript
const INTEGRATION_TESTS = [
  'test:input-grid',
  'test:input-wheel',
  'test:input-csv',
  'test:required-fields',          // NEW — replaces input-required-fields + report-required-fields
  'test:target-values',
  'test:color-coding-ui',
  'test:clear-empty-cycle',
  'test:multi-field-sync',         // EXTENDED — absorbs camber-sync + camber-sweep-sync
  'test:report-chart',             // EXTENDED — absorbs combination-chart
  'test:report-target-sync',
  'test:report-symmetry',
  'test:rear-axle-symmetry',       // EXTENDED — absorbs report-rear-axle-validation
  'test:toe-symmetry',
  'test:report-washer',
  'test:report-oracle',
  'test:report-values-check',
  'test:report-status',
  'test:report-responsive',
  'test:rear-wheel-heatmaps',      // CONVERTED — fixed selectors + assert() pattern
  'test:data-to-ui',
  'test:comprehensive',
  'test:e2e-data-integrity',
];
```

---

## `package.json` scripts update

### Remove:
- `test:home`
- `test:report-table`
- `test:load-sample-data`
- `test:camber-sync`
- `test:camber-sweep-sync`
- `test:combination-chart`
- `test:report-rear-axle`
- `test:report-toe`
- `test:input-required-fields`
- `test:report-required-fields`

### Add:
- `"test:required-fields": "node tests/integration/required-fields-e2e.mjs"`
- `"test:all": "node tests/test-runner.js"` (alias for `test`)
- `"test:all-sync": "node tests/test-runner.js"` (constitution-mandated alias)
- `"test:report-status": "node tests/integration/report-status-scenarios.mjs"`
- `"test:report-responsive": "node tests/integration/report-responsive-design.mjs"`
- `"test:rear-wheel-heatmaps": "node tests/integration/rear-wheel-heatmaps.mjs"`

### Remove scripts for non-runner files (show/screenshot/display-symmetry):
- `test:show-symmetry` (if exists)
- `test:screenshot-symmetry` (if exists)
- `test:check-symmetry` (if exists)
- `test:display-symmetry` (if exists)

---

## assert() Pattern Template

Every test file MUST include this at module level:

```javascript
let passes = 0;
let failures = 0;

function assert(condition, label) {
  if (condition) {
    passes++;
    console.log(`  ✓ ${label}`);
  } else {
    failures++;
    console.error(`  ✗ FAIL: ${label}`);
  }
}

function approxEqual(a, b, tol) {
  return Math.abs(a - b) <= tol;
}
```

And at the end of `main()`:
```javascript
console.log(`\n=== Results: ${passes} passed, ${failures} failed ===`);
process.exit(failures > 0 ? 1 : 0);
```
