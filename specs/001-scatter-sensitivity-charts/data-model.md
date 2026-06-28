# Data Model: Parametric Scatter & Bolt Sensitivity Charts

All entities below are **derived at render time** from the existing `WheelResult.rows169`
array. No new storage or schema changes are required.

---

## Input: DerivedRow (existing, unchanged)

Source: `WheelResult.rows169` produced by `report-engine.processWheel()`.

| Field | Type | Description |
|-------|------|-------------|
| `camberBolt` | `number` | Camber bolt position integer (e.g. −2 to +2 at density 5) |
| `casterBolt` | `number` | Caster bolt position integer; controls toe on rear wheels |
| `camber` | `number` | Achieved camber in degrees |
| `caster` | `number` | Achieved caster in degrees (front wheels) |
| `toe` | `number\|null` | Achieved toe in degrees (rear wheels); null on front wheels |
| `isInterpolated` | `boolean` | `true` = computed by interpolation; `false` = directly measured |
| `camberDelta` | `number` | `camber − targetCamber` |
| `casterDelta` | `number\|null` | `caster − targetCaster`; null on rear wheels |
| `toeDelta` | `number\|null` | `toe − targetToe`; null on front wheels |
| `score` | `number` | Golden Rule composite score (lower = better) |

**Filter applied by both new chart functions**: `rows169.filter(r => !r.isInterpolated)`
produces only the measured points (25 rows at default density 5).

---

## Derived: ScatterGroup (per camber bolt value)

Built inside `buildScatterChart()` — not persisted.

| Field | Type | Description |
|-------|------|-------------|
| `camberBolt` | `number` | The shared camber bolt value for this group |
| `color` | `string` | CSS hex colour assigned to this group from the diverging scale |
| `data` | `ScatterPoint[]` | Points in this group, sorted by `casterBolt` ascending |

**Validation**: Each group must have at least 1 point. Empty groups (no measured rows for a
camberBolt value) are skipped.

---

## Derived: ScatterPoint (one per measured bolt combination)

| Field | Type | Description |
|-------|------|-------------|
| `x` | `number` | Achieved camber° (front) or toe° (rear) — the horizontal axis value |
| `y` | `number` | Achieved caster° (front) or toe° (rear) — the vertical axis value |
| `camberBolt` | `number` | Stored on point for tooltip access |
| `casterBolt` | `number` | Stored on point for tooltip access |
| `distFromTarget` | `number` | Euclidean distance √((x−tx)²+(y−ty)²) in degrees |
| `isNearTarget` | `boolean` | `distFromTarget ≤ NEAR_TARGET_THRESHOLD` (0.5°) |

**Note on rear wheels**: `x = row.toe`, `y = row.camber` (or `y = row.toe` and `x = row.camberBolt`).
See [research.md Decision 5](research.md) — rear wheel Y-axis uses `toe`, labelled "Toe (°)".

Actually, correction: for the scatter plot on rear wheels, since `casterBolt` controls toe:
- X-axis = achieved camber° (same as front — camberBolt controls camber on all wheels)
- Y-axis = achieved toe° (not caster)

---

## Derived: SensitivitySeries (per sensitivity mini-chart)

Built inside `buildSensitivityChart()` — not persisted.

### Camber Mode

One series per unique `casterBolt` value found in the measured rows.

| Field | Type | Description |
|-------|------|-------------|
| `label` | `string` | `"KB +N"` — the caster bolt value held constant |
| `color` | `string` | Colour from the same diverging scale indexed by casterBolt position |
| `data` | `{x, y}[]` | Points sorted by camberBolt ascending; x = camberBolt, y = camber° |

### Caster Mode

One series per unique `camberBolt` value found in the measured rows.

| Field | Type | Description |
|-------|------|-------------|
| `label` | `string` | `"CB +N"` — the camber bolt value held constant |
| `color` | `string` | Same diverging scale indexed by camberBolt position |
| `data` | `{x, y}[]` | Points sorted by casterBolt ascending; x = casterBolt, y = caster° (front) or toe° (rear) |

---

## Targets Object (existing, passed in from report-page.js)

| Field | Type | Front wheels | Rear wheels |
|-------|------|-------------|-------------|
| `camber` | `number` | `TARGET_CAMBER` (e.g. −1.1°) | `TARGET_CAMBER_REAR` (e.g. −1.5°) |
| `caster` | `number\|null` | `TARGET_CASTER` (e.g. 5.0°) | `null` |
| `toe` | `number\|null` | `TARGET_TOE_FRONT` or `null` | `TARGET_TOE_REAR` (e.g. 0.07°) |

---

## Constant: NEAR_TARGET_THRESHOLD

`0.5` degrees — a scatter point is highlighted with a glow when its Euclidean distance from
the target crosshair is ≤ 0.5°. This is not user-configurable in this feature.
