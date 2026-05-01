# Data Model: Full E2E Data Integrity Integration Test

**Phase 1 output** | Feature: `002-full-e2e-data-integrity` | Date: 26 April 2026

---

## Entities

### 1. WheelFixture

One per wheel (FL, FR, RL, RR). The complete, static, pre-computed dataset for a single wheel used throughout the test. Single source of truth for all assertions.

```
WheelFixture {
  wheel:          string              // 'FL' | 'FR' | 'RL' | 'RR'
  axle:           'front' | 'rear'
  gridData:       GridFixture         // 13×13 raw measurement data
  toe:            number | null       // scalar toe value (mm), null for front wheels
  expectedChart:  ChartFixture        // expected chart line values at key indices
  expectedOptima: OptimaFixture       // expected bolt positions from report engine
}
```

### 2. GridFixture

The raw measurement grid for one wheel. Matches the localStorage format exactly.

```
GridFixture {
  [frontBolt: integer -6..+6]: {
    [rearBolt: integer -6..+6]: {
      neg20: string   // camber at −20° steering, e.g. "-1.23"
      zero:  string   // camber at 0° steering, e.g. "-1.10"
      pos20: string   // camber at +20° steering, e.g. "-0.97"
    }
  }
}
```

**Constraints**:
- All 169 cells (13×13) populated (the test writes a dense grid)
- String values formatted to 2 decimal places (matching generator output)
- For rear wheels (RL, RR): `neg20 === zero === pos20` (no caster sweep)
- No two cells in the same wheel share identical `zero` values at 2 d.p. precision (uniqueness guarantee)

### 3. ChartFixture

Expected chart line values at the three validation points (first, median, last front bolt position). Derived from the GridFixture by running report-engine logic.

```
ChartFixture {
  camber: {
    first:  number    // expected aggregated camber at frontBolt -6
    mid:    number    // expected aggregated camber at frontBolt 0
    last:   number    // expected aggregated camber at frontBolt +6
  }
  caster: {           // null for rear wheels
    first:  number    // expected aggregated caster at frontBolt -6
    mid:    number    // expected aggregated caster at frontBolt 0
    last:   number    // expected aggregated caster at frontBolt +6
  } | null
  targetCamber: number   // e.g. -1.1
  targetCaster: number | null   // e.g. 5.0 for front, null for rear
}
```

**Tolerance**: Chart values validated to ±0.05° (looser than raw table exact match) to account for report-engine aggregation selecting the "best" rearBolt per frontBolt group.

### 4. OptimaFixture

The expected output of the report engine's `bestCell` for each wheel. Used to validate the washer diagram indicator positions.

```
OptimaFixture {
  bestCell: {
    frontBolt: integer    // -6..+6
    rearBolt:  integer    // -6..+6
  }
  washerPositionTexts: {
    frontBolt: string     // e.g. "Position: +0"
    rearBolt:  string     // e.g. "Position: −3"
  }
  rotationAngles: {
    frontBolt: number     // degrees = frontBolt × 15
    rearBolt:  number     // degrees = rearBolt × 15
  }
}
```

---

## Sample Data Design

### Curve Shape Formula

Each wheel's camber surface uses a bilinear + cross-term formula over the normalised bolt grid:

```
nf = (frontBolt + 6) / 12        // 0 at -6, 1 at +6
nr = (rearBolt + 6) / 12         // 0 at -6, 1 at +6

camber(nf, nr) = cornerLL
              + (cornerLR - cornerLL) × nr          // linear rear slope
              + (cornerHL - cornerLL) × nf          // linear front slope
              + curvature × nf × (1 - nf) × nr × (1 - nr) × bulgeSign
```

Where:
- `cornerLL` = value at (−6,−6) [top-left of grid]
- `cornerLR` = value at (−6,+6) [top-right]
- `cornerHL` = value at (+6,−6) [bottom-left]
- `bulgeSign` = +1 or −1 per wheel (controls whether the curve bulges above or below the bilinear surface)
- `curvature` = 0.6° (determines how much the arc deviates from linear)

The steering spread (which determines caster) uses the same formula but with independent constants.

### Wheel-Specific Design Values

#### FL — Front Left

**Camber surface corners**:
```
(-6,-6): -0.70°    (-6,+6): -0.85°
(+6,-6): -1.35°   (+6,+6): -1.50°
```
Bulge sign: +1 (bulges toward upper-right, i.e., less negative in centre)
Curvature: 0.60°

**Steering spread corners** (steeringSpread = |neg20 - pos20|):
```
(-6,-6): 3.15    (-6,+6): 3.69    → casters: 4.60°, 5.40°
(+6,-6): 3.15    (+6,+6): 3.15    → uniform bottom row
```
Wait — to get caster top-right high and bottom-left low:
```
steeringSpread(nf, nr) = 3.15 + 0.54 × (1 - nf) × nr   // high at (nf=0, nr=1)
```
Bulge sign: −1 (toward lower-right)

**Derived caster range**: 4.60° to 5.40°

**Toe**: None (front wheel)

#### FR — Front Right

