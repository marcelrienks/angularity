# Contract: chart-builder.js Module API

**Module**: `js/chart-builder.js`
**Type**: ES Module (browser)

This document defines the public API that `report-page.js` relies on after this feature
is implemented. It replaces the existing `buildMainChart` export.

---

## `buildScatterChart(canvasId, rows169, wheel, targets)`

Builds and returns a Chart.js parametric scatter chart on the given canvas element.
Replaces `buildMainChart` with the same call signature.

### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `canvasId` | `string` | DOM id of an existing `<canvas>` element |
| `rows169` | `DerivedRow[]` | All rows from `WheelResult.rows169`; function filters internally to `!isInterpolated` |
| `wheel` | `string` | Wheel identifier (`'FL'`, `'FR'`, `'RL'`, `'RR'`) — controls rear-wheel axis labelling |
| `targets` | `{ camber: number, caster: number\|null, toe: number\|null }` | Target values for crosshair position and tooltip distance |

### Returns

`Chart` — a Chart.js v4 instance. Caller is responsible for destroying it via `destroyChart()`
before rebuilding.

### Behaviour

- Filters `rows169` to measured-only (`isInterpolated === false`)
- Groups filtered rows by `camberBolt`; each group becomes one Chart.js dataset with `showLine: true`
- Each group receives a colour from the diverging scale based on its index in the sorted camber bolt positions
- Renders a target crosshair using a custom plugin (two annotation lines at `targets.camber` and `targets.caster` / `targets.toe`)
- Points with `distFromTarget ≤ 0.5°` receive a glow via custom point background
- Tooltip callback exposes: camber bolt, caster bolt, achieved camber°, achieved caster/toe°, distance from target
- For rear wheels (`REAR_WHEELS.includes(wheel)`): Y-axis uses `row.toe`, labelled `"Toe (°)"`, crosshair Y = `targets.toe`
- Returns `null` if the canvas element is not found

---

## `buildSensitivityChart(canvasId, rows169, wheel, targets, mode)`

Builds and returns a Chart.js line chart for one sensitivity mini-chart.

### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `canvasId` | `string` | DOM id of an existing `<canvas>` element |
| `rows169` | `DerivedRow[]` | All rows from `WheelResult.rows169`; filtered internally to `!isInterpolated` |
| `wheel` | `string` | Wheel identifier — controls rear-wheel axis labelling in Caster mode |
| `targets` | `{ camber: number, caster: number\|null, toe: number\|null }` | Target values for reference lines |
| `mode` | `'camber' \| 'caster'` | Which sensitivity axis to display |

### Returns

`Chart` — a Chart.js v4 instance. Returns `null` if canvas not found.

### Behaviour — Camber mode

- X-axis: camber bolt position (linear integer ticks), labelled `"Camber Bolt"`
- Y-axis: achieved camber° (left), labelled `"Camber (°)"`
- One dataset per unique caster bolt value (each with its own colour)
- Horizontal dashed reference line at `targets.camber`

### Behaviour — Caster mode

- X-axis: caster bolt position (linear integer ticks), labelled `"Caster Bolt"`
- Y-axis: achieved caster° or toe° (left), labelled `"Caster (°)"` (front) or `"Toe (°)"` (rear)
- One dataset per unique camber bolt value
- Horizontal dashed reference line at `targets.caster` (front) or `targets.toe` (rear)

---

## `destroyChart(instance)` — unchanged

Safely destroys a Chart.js instance. No-op if `instance` is null or already destroyed.

### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `instance` | `Chart\|null` | Chart.js instance to destroy |

### Returns

`void`

---

## Removed export

`buildMainChart` — removed and replaced by `buildScatterChart` with the same signature.
Any code importing `buildMainChart` must be updated to import `buildScatterChart` instead.
Only one call site exists: `report-page.js:_renderMainChart()`.

`updateChartNote` — unchanged, still exported.
