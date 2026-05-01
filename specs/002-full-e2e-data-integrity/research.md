# Research: Full E2E Data Integrity Integration Test

**Phase 0 output** | Feature: `002-full-e2e-data-integrity` | Date: 26 April 2026

All NEEDS CLARIFICATION items from the spec have been resolved through direct code inspection.

---

## Decision 1: Test Architecture — localStorage-Bridge vs UI-Click

**Question**: Should the test (a) write data directly to localStorage and skip the "Load Sample Data" button, or (b) click the button and read back what was stored?

**Decision**: Hybrid approach.
- **Input stage**: Write data directly to localStorage via `page.evaluate()` using `setWheelData(page, wheel, gridData)` (pattern already established in `report-chart-interactions.mjs`, `report-table-rendering.mjs`). This bypasses the UI button and gives the test full control over the exact values stored.
- **Validate input stage**: Navigate to input page and switch to each wheel tab to confirm the grid DOM reflects the written data (reads `input[data-front][data-rear][data-key]`).
- **Report stage**: Read report table cells and chart data, compare against the fixture.

**Rationale**: Direct localStorage write is more reliable than clicking "Load Sample Data" because it avoids dependency on `generateThreeColorGrid()` logic and gives the test complete ownership of the fixture values. The "Load Sample Data" button testing already has its own dedicated test (`load-sample-data-validation.mjs`). This test's purpose is data pipeline integrity, not button behavior.

**Alternatives considered**:
- Click button + read back: Rejected because it makes the test dependent on generator output; a generator bug would mask a pipeline bug.
- Full DOM entry: Rejected as too slow (169 cells × 3 values × 4 wheels = 2028 individual input events).

---

## Decision 2: New Sample Data Generator Function vs Static Fixture

**Question**: Should the new curved sample data live in `dummy-data-generator.js` (exportable) or as a static literal object embedded in the test file?

**Decision**: Static fixture object embedded in the test file as a module-level constant, with a separate standalone generator script to produce the initial values.

**Rationale**:
- The test must be deterministic and self-contained. Importing a generator means any change to the generator breaks the test even when the pipeline is correct.
- A static fixture is unambiguous: the test knows exactly what values to expect.
- The generator design (curved surfaces, per-wheel ranges) is documented in the spec and in this research file so the fixture values can be re-derived if needed.

**Alternatives considered**:
- Export `generateE2ETestGrid(wheel)` from `dummy-data-generator.js` and import it in the test: Rejected for the reason above.
- Update `generateThreeColorGrid` in place: Rejected — it is used by other tests; changing it would break them.

---

## Decision 3: Sample Data Mathematical Design

**Question**: What mathematical formula produces gently curved, directionally distinct, per-wheel unique camber/caster surfaces?

**Decision**: Bilinear base + quadratic bulge term.

### Formula

```
camber(f, r) = A
             + Bf × nf        // linear front slope
             + Br × nr        // linear rear slope
             + C × nf × nr    // cross-term (creates the curved surface)
             + D × (2nf - 1)² × (2nr - 1)²  // quadratic bulge
```

Where:
- `nf = (f + 6) / 12` (normalize front bolt −6→0, +6→1)
- `nr = (r + 6) / 12` (normalize rear bolt)
- `A, Bf, Br, C, D` are per-wheel constants

**Steering spread (for caster derivation)**:
```
steeringSpread(f, r) = P + Qf × nf + Qr × nr + R × nf × nr
```
Caster = `1.462 × steeringSpread`

### Per-Wheel Constants (designed values)

Values satisfy the spec ranges and curve direction requirements:

#### FL — Front Left
| Parameter | Value | Effect |
|-----------|-------|--------|
| Camber at (−6,−6) | −0.70° | Top-left high |
| Camber at (+6,+6) | −1.50° | Bottom-right low |
| Camber at (0,0) | −1.08° (near target −1.1°) | Center near target |
| Midpoint bulge direction | Toward upper-right | C > 0, D < 0 |
| Caster at (−6,+6) | 5.40° | Top-right high |
| Caster at (+6,−6) | 4.60° | Bottom-left low |
| Caster midpoint bulge | Toward lower-right | |

#### FR — Front Right (subtle shift from FL)
| Parameter | Value | Effect |
|-----------|-------|--------|
| Camber at (−6,−6) | −0.60° | ~0.10° shift from FL |
| Camber at (+6,+6) | −1.40° | ~0.10° shift from FL |
| Camber at (0,0) | −0.97° | Shifted from FL |
| Midpoint bulge direction | Toward lower-left | C < 0, D > 0 |
| Caster at (−6,+6) | 5.30° | ~0.10° shift from FL |
| Caster at (+6,−6) | 4.70° | ~0.10° shift from FL |
| Caster midpoint bulge | Toward upper-left | |

