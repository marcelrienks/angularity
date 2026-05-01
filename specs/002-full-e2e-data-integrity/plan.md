# Implementation Plan: Full E2E Data Integrity Integration Test

**Branch**: `002-full-e2e-data-integrity` | **Date**: 26 April 2026 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `specs/002-full-e2e-data-integrity/spec.md`

---

## Summary

A single Puppeteer integration test (`e2e-data-integrity.mjs`) that walks the complete application pipeline — home → input → report — and asserts every value rendered in the report exactly matches a pre-computed static fixture. The fixture uses a bilinear + cross-term formula to generate gently curved, directionally distinct, per-wheel unique camber/caster/toe surfaces. The test validates: input DOM reflection, raw data table values, chart line boundary/midpoint data, target lines, and eccentric bolt washer indicator positions.

**Approach**: Direct localStorage write for data injection (pattern established in existing tests); chart data read via `canvas.dataset.chartDebug`; washer position read via `.washer-position` text elements.

---

## Technical Context

**Language/Version**: JavaScript (ESM), Node.js 18+
**Primary Dependencies**: Puppeteer v20+, Chart.js v4.4.4 (CDN, browser-only), no new dependencies
**Storage**: Browser localStorage (`mx5-nc1-alignment-${wheel}` keys)
**Testing**: Standalone `.mjs` script runner (existing pattern); Jest for unit tests (not used here)
**Target Platform**: Headless Chromium via Puppeteer; dev server on `localhost:8080`
**Project Type**: Integration test for a static web application
**Performance Goals**: Complete within 3 minutes on standard hardware
**Constraints**: No new npm dependencies; must not modify existing test files or production JS
**Scale/Scope**: 1 new test file (~300 LOC), 1 npm script addition, 0 production code changes

---

## Constitution Check

*GATE: Must pass before implementation.*

| Constitution Principle | Status | Notes |
|----------------------|--------|-------|
| **I. Measurement Precision & Accuracy** | ✅ PASS | Test validates exact values with zero tolerance on raw table; ±0.05° on chart aggregates (chart aggregation is the source of the looser tolerance, not the pipeline) |
| **II. Offline-First Architecture** | ✅ PASS | Test writes to localStorage; no backend calls; no data leaves browser context |
| **III. Zero Security Assumptions** | ✅ PASS | Test-only code; no auth, no credentials, no sensitive data |
| **IV. Comprehensive Integration Testing** | ✅ PASS | This feature *adds* to the integration test suite; adds 5 test sections, expands from 33+ to 38+ passing tests |
| **V. Raw Data as Single Source of Truth** | ✅ PASS | Test asserts each report section (table, chart, washer) independently from the same raw fixture — matches the constitution's architectural intent |

**No violations. No complexity tracking needed.**

---

## Project Structure

### Documentation (this feature)

```text
specs/002-full-e2e-data-integrity/
├── plan.md              # This file
├── research.md          # Phase 0 output (all unknowns resolved)
├── data-model.md        # Phase 1 output (entities, formula, file structure)
└── tasks.md             # Phase 2 output (/speckit.tasks command output)
```

### Source Code Impact

```text
tests/
└── integration/
    └── e2e-data-integrity.mjs        # NEW — primary deliverable

package.json                           # MODIFY — add test:e2e-data-integrity script
```

**No production source changes.** `js/`, `site/`, `js/dummy-data-generator.js`, `js/input-grid.js`, `js/report-engine.js` are all read-only for this feature.

---

## Implementation Design

### Test File: `tests/integration/e2e-data-integrity.mjs`

#### Module-level constants

```javascript
// BOLT_POSITIONS, CASTER_MULTIPLIER, TARGET_CAMBER, TARGET_CASTER — imported from js/constants.js
// or duplicated as literals to avoid import complexity in test context

const WHEELS = ['FL', 'FR', 'RL', 'RR'];
const TOLERANCE_RAW = 0;        // exact match at 2 d.p. display precision
const TOLERANCE_CHART = 0.05;   // ±0.05° for chart aggregation
```

#### FIXTURE constant

Pre-computed static object. Shape per research/data-model:

```javascript
const FIXTURE = {
  FL: {
    wheel: 'FL', axle: 'front',
    gridData: { /* 13×13 object, all values as strings to 2 d.p. */ },
    toe: null,
    expectedChart: {
      camber: { first: -0.76, mid: -1.09, last: -1.42 },
      caster: { first: 4.62, mid: 4.98, last: 4.60 },
      targetCamber: -1.1, targetCaster: 5.0
    },
    expectedOptima: {
      bestCell: { frontBolt: 0, rearBolt: 0 },   // placeholder — set from pre-computation
      washerPositionTexts: { frontBolt: 'Position: +0', rearBolt: 'Position: +0' },
      rotationAngles: { frontBolt: 0, rearBolt: 0 }
    }
  },
  FR: { /* same structure */ },
  RL: { /* same structure, toe: 0.12, caster: null in chart */ },
  RR: { /* same structure, toe: 0.14, caster: null in chart */ }
};
```