**Camber surface corners** (0.10° offset from FL):
```
(-6,-6): -0.60°    (-6,+6): -0.75°
(+6,-6): -1.25°   (+6,+6): -1.40°
```
Bulge sign: −1 (toward lower-left — opposite to FL)
Curvature: 0.60°

**Steering spread corners**:
```
steeringSpread(nf, nr) = 3.22 + 0.41 × (1 - nf) × nr
```
Caster range: 4.70° to 5.30°
Bulge sign: +1 (toward upper-left — opposite to FL)

**Toe**: None

#### RL — Rear Left

**Camber surface corners** (significantly more negative than front):
```
(-6,-6): -1.40°    (-6,+6): -1.56°
(+6,-6): -2.04°   (+6,+6): -2.20°
```
Bulge sign: +1 (toward upper-right, same direction as FL)
Curvature: 0.60°

**Steering spread**: Not applicable (rear wheels have no caster sweep). `neg20 = pos20 = zero`.

**Toe**: 0.12 mm (stored in `mx5-nc1-alignment-toe-RL`)

#### RR — Rear Right

**Camber surface corners** (0.10° offset from RL):
```
(-6,-6): -1.30°    (-6,+6): -1.46°
(+6,-6): -1.94°   (+6,+6): -2.10°
```
Bulge sign: −1 (toward lower-left — opposite to RL)
Curvature: 0.60°

**Toe**: 0.14 mm (stored in `mx5-nc1-alignment-toe-RR`)

---

## Value Uniqueness Verification

The formula produces unique values at 2 d.p. because:
1. The linear slopes produce ~0.065° camber change per bolt step (~0.80° / 12 steps)
2. The cross-term and bulge produce an additional ±0.10° deviation at the quarter-grid points
3. No two cells are equidistant from all corners simultaneously (asymmetric bulge)

Adjacent cells differ by ≥ 0.05° (half of one 0.10° step in the slope), which rounds to distinct values at 2 d.p. (0.10° increments).

---

## Test File Structure

```
tests/integration/e2e-data-integrity.mjs
├── FIXTURE constant           // WheelFixture[] for FL, FR, RL, RR (pre-computed)
├── BOLT_POSITIONS             // [-6..-+6]
├── CASTER_MULTIPLIER          // 1.462 (matches constants.js)
├── Target values              // TARGET_CAMBER = -1.1, TARGET_CASTER = 5.0
│
├── Section A: Setup
│   ├── clearStorage(page)
│   └── writeWheelFixtures(page, FIXTURE)  // writes all 4 wheels to localStorage
│
├── Section B: Input Page Validation
│   └── for each wheel in [FL, FR, RL, RR]:
│       ├── click wheel tab
│       ├── read DOM cell values at required positions (-6,-6), (0,0), (+6,+6)
│       └── compare to fixture
│
├── Section C: Report Page — Raw Data Table
│   └── for each wheel in [FL, FR, RL, RR]:
│       ├── click table wheel tab
│       ├── click Camber metric button → read and compare all visible cells
│       ├── click Caster metric button → read and compare all visible cells (front only)
│       └── click Toe metric button → read and compare (rear only)
│
├── Section D: Report Page — Chart Validation
│   └── for each wheel in [FL, FR, RL, RR]:
│       ├── click chart wheel tab
│       ├── read canvas.dataset.chartDebug
│       ├── compare cambers[0], cambers[6], cambers[12] vs ChartFixture.camber
│       ├── compare casters[0], casters[6], casters[12] vs ChartFixture.caster (front)
│       └── compare targetCamber, targetCaster vs expected
│
└── Section E: Report Page — Washer Diagram
    └── for each wheel in [FL, FR, RL, RR]:
        ├── read .washer-position texts for that wheel's column
        └── compare frontBolt and rearBolt position texts vs OptimaFixture
```

---

## Pre-Computation of Expected Optima

The `OptimaFixture` values (expected `bestCell` per wheel) cannot be known without running the Golden Rule scoring. Since `report-engine.js` is a pure ES module importable in Node.js, the optima are pre-computed once using:

```javascript
import { processWheel } from '../js/report-engine.js';

const fixture = generateE2EFixture('FL');  // helper to convert corners formula to full grid
const result = processWheel(fixture.gridData);
console.log(result.bestCell.frontBolt, result.bestCell.rearBolt);
```

This is a one-time offline calculation. The resulting bolt positions are embedded statically in the `FIXTURE` constant so the test never re-runs the engine. This maintains test isolation.

---

## Source Code Impact (files to create or modify)

| File | Action | Scope |
|------|--------|-------|
| `tests/integration/e2e-data-integrity.mjs` | **Create** | New test file (~300 LOC) |
| `package.json` | **Modify** | Add `test:e2e-data-integrity` npm script |
| `js/dummy-data-generator.js` | **No change** | Existing generator untouched |
| `js/input-grid.js` | **No change** | Existing button handler untouched |
| `js/report-engine.js` | **No change** | Algorithm unchanged |
| `js/table-builder.js` | **Read only** | Confirm cell selectors during implementation |
