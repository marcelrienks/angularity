# Research: Parametric Scatter & Bolt Sensitivity Charts

## Decision 1: Chart type for parametric scatter

**Decision**: Use Chart.js `type: 'scatter'` with one dataset per camber bolt group.

**Rationale**: Chart.js v4 scatter type accepts `{x, y}` data points natively. One dataset
per camber bolt group enables per-group colour coding and per-group connecting lines
(using `showLine: true`). This avoids a custom plugin.

**Alternatives considered**:
- Custom Canvas2D (like the preview artifact) — more control, but bypasses Chart.js tooltip
  and responsive infrastructure already used by the rest of the report page. Rejected.
- Single dataset with custom point colours — no natural grouping; connecting lines within
  a group are not possible. Rejected.

---

## Decision 2: Which rows to plot in the scatter

**Decision**: Filter `rows169` to `isInterpolated === false` — show only measured points.

**Rationale**: At density=5, `rows169` contains 169 rows (13×13 grid), of which 25 are
measured and 144 are interpolated by `interpolateGrid()`. Plotting all 169 creates an
over-dense chart that obscures the structure. Measured-only plots show exactly what was
physically tested. The sensitivity charts likewise use only measured points.

**Alternatives considered**:
- Plot all 169 with different markers for interpolated — adds visual noise without
  meaningful benefit for the "find best bolt" use case. Deferred as a possible future toggle.
- Plot only the "required" positions from `getRequiredPositions()` — equivalent to
  filtering `isInterpolated === false` when the user has entered exactly the required
  positions, but is fragile if extra measurements were entered. Filter by `isInterpolated`
  is more robust.

---

## Decision 3: Colour scheme for camber bolt groups

**Decision**: Generate a diverging colour sequence indexed by position in `getBoltPositions()`.
Use a fixed 5-colour palette for the default density (5) and a 13-step interpolated
scale for the maximum density (13). At density 5, colours from cool to warm:
`#818cf8` (indigo) → `#22d3ee` (cyan) → `#a3e635` (lime) → `#fb923c` (orange) → `#e879f9` (fuchsia).

**Rationale**: The diverging sequence communicates "how far from the optimal camber bolt"
intuitively. At higher densities, generated intermediate hues fill the scale. The 5-colour
palette is validated against the existing dark theme and is clearly distinguishable.

**Alternatives considered**:
- Re-use COLOURS.camber / COLOURS.caster — only two colours, insufficient for 5+ groups.
- Random or arbitrary colours — lose the "cool = negative bolt, warm = positive bolt" intuition.

---

## Decision 4: Sensitivity chart structure

**Decision**: Use Chart.js `type: 'line'` with `x` as a linear axis (bolt position integer),
one dataset per "held-constant" bolt value. In Camber mode: x = camberBolt, datasets = one
per casterBolt value. In Caster mode: x = casterBolt, datasets = one per camberBolt value.

**Rationale**: Line chart naturally shows trends as one bolt sweeps. Using Chart.js linear
x-axis (not category) keeps bolt positions evenly spaced and correctly handles gaps if not
all positions are measured. Same pattern as the existing `buildMainChart` x-axis config.

**Alternatives considered**:
- Shared axes / multi-axis — adds complexity without benefit for mini-charts. Rejected.
- SVG sparklines — would require a new rendering path; Chart.js is already loaded. Rejected.

---

## Decision 5: Rear wheel Y-axis for scatter and sensitivity Caster mode

**Decision**: For rear wheels (RL, RR), scatter Y-axis = `row.toe` (not `row.caster`),
labelled "Toe (°)", and the target crosshair Y = `targets.toe`. In sensitivity Caster mode,
the Y-axis also uses `row.toe` with the toe target reference line.

**Rationale**: The `casterBolt` field controls toe (not caster) on rear wheels, as established
in the bug-fix work documented in the project history. `DerivedRow` carries `toe: number|null`
for this purpose. Rear wheel targets have `caster: null` and `toe: TARGET_TOE_REAR`.

**Alternatives considered**:
- Rename the scatter Y-axis dynamically on tab switch — same outcome, just the implementation
  path for rendering.

---

## Decision 6: Mini-chart rebuild on mode toggle

**Decision**: On toggle, destroy all four Chart.js instances and rebuild them with the new
mode. Use the existing `destroyChart(instance)` utility.

**Rationale**: Chart.js does not support changing the fundamental axis role (Y metric, dataset
grouping) without a full rebuild. Rebuild is fast (< 100ms per mini-chart) and avoids
stale dataset state.

**Alternatives considered**:
- `chart.data = …; chart.update()` — works for data, but axis labels and scale configuration
  also change between modes. A full options re-set is more complex than a rebuild. Rejected.

---

## Decision 7: `buildMainChart` API compatibility

**Decision**: Rename `buildMainChart` to `buildScatterChart`. Update the single call site in
`report-page.js` accordingly. The existing `destroyChart`, `updateChartNote` remain unchanged.

**Rationale**: `buildMainChart` is only called from one place in `report-page.js`. Renaming
avoids a misleading name for a function that now builds a scatter, not a line chart. The
signature remains `(canvasId, rows169, wheel, targets)` for a drop-in replacement.

**Alternatives considered**:
- Keep `buildMainChart` as an alias — unnecessary indirection. Rejected.