> **Implementation note**: Exact `gridData` values and `expectedOptima` are computed offline via a one-time Node.js script (documented in the quickstart). The script imports `report-engine.js` and runs `processWheel()` on each wheel's grid data derived from the bilinear formula. The resulting bestCell values are then frozen into this constant.

#### Section A — Setup

```
1. Launch browser (headless: true, args: ['--no-sandbox'])
2. waitForServer(BASE_URL)
3. Navigate to /input.html
4. page.evaluate(() => localStorage.clear())
5. For each wheel in WHEELS:
   setWheelData(page, wheel, FIXTURE[wheel].gridData)
   if (FIXTURE[wheel].toe != null):
     setToeData(page, wheel, FIXTURE[wheel].toe)
```

#### Section B — Input Page Validation

Confirms the localStorage data is reflected in the DOM.

```
For each wheel in WHEELS:
  1. Click #wheel-selector button[data-wheel="${wheel}"]
  2. await page.waitForTimeout(500)
  3. For each probe cell in [(−6,−6), (0,0), (+6,+6)]:
     a. Read input[data-front="${f}"][data-rear="${r}"][data-key="zero"].value
     b. Assert === FIXTURE[wheel].gridData[f][r].zero
```

#### Section C — Report Page: Raw Data Table

```
1. Navigate to /report.html
2. await page.waitForSelector('#section-table', { visible: true })

For each wheel in WHEELS:
  1. Click #tab-table-${wheel.toLowerCase()}
  2. await page.waitForTimeout(800)
  
  For each metric in applicable metrics for this wheel:
    a. Click #btn-metric-${metric}    // 'camber', 'caster' (front), 'toe' (rear)
    b. await page.waitForTimeout(300)
    c. For each (frontBolt, rearBolt) in BOLT_POSITIONS × BOLT_POSITIONS:
       - Read cell value from #table-container [data-front="${f}"][data-rear="${r}"]
         (or positional row/col index — confirmed during implementation via table-builder.js)
       - expected = derive from FIXTURE[wheel].gridData using metric formula:
           camber: gridData[f][r].zero
           caster: (1.462 * |neg20 - pos20|).toFixed(2) for front wheels
           toe:    FIXTURE[wheel].toe (same for all cells)
       - Assert displayed value === expected (string comparison at 2 d.p.)
```

#### Section D — Report Page: Chart Validation

```
For each wheel in WHEELS:
  1. Click #tab-chart-${wheel.toLowerCase()}
  2. await page.waitForTimeout(1000)
  3. Read chart debug:
     const debug = JSON.parse(await page.$eval('#main-chart',
       el => el.dataset.chartDebug))
  4. Assert debug.wheel === wheel
  5. Assert debug.frontBolts.length === 13
  6. Assert approxEqual(debug.cambers[0], FIXTURE[wheel].expectedChart.camber.first, 0.05)
  7. Assert approxEqual(debug.cambers[6], FIXTURE[wheel].expectedChart.camber.mid, 0.05)
  8. Assert approxEqual(debug.cambers[12], FIXTURE[wheel].expectedChart.camber.last, 0.05)
  9. Assert approxEqual(debug.targetCamber, FIXTURE[wheel].expectedChart.targetCamber, 0.001)
  10. If front wheel:
     Assert approxEqual(debug.casters[0], FIXTURE[wheel].expectedChart.caster.first, 0.05)
     Assert approxEqual(debug.casters[6], FIXTURE[wheel].expectedChart.caster.mid, 0.05)
     Assert approxEqual(debug.casters[12], FIXTURE[wheel].expectedChart.caster.last, 0.05)
     Assert approxEqual(debug.targetCaster, FIXTURE[wheel].expectedChart.targetCaster, 0.001)
  11. Cross-wheel uniqueness: cambers[0] for this wheel ≠ cambers[0] for any other wheel
```

#### Section E — Report Page: Washer Diagrams

```
1. await page.waitForSelector('.washer-bolt-row')
2. Read all washer positions:
   const allPositions = page.evaluate(() =>
     Array.from(document.querySelectorAll('.washer-position'))
       .map(el => el.textContent.trim()))
   // Returns 8 strings (2 per wheel × 4 wheels), in DOM order:
   //   [FL_front, FL_rear, FR_front, FR_rear, RL_front, RL_rear, RR_front, RR_rear]

3. For each wheel at index i in WHEELS (0=FL, 1=FR, 2=RL, 3=RR):
   frontPos = allPositions[i * 2]
   rearPos  = allPositions[i * 2 + 1]
   Assert frontPos === FIXTURE[wheel].expectedOptima.washerPositionTexts.frontBolt
   Assert rearPos  === FIXTURE[wheel].expectedOptima.washerPositionTexts.rearBolt

4. Optional cross-validation via rotation group:
   const rotations = page.evaluate(() =>
     Array.from(document.querySelectorAll('svg.washer-svg > g'))
       .map(g => g.getAttribute('transform')))
   // rotations[0] → "rotate(X 160 160)" for FL front bolt
   // Extract X and assert X === FIXTURE[wheel].expectedOptima.rotationAngles.frontBolt
```

