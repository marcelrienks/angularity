# Implementation Plan: Generic 4-Wheel Suspension Geometry Tool

**Branch**: `003-generic-suspension-model` | **Date**: 2026-06-26 | **Spec**: [spec.md](spec.md)

## Summary

Evolve the alignment tool from a Mazda MX5 NC1-specific implementation to a generic 4-wheel suspension geometry tool. Changes span three areas: (1) rename all vehicle-specific storage keys and UI text, (2) extend rear wheel grid cells to capture both camber and toe per bolt combination (both use eccentric bolts), and (3) display a string-box mm delta for front toe in the report (front toe is set via threaded rod, not the grid).

## Technical Context

**Language/Version**: Vanilla JavaScript (ES6+ modules), HTML5, CSS

**Primary Dependencies**: Puppeteer 19, Jest 29 (integration testing only)

**Storage**: Browser `localStorage` — per-wheel grid data + configuration constants + alignment targets

**Testing**: Puppeteer integration tests via `npm test` (Node.js test runner); Jest unit tests via `npm run test:unit`; dev server required on port 8080

**Target Platform**: Browser (client-side only, no server runtime)

**Project Type**: Static web application

**Performance Goals**: No change from existing (interactive tool, no throughput requirements)

**Constraints**: Fully offline-capable after initial page load; all computation client-side; no external network calls

**Scale/Scope**: Single-user tool; all data lives in one browser's localStorage

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Client-Side Purity | ✅ PASS | All changes are browser-only; no new network calls; localStorage remains sole persistence layer |
| II. Physics-First Correctness | ✅ PASS | Rear toe per-cell models physical reality (eccentric bolt); string-box formula `rimDiameter × tan(θ)` is geometrically exact; `stringBoxToeToMm` is a new function distinct from the existing `toeDegreesToResultantMm` (which uses wheel+tyre diameter for a different measurement method) |
| III. Integration-Test Coverage | ⚠️ REQUIRES ACTION | All 149 existing tests must still pass; new tests required for: rear toe input + export, front toe report section, rim diameter config. Test storage key helpers (`mx5-nc1-alignment-*`) must be updated to match renamed keys |
| IV. Discrete Grid Fidelity | ✅ PASS | Grid is user-configurable 3×3–13×13 (existing `measurement-density-select` feature, preserved by FR-018); max 13×13 unchanged; toe field additive to rear cells; no change to grid resolution or bolt range |
| V. Independent Wheel Optimization | ✅ PASS | No change to per-wheel independence; rear toe scoring added per-wheel alongside camber |

**Phase Scope Note**: The constitution's Phase scope section states "Toe and rear wheels are Phase 2 scope." This feature IS the Phase 2 implementation — rear toe and front toe reporting are explicitly in scope here. The Phase 1 code paths (FL/FR camber+caster grid) are unchanged; rear toe is additive.

**Post-design re-check**: See bottom of Phase 1.

## Project Structure

### Documentation (this feature)

```text
specs/003-generic-suspension-model/
├── plan.md              ← this file
├── research.md          ← Phase 0 output
├── data-model.md        ← Phase 1 output
├── quickstart.md        ← Phase 1 output
├── contracts/
│   ├── localStorage-schema.md
│   └── csv-format.md
└── tasks.md             ← Phase 2 output (/speckit-tasks)
```

### Source Code (affected files only)

```text
js/
├── constants.js              ← change LS_PREFIX
├── localstorage-io.js        ← change storage key functions + event filter
├── math-utils.js             ← add stringBoxToeToMm()
├── targets-manager.js        ← add rimDiameter config field + save/load
├── input-grid.js             ← rear cells: add toe input; remove camber-mirror hack
├── csv-io.js                 ← rear CSV: add toe column; backward-compat parse
├── report-engine.js          ← rear processWheel: accept toe per-cell in scoring
├── report-page.js            ← pass rimDiameter + frontToeTarget to front report
└── report-ui.js              ← front: string-box section; rear: toe delta display

site/
├── index.html                ← config tab: add rim diameter field
├── input.html                ← rear grid cells: toe input field
└── report.html               ← front report: string-box section placeholder

package.json                  ← remove MX5/NC1 from name, description, keywords

tests/
└── integration/
    └── *.mjs                 ← update storage key helpers; add new test files
```

## Complexity Tracking

No constitution violations requiring justification.

---

## Phase 0: Research

*See [research.md](research.md) for full decision log.*