#### RL — Rear Left (significant difference from front; no caster, has toe)
| Parameter | Value | Effect |
|-----------|-------|--------|
| Camber at (−6,−6) | −1.40° | Top-left high |
| Camber at (+6,+6) | −2.20° | Bottom-right low |
| Camber at (0,0) | −1.80° | Well below front range |
| Midpoint bulge direction | Toward upper-right | Matches FL direction |
| Toe (scalar per wheel) | 0.12 mm | Stored in toe localStorage |

#### RR — Rear Right (subtle shift from RL)
| Parameter | Value | Effect |
|-----------|-------|--------|
| Camber at (−6,−6) | −1.30° | ~0.10° shift from RL |
| Camber at (+6,+6) | −2.10° | ~0.10° shift from RL |
| Camber at (0,0) | −1.70° | |
| Midpoint bulge direction | Toward lower-left | Opposite to RL |
| Toe (scalar per wheel) | 0.14 mm | |

**Uniqueness guarantee**: No two adjacent cells (front or rear bolt differ by 1) share the same camber or caster value to 2 decimal places. This is ensured by the cross-term and bulge term in the formula.

---

## Decision 4: DOM Selector Map

All selectors confirmed by code inspection.

### Input Page (`/input.html`)

| Purpose | Selector |
|---------|----------|
| Wheel tab (FL) | `#wheel-selector button[data-wheel="FL"]` |
| Wheel tab (FR) | `#wheel-selector button[data-wheel="FR"]` |
| Wheel tab (RL) | `#wheel-selector button[data-wheel="RL"]` |
| Wheel tab (RR) | `#wheel-selector button[data-wheel="RR"]` |
| Clear button | `#btn-clear` |
| Load sample | `#btn-sample` |
| Cell input (zero°) | `input.cell-input[data-front="${f}"][data-rear="${r}"][data-key="zero"]` |
| Cell input (neg20°) | `input.cell-input[data-front="${f}"][data-rear="${r}"][data-key="neg20"]` |
| Cell input (pos20°) | `input.cell-input[data-front="${f}"][data-rear="${r}"][data-key="pos20"]` |
| Toe input | `#toe-input` |

### Report Page (`/report.html`)

| Purpose | Selector |
|---------|----------|
| Table wheel tab FL | `#tab-table-fl` |
| Table wheel tab FR | `#tab-table-fr` |
| Table wheel tab RL | `#tab-table-rl` |
| Table wheel tab RR | `#tab-table-rr` |
| Chart wheel tab FL | `#tab-chart-fl` |
| Chart wheel tab FR | `#tab-chart-fr` |
| Chart wheel tab RL | `#tab-chart-rl` |
| Chart wheel tab RR | `#tab-chart-rr` |
| Metric: Camber | `#btn-metric-camber` |
| Metric: Caster | `#btn-metric-caster` |
| Metric: Toe | `#btn-metric-toe` |
| Raw table container | `#table-container` |
| Chart canvas | `#main-chart` |
| Washer section | `.washer-section` (present when data loaded) |
| Washer bolt rows | `.washer-bolt-row` |
| Washer position text | `.washer-position` (text: "Position: +X") |
| Washer SVGs | `.washer-svg` |
| Rotation group | `svg.washer-svg > g` (first `<g>`, has `transform="rotate(deg cx cy)"`) |

### localStorage Keys

| Purpose | Key |
|---------|-----|
| Grid data (per wheel) | `mx5-nc1-alignment-${wheel}` (e.g. `mx5-nc1-alignment-FL`) |
| Toe value (per wheel) | `mx5-nc1-alignment-toe-${wheel}` |

**Grid data format** (confirmed from code):
```javascript
{
  [frontBolt: -6..+6]: {
    [rearBolt: -6..+6]: {
      neg20: string,   // camber at −20° steering
      zero:  string,   // camber at 0° steering
      pos20: string    // camber at +20° steering
    }
  }
}
```