### NPM Script

Add to `package.json` `scripts`:
```json
"test:e2e-data-integrity": "node tests/integration/e2e-data-integrity.mjs"
```

### Pre-computation Script (one-time, not checked in as a test)

A throwaway `scripts/compute-e2e-optima.mjs` to derive expected optima:

```javascript
import { processWheel } from '../js/report-engine.js';
// Run processWheel() on each wheel's generated fixture data
// Print bestCell per wheel
// Copy values into FIXTURE constant in e2e-data-integrity.mjs
```

This script runs once during development, its output is frozen into the test fixture, then the script can be discarded or kept as a documentation aid in `scripts/`.

---

## Algorithm: Fixture Grid Data Generation

The fixture grid values are generated by this formula (implemented in the pre-computation script):

```javascript
function generateCell(wheel, frontBolt, rearBolt) {
  const nf = (frontBolt + 6) / 12;   // 0..1
  const nr = (rearBolt + 6) / 12;    // 0..1

  const { camberCorners, camberBulgeSign, camberCurvature,
          spreadCorners, spreadBulgeSign, spreadCurvature } = WHEEL_PARAMS[wheel];

  // Bilinear interpolation over four corners
  function bilinear(corners) {
    return corners.LL * (1-nf)*(1-nr)
         + corners.LR * (1-nf)* nr
         + corners.HL *  nf  *(1-nr)
         + corners.HR *  nf  * nr;
  }

  // Cross-term (produces the arc / bulge)
  function crossTerm(curvature, bulgeSign) {
    return bulgeSign * curvature * nf * (1-nf) * nr * (1-nr) * 4;
    // × 4 to scale to full curvature amplitude (nf*(1-nf) max = 0.25)
  }

  const camberBase = bilinear(camberCorners) + crossTerm(camberCurvature, camberBulgeSign);
  const spreadBase = bilinear(spreadCorners) + crossTerm(spreadCurvature, spreadBulgeSign);

  // For rear wheels: no caster spread
  const isRear = ['RL', 'RR'].includes(wheel);
  const spread = isRear ? 0 : spreadBase;

  return {
    neg20: (camberBase - spread / 2).toFixed(2),
    zero:   camberBase.toFixed(2),
    pos20: (camberBase + spread / 2).toFixed(2)
  };
}
```

**WHEEL_PARAMS** (per wheel):

```javascript
const WHEEL_PARAMS = {
  FL: {
    camberCorners:   { LL: -0.70, LR: -0.85, HL: -1.35, HR: -1.50 },
    camberBulgeSign: +1, camberCurvature: 0.60,
    spreadCorners:   { LL: 3.15, LR: 3.69, HL: 3.15, HR: 3.15 },
    spreadBulgeSign: -1, spreadCurvature: 0.30,
  },
  FR: {
    camberCorners:   { LL: -0.60, LR: -0.75, HL: -1.25, HR: -1.40 },
    camberBulgeSign: -1, camberCurvature: 0.60,
    spreadCorners:   { LL: 3.22, LR: 3.63, HL: 3.22, HR: 3.22 },
    spreadBulgeSign: +1, spreadCurvature: 0.30,
  },
  RL: {
    camberCorners:   { LL: -1.40, LR: -1.56, HL: -2.04, HR: -2.20 },
    camberBulgeSign: +1, camberCurvature: 0.60,
    spreadCorners:   { LL: 0, LR: 0, HL: 0, HR: 0 },  // no spread for rear
    spreadBulgeSign:  0, spreadCurvature: 0,
  },
  RR: {
    camberCorners:   { LL: -1.30, LR: -1.46, HL: -1.94, HR: -2.10 },
    camberBulgeSign: -1, camberCurvature: 0.60,
    spreadCorners:   { LL: 0, LR: 0, HL: 0, HR: 0 },
    spreadBulgeSign:  0, spreadCurvature: 0,
  },
};
```

---

## Quickstart: Developer Workflow for This Feature

1. **Generate fixture values**:
   ```bash
   node scripts/compute-e2e-optima.mjs
   # Prints bestCell and chart boundary values per wheel
   # Copy output into FIXTURE constant in e2e-data-integrity.mjs
   ```

2. **Run the test**:
   ```bash
   npm run start &             # Start dev server (or use existing instance)
   npm run test:e2e-data-integrity
   ```

3. **Expected output**: Each of the 5 sections (A–E) prints PASS/FAIL per assertion with wheel, metric, and cell coordinates on failure.

4. **Adding a wheel**: Extend `FIXTURE` with the new wheel's `gridData`, `expectedChart`, and `expectedOptima`. Re-run compute script if optima change.
