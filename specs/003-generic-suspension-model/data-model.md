# Data Model: Generic 4-Wheel Suspension Geometry Tool

**Feature**: 003-generic-suspension-model | **Date**: 2026-06-26

---

## Entities

### 1. GridCellData

Represents one measurement at a specific bolt-position combination for one wheel.

**Front wheels (FL, FR) — unchanged:**
```
GridCellData {
  neg20: string   // Camber (degrees) at steering swept anti-clockwise
  zero:  string   // Camber (degrees) at straight-ahead (0°)
  pos20: string   // Camber (degrees) at steering swept clockwise
}
```
The three readings are used to derive both camber (from `zero`) and caster (from `|pos20 - neg20| × casterMultiplier`).

**Rear wheels (RL, RR) — extended:**
```
GridCellData {
  neg20: string   // Camber (degrees) at straight-ahead — mirrors zero
  zero:  string   // Camber (degrees) at straight-ahead (the measured value)
  pos20: string   // Camber (degrees) at straight-ahead — mirrors zero
  toe:   string   // Toe (degrees per wheel) at straight-ahead [NEW]
}
```
`neg20` and `pos20` remain equal to `zero` (rear has no caster sweep). `toe` is a new field holding the per-wheel toe angle at straight-ahead, measured via string-box or angle gauge.

**Validation rules:**
- All values are strings in the UI (empty = not measured)
- On processing: parsed to `Number`; non-finite values treated as absent
- Bolt positions: integers in `[−6, +6]`

---

### 2. GridState

In-memory state for all four wheels.

```
GridState {
  [wheel: 'FL'|'FR'|'RL'|'RR']: {
    [frontBolt: −6..+6]: {
      [rearBolt: −6..+6]: GridCellData
    }
  }
}
```

`frontBolt` and `rearBolt` are string keys (JSON-serialised integers).

**Rear wheel axis semantics:**
- `frontBolt` → Toe Bolt position (−6 to +6)
- `rearBolt` → Camber Bolt position (−6 to +6)

**Front wheel axis semantics:**
- `frontBolt` → Camber Bolt position (−6 to +6)
- `rearBolt` → Caster Bolt position (−6 to +6)

---

### 3. AlignmentTargets

Five scalar values representing desired alignment angles per wheel.

```
AlignmentTargets {
  camber:     number   // Front camber (degrees) — default: −1.1
  caster:     number   // Front caster (degrees) — default: 5.0
  toeFront:   number   // Front toe per wheel (degrees) — default: 0.07
  camberRear: number   // Rear camber (degrees) — default: −1.5
  toeRear:    number   // Rear toe per wheel (degrees) — default: 0.07
}
```

All five already exist in `targets-manager.js` under `TARGET_STORAGE`. No changes needed.

---

### 4. AlignmentConfig (extended)

Configuration constants for measurement setup.

```
AlignmentConfig {
  casterInputMode:    'steering-ratio' | 'wheel-degrees'
  steeringRatio:      number   // e.g. 15 (for 15:1)
  casterWheelDegrees: number   // e.g. 24 (degrees)
  wheelDiameter:      number   // Overall wheel + tyre diameter (mm) — default: 469
  rimDiameter:        number   // Metal rim outer diameter (mm) — default: 330  [NEW]
}
```

`rimDiameter` is stored under key `alignment_constant_rim_diameter`. It is distinct from `wheelDiameter`:
- `wheelDiameter`: used in `toeDegreesToResultantMm` (tyre contact patch method)
- `rimDiameter`: used in `stringBoxToeToMm` (string-box setup at rim edge)

---

### 5. DerivedRow (existing, extended for rear)

Output of `processWheel()` per bolt combination.

```
DerivedRow {
  frontBolt:      number    // Bolt axis 1 position
  rearBolt:       number    // Bolt axis 2 position
  camber:         number    // Measured camber at straight-ahead
  caster:         number|null // Measured caster (null for rear wheels)
  toe:            number|null // Measured toe (null if absent or front)  [rear only — already exists as field]
  camberDelta:    number    // camber − targetCamber
  casterDelta:    number|null
  toeDelta:       number|null // toe − targetToe (for rear)
  score:          number    // Golden Rule score (lower = better)
  isInterpolated: boolean
}
```

`toeDelta` already flows through `_computeGoldenRuleScore` (weighted 1.2×). For rear wheels, wiring it up requires passing `targetToeRear` to `processWheel` and populating `toe` from the cell's `toe` field.

---

### 6. StringBoxSetup (new, display-only)

Derived value displayed in front wheel report. Not stored.

```
StringBoxSetup {
  targetDegrees: number    // Front toe target per wheel (degrees)
  deltaMm:       number    // rimDiameter × tan(targetDegrees × π/180)
  rimDiameterMm: number    // The rim diameter used in calculation
}
```

Computed in `report-ui.js` when rendering front (FL/FR) wheel report. Requires both `toeFront` target and `rimDiameter` config to be present.

---

## State Transitions

### Rear Cell Toe — Input Flow
```
User enters camber → stored in zero (and mirrored to neg20/pos20)
User enters toe   → stored in toe field
                 ↓
CSV export → 6-column row: frontBolt, rearBolt, neg20, zero, pos20, toe
                 ↓
localStorage save → { neg20, zero, pos20, toe } per cell
                 ↓
report-engine processWheel → DerivedRow with toeDelta populated
```

### Front Toe — Display Flow
```
User sets toeFront target (degrees) on index page
User sets rimDiameter config (mm) on index page
               ↓
Front report renders → StringBoxSetup computed
               ↓
Report displays: "Target Y° → set string box delta to X mm per side"
```

---

## Storage Schema

### localStorage Keys (after rename)

| Key | Type | Content |
|-----|------|---------|
| `alignment-FL` | JSON object | GridState for Front Left |
| `alignment-FR` | JSON object | GridState for Front Right |
| `alignment-RL` | JSON object | GridState for Rear Left |
| `alignment-RR` | JSON object | GridState for Rear Right |
| `alignment-toe-FL` | Unused (legacy) | — |
| `alignment-toe-FR` | Unused (legacy) | — |
| `alignment-toe-RL` | Unused (legacy) | — |
| `alignment-toe-RR` | Unused (legacy) | — |
| `alignment_target_camber` | number | Front camber target |
| `alignment_target_caster` | number | Front caster target |
| `alignment_target_toe_front` | number | Front toe target (degrees/wheel) |
| `alignment_target_camber_rear` | number | Rear camber target |
| `alignment_target_toe_rear` | number | Rear toe target (degrees/wheel) |
| `alignment_constant_wheel_diameter` | number | Overall wheel+tyre diameter (mm) |
| `alignment_constant_rim_diameter` | number | Metal rim diameter (mm) [NEW] |
| `alignment_constant_caster_input_mode` | string | 'steering-ratio' or 'wheel-degrees' |
| `alignment_constant_steering_ratio` | number | e.g. 15 |
| `alignment_constant_caster_wheel_degrees` | number | e.g. 24 |

Note: `align_v2_` LS_PREFIX is used for a separate key family (session/config level). See [contracts/localStorage-schema.md](contracts/localStorage-schema.md) for full detail.