**Rear wheel note**: For RL/RR, the input page mirrors `zero` into `neg20` and `pos20` (since rear wheels don't sweep for caster). The test fixture must store all three as the same value for rear wheels.

---

## Decision 5: Chart Data Access Strategy

**Question**: How to read chart data from a canvas element in Puppeteer?

**Decision**: Read `canvas.dataset.chartDebug` (set by `chart-builder.js`) via `page.evaluate()`.

**Confirmed from `chart-builder.js`**:
```javascript
canvas.dataset.chartDebug = JSON.stringify(chartDebug);
window.__alignmentChartDebug = chartDebug;
```

The `chartDebug` object shape:
```javascript
{
  wheel: string,
  frontBolts: number[],       // [−6, −5, ..., +6] — 13 values
  cambers: number[],          // aggregated camber per frontBolt — 13 values (3 d.p.)
  casters: number[],          // aggregated caster per frontBolt — 13 values (3 d.p.), empty for rear
  targetCamber: number,
  targetCaster: number,
  camberCrossing: number|null,
  casterCrossing: number|null
}
```

**Access pattern in test**:
```javascript
const debugData = await page.$eval('#main-chart', el => JSON.parse(el.dataset.chartDebug));
// debugData.cambers[0]  → camber at frontBolt -6
// debugData.cambers[6]  → camber at frontBolt 0 (center)
// debugData.cambers[12] → camber at frontBolt +6
```

**Chart aggregation**: The chart builder calls `_aggregateByFrontBolt(rows169)` which groups the 169 processed rows by frontBolt and returns the value for the "best" rearBolt per frontBolt. The test validates boundary points (indices 0 and 12) and the midpoint (index 6) against derived expected values from the fixture.

**Expected chart value derivation**: The expected chart camber at frontBolt `f` is the `camber` field of the `bestCell` within that frontBolt's 13 rows. Since the test writes the raw grid, it can run the same engine logic in Node to precompute expected chart values — or validate them with a tolerance of ±0.05° (looser than the raw table's exact match) to account for the aggregation choice.

---

## Decision 6: Washer Indicator Validation Strategy

**Question**: How to verify the washer diagram shows the correct bolt position?

**Decision**: Read the `.washer-position` text element (most reliable, human-readable), and optionally cross-validate with the rotation `<g>` transform.

**Confirmed from `washer-diagram.js`**:
- The rotation group: `rotationGroup.setAttribute('transform', `rotate(${position * 15} ${CX} ${CY})`)`
- Position 0 → `rotate(0 160 160)`, Position +3 → `rotate(45 160 160)`, Position −6 → `rotate(-90 160 160)`
- The `.washer-position` div: `pos.textContent = `Position: ${_sign(position)}``
  - `_sign(p)` returns `+0`, `+1`, `+2`, ..., `+6`, `−1`, ..., `−6`

**Washer layout** (report page, all four wheels always rendered):
- 8 washer diagrams total: FL front bolt, FL rear bolt, FR front bolt, FR rear bolt, RL front bolt, RL rear bolt, RR front bolt, RR rear bolt
- 2 washers per wheel column (front bolt then rear bolt)
- Each has one `.washer-position` element

**Access pattern**:
```javascript
const positions = await page.evaluate(() => {
  return Array.from(document.querySelectorAll('.washer-position'))
    .map(el => el.textContent.trim());
  // Returns e.g. ["Position: +1", "Position: −3", "Position: 0", ...]
});
```

**Expected values**: Derived by running the same Golden Rule scoring algorithm on the fixture data in Node.js (importing `report-engine.js` via `processWheel()`) to find `bestCell.frontBolt` and `bestCell.rearBolt` for each wheel. These are pre-computed and embedded in the test fixture as `expectedOptima`.

---

## Decision 7: Raw Data Table Cell Reading Strategy

**Question**: What selectors to use for reading raw data table cell values?

**Resolution**: Needs final selector confirmation via `table-builder.js` inspection. Based on DOM pattern observed in existing tests and the `#table-container` div, table cells are expected to carry `data-front` and `data-rear` attributes matching the bolt positions, similar to the input grid.

**Action**: Read `table-builder.js` during implementation to confirm selectors. If no `data-*` attributes exist on table cells, use row/column index arithmetic. This is a low-risk implementation-time detail.

---

## Decision 8: Test Infrastructure

**Question**: Use standalone `.mjs` script pattern (like existing tests) or Jest runner?

**Decision**: Standalone `.mjs` script, following the exact pattern of existing integration tests.

**Rationale**:
- All existing integration tests are standalone `async function main()` scripts
- They manage their own browser and server lifecycle
- Jest is used for unit tests only (see `jest.unit.config.js`)
- Adding to the standalone pattern avoids Jest configuration changes

**Server lifecycle**: Use `getServerPort()` from `test-server-singleton.js` and `waitForServer()` from `test-wait-helpers.js` (confirmed available, used by existing tests like `report-chart-interactions.mjs`).

---

## Summary: All NEEDS CLARIFICATION Items Resolved

| Item | Status | Decision |
|------|--------|----------|
| Test data write mechanism | Resolved | Direct localStorage write via `page.evaluate()` |
| Sample data format | Resolved | Static fixture in test file, bilinear+quadratic formula |
| Chart data access | Resolved | `canvas.dataset.chartDebug` JSON blob |
| Washer position access | Resolved | `.washer-position` text content |
| Raw table cell selectors | Partially resolved | Confirmed container `#table-container`; cell selectors deferred to `table-builder.js` read |
| Rear wheel differences | Resolved | No caster; neg20=pos20=zero; has toe scalar |
| Test file pattern | Resolved | Standalone `.mjs`, same as existing tests |
| NPM script name | Resolved | `test:e2e-data-integrity` |