**Resolved decisions:**

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Storage key rename strategy | Rename only; no migration | Users start fresh or re-import CSVs; migration adds complexity with no gain for single-user tool |
| Rear CSV backward compatibility | Detect by column count (5 cols = old, 6 cols = new) | Simplest approach; column count is unambiguous |
| Rear cell data shape | Add `toe: ''` to existing `{ neg20, zero, pos20 }` structure | Preserves pipeline compatibility; camber mirror hack removed; `neg20=zero=pos20` for camber, separate `toe` field |
| New math function vs reuse | New `stringBoxToeToMm(toeDegreesPerWheel, rimDiameterMm)` | `toeDegreesToResultantMm` uses overall wheel diameter for a different method; mixing them would be a physics error |
| Rim diameter field location | Add to Config tab on index.html alongside wheel diameter | Logically grouped with other measurement setup parameters |
| Front toe in scoring | Not scored (no measurement); report section only | Cannot score what was not measured in the grid |
| Test key updates | Update all test helpers to use new generic keys | Tests must stay green; keys changed globally |

---

## Phase 1: Design & Contracts

*Artifacts: [data-model.md](data-model.md), [contracts/](contracts/), [quickstart.md](quickstart.md)*

### Key Design Decisions

#### 1. Storage Key Changes

| Old Key | New Key |
|---------|---------|
| `mx5nc1_align_v2_` (LS_PREFIX) | `align_v2_` |
| `mx5-nc1-alignment-{wheel}` | `alignment-{wheel}` |
| `mx5-nc1-alignment-toe-{wheel}` | `alignment-toe-{wheel}` |
| Event filter: `startsWith('mx5-nc1')` | `startsWith('alignment-')` |

Target and constant keys (`alignment_target_*`, `alignment_constant_*`) are already generic — no change needed.

#### 2. Rear Cell Data Shape

```javascript
// Before (all wheels):
gridState[wheel][frontBolt][rearBolt] = { neg20: '', zero: '', pos20: '' }

// After (rear wheels only — RL, RR):
gridState[wheel][frontBolt][rearBolt] = { neg20: '', zero: '', pos20: '', toe: '' }
// neg20, zero, pos20 all hold the camber value (user enters once; UI syncs them)
// toe holds string-box mm delta (front rim edge gap minus rear rim edge gap); converted to degrees by report engine

// Front wheels: unchanged
gridState[wheel][frontBolt][rearBolt] = { neg20: '', zero: '', pos20: '' }
```

#### 3. New Config Field: Rim Diameter

Added to `CONSTANT_STORAGE` in `targets-manager.js`:
```javascript
rimDiameter: 'alignment_constant_rim_diameter'
```
Default: `330` mm (representative value; user must confirm for their vehicle).
Stored and loaded alongside existing constants.

#### 4. New Math Function

```javascript
// math-utils.js — string-box toe conversions (forward and inverse pair)
export function stringBoxToeToMm(toeDegreesPerWheel, rimDiameterMm) {
  // Formula: delta_mm = rimDiameter × tan(toeAngle_radians)
  // Used for FRONT toe report: target degrees → display mm for string-box setup
}

export function stringBoxMmToToeDegrees(deltaMm, rimDiameterMm) {
  // Formula: toe_degrees = atan(delta_mm / rimDiameter) × 180/π
  // Used for REAR toe scoring: raw mm input → degrees for comparison against target
}
```

Both functions are distinct from `toeDegreesToResultantMm` which uses overall wheel+tyre diameter for a different measurement context. The string-box pair uses rim (metal wheel) diameter only.

#### 5. Front Report: String-Box Section

In `report-ui.js`, for FL/FR wheels, render a dedicated section:

```
STRING BOX SETUP — FRONT TOE
Target: 0.07° per wheel
Set string gap delta: 0.40 mm per side (rim: 330 mm)
Note: Front toe is set via tie rod after eccentric bolt geometry is fixed.
```

If `rimDiameter` is not configured: display "Rim diameter not set — configure on Settings page."

#### 6. Rear Report: Toe Delta Column

Add three toe display columns to rear report summary table per cell:
1. **"Toe mm"** — raw input value (`cell.toe_mm`, stored as entered)
2. **"Toe °"** — computed degrees via `stringBoxMmToToeDegrees(toe_mm, rimDiameter)`
3. **"Toe Δ°"** — degrees delta from `toeRear` target; color coded green/orange/red same as camber

Best-cell selection uses `toeDelta` (degrees) in `_computeGoldenRuleScore` (weighted 1.2×).

**Note**: `rimDiameter` must be passed from `report-page.js` to BOTH front AND rear render calls — not just front.

### Post-Phase-1 Constitution Re-check

| Principle | Status |
|-----------|--------|
| I. Client-Side Purity | ✅ All new fields in localStorage; `stringBoxToeToMm` is pure math |
| II. Physics-First Correctness | ✅ Paired string-box functions (`stringBoxToeToMm` / `stringBoxMmToToeDegrees`) with correct `tan`/`atan` geometric bases; rear toe entered as mm, converted to degrees for scoring — physically correct round-trip |
| III. Integration-Test Coverage | ✅ Plan includes new integration tests for all new flows |
| IV. Discrete Grid Fidelity | ✅ 13×13 grid unchanged; toe field additive |
| V. Independent Wheel Optimization | ✅ RL/RR still optimised independently |
