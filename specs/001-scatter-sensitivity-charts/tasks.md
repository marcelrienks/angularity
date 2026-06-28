# Tasks: Parametric Scatter & Bolt Sensitivity Charts

**Input**: Design documents from `specs/001-scatter-sensitivity-charts/`

**Spec**: [spec.md](spec.md) · **Plan**: [plan.md](plan.md) · **Contracts**: [contracts/chart-module.md](contracts/chart-module.md)

**Format**: `[ID] [P?] [Story?] Description with file path`
- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: US1 / US2 / US3 maps to spec.md user stories

---

## Phase 1: Setup

**Purpose**: Verify the existing layout supports the new charts. No new project structure required —
all changes land in three existing files plus one new test file.

- [x] T001 Confirm `<canvas id="main-chart">` in `site/report.html` has no fixed-height constraint
  that would break the scatter chart, and verify `.chart-wrapper` in `site/css/shared.css` uses
  `height` (not `min-height` only) so the scatter renders at a visible size.
  *If height is missing or zero, add an appropriate fixed height (e.g. 420px) to `.chart-wrapper`.*

---

## Phase 2: Foundational (Blocking Prerequisite)

**Purpose**: Shared colour helper used by both scatter and sensitivity chart functions.
Must be complete before Phase 3 or Phase 4 work begins.

**⚠️ CRITICAL**: T003 and T006 both depend on this.

- [x] T002 Add `_SCATTER_COLOURS` constant (array of 13 CSS hex strings, diverging cool→warm)
  and `_getGroupColour(index, total)` helper to `js/chart-builder.js`.
  - `_SCATTER_COLOURS`: 13-entry array covering density-13 maximum.
    Suggested values indexed 0–12 (centre = 6 maps to lime/neutral):
    `['#7c3aed','#6366f1','#818cf8','#22d3ee','#67e8f9','#a3e635','#fde68a','#fb923c','#f87171','#e879f9','#d946ef','#a855f7','#8b5cf6']`
    (adjust for clear distinctness against dark background)
  - `_getGroupColour(index, total)`: maps `index` (0-based position in sorted group list)
    to a colour from `_SCATTER_COLOURS`, evenly distributed across the array when `total < 13`.
    Formula: `Math.round(index / (total - 1) * 12)` clamped to [0, 12].
    Edge case: `total === 1` → return middle colour (index 6).

**Checkpoint**: Colour helper available — scatter and sensitivity implementation can proceed.

---

## Phase 3: User Story 1 — Identify Best Bolt Combination at a Glance (P1) 🎯 MVP

**Goal**: The dual-y-axis line chart is replaced by a parametric scatter plot. Every measured
bolt combination appears as a colour-coded dot at its (camber°, caster°) coordinate. A crosshair
marks the target. Dots near the target glow. Hovering shows exact bolt positions and angle values.

**Independent Test**: Load `alignment-FR.csv`, open report, verify scatter renders with ≥1 dot,
a visible crosshair, and tooltip appears on hover. Line chart is gone.

### Implementation for User Story 1

- [x] T003 [US1] Add `buildScatterChart(canvasId, rows169, wheel, targets)` to `js/chart-builder.js`:
  - Filter input to measured rows: `const pts = rows169.filter(r => !r.isInterpolated)`
  - Group `pts` by `camberBolt`. Collect unique camberBolt values, sort ascending. Each value → one Chart.js dataset.
  - For each group: `{ label: 'CB +N', data: [{x, y, camberBolt, casterBolt}], showLine: true,
    borderColor: color, backgroundColor: color, borderDash: [3,3], borderWidth: 1.5,
    pointRadius: 6, pointHoverRadius: 9, type: 'scatter' }`
  - **Rear wheel** (`REAR_WHEELS.includes(wheel)`): `x = row.camber`, `y = row.toe` (not caster).
    Front/rear: `x = row.camber`, `y = row.caster`.
  - **Target crosshair**: use a custom inline plugin (`id: 'scatterCrosshair'`) in `plugins: [...]`.
    In `afterDatasetsDraw`: draw two dashed lines (one vertical at `targets.camber`, one horizontal
    at front: `targets.caster`, rear: `targets.toe`). Draw a small circle at intersection.
    Colour: `#22d3ee` (cyan), lineWidth: 1, setLineDash([6,4]).
  - **Near-target glow**: compute `distFromTarget = Math.hypot(x - tx, y - ty)` per point.
    Use Chart.js `pointBackgroundColor` as a per-point callback in dataset options — Chart.js v4
    supports arrays for per-point styling. Build two arrays per dataset before creating chart:
    `pointBgColors[]` and `pointRadii[]`. Points with dist ≤ 0.5: `pointBgColors[i] = '#00ff88'`,
    `pointRadii[i] = 8`. Others: group colour.
  - **Tooltip**: set `plugins.tooltip.callbacks.label` to return:
    `"CB ${_sign(pt.camberBolt)} / KB ${_sign(pt.casterBolt)} · ${camber.toFixed(2)}° / ${y.toFixed(2)}° · Δ ${dist.toFixed(2)}°"`
  - **Axes**: `x: { type:'linear', title: { text:'Camber (°)' } }`,
    `y: { type:'linear', title: { text: isRear ? 'Toe (°)' : 'Caster (°)' } }`
  - Options: `responsive: true, maintainAspectRatio: false, animation: false`
  - Return the `new Chart(canvas, config)` instance, or `null` if canvas not found.
  - Keep `destroyChart` and `updateChartNote` exports unchanged.

- [x] T004 [US1] Update `js/report-page.js`:
  - Change import: `buildMainChart` → `buildScatterChart` (same file, same module path)
  - In `_renderMainChart()`: change call from `buildMainChart(...)` to `buildScatterChart(...)`
  - No other changes to argument list or destroy logic — signature is identical

- [x] T005 [US1] Update chart-note paragraph in `site/report.html`:
  - Find the `<p class="chart-note paragraph" id="chart-note">` element
  - Replace its content with: `"Each point = one measured bolt combination · X = achieved camber° · Y = achieved caster° · Colour = camber bolt group · ✕ = target (Camber <span id='chart-note-camber'></span> / Caster <span id='chart-note-caster'></span>)"`
  - Keep the existing `<span id="chart-note-camber">` and `<span id="chart-note-caster">` spans
    so `updateChartNote()` in chart-builder.js continues to work.

**Checkpoint**: Scatter renders, crosshair visible, tooltip works on hover. Line chart gone.

---

## Phase 4: User Story 2 — Understand Which Bolt Controls Which Angle (P2)

**Goal**: A "Bolt Sensitivity" section below the scatter shows a 2×2 grid of mini-charts,
one per wheel. Camber/Caster toggle switches all four charts between the two modes simultaneously.

**Independent Test**: With FR data loaded, see Bolt Sensitivity section with FR chart populated,
three placeholders. Toggle Camber↔Caster, FR chart updates. No errors.

### Implementation for User Story 2

- [x] T006 [US2] Add `buildSensitivityChart(canvasId, rows169, wheel, targets, mode)` to
  `js/chart-builder.js`:
  - Filter to measured: `const pts = rows169.filter(r => !r.isInterpolated)`
  - **Camber mode** (`mode === 'camber'`):
    - Group `pts` by `casterBolt`. Unique casterBolt values → one dataset per value.
    - Each dataset: `{ label: 'KB ${_sign(kb)}', data: group.map(r => ({x: r.camberBolt, y: r.camber}))
      .sort((a,b)=>a.x-b.x), borderColor: colour, borderWidth: 1.5, pointRadius: 3 }`
    - X-axis: `{ type:'linear', title:{ text:'Camber Bolt' }, ticks:{ stepSize:1 } }`
    - Y-axis: `{ type:'linear', title:{ text:'Camber (°)' } }`
    - Target reference: extra dataset `{ label:'Target', data: xRange.map(x=>({x, y:targets.camber})),
      borderDash:[5,5], borderColor: COLOURS.camber, pointRadius:0, borderWidth:1 }`
  - **Caster mode** (`mode === 'caster'`):
    - Group `pts` by `camberBolt`. Unique camberBolt values → one dataset per value.
    - Y metric: rear wheel → `r.toe`; front wheel → `r.caster`
    - Each dataset: `{ label: 'CB ${_sign(cb)}', data: group.map(r => ({x: r.casterBolt, y: yMetric(r)}))
      .sort((a,b)=>a.x-b.x), ... }`
    - X-axis: `{ type:'linear', title:{ text:'Caster Bolt' }, ticks:{ stepSize:1 } }`
    - Y-axis: `{ type:'linear', title:{ text: isRear ? 'Toe (°)' : 'Caster (°)' } }`
    - Target reference: `targets.caster` (front) or `targets.toe` (rear) at colour `COLOURS.caster`
  - Common options: `type:'line', responsive:true, maintainAspectRatio:false, animation:false`
  - Shared font/colour config matching existing chart style (Share Tech Mono, COLOURS.muted)
  - Return `new Chart(canvas, config)` or `null` if canvas not found.

- [x] T007 [P] [US2] Add `section-sensitivity` to `site/report.html` immediately after
  the closing `</section>` of `section-chart`:
  ```html
  <section class="sensitivity-section" id="section-sensitivity" style="display:none">
    <h2 class="header">Bolt Sensitivity</h2>
    <p class="section-desc paragraph">
      How each angle responds as one bolt sweeps its full range.
      Each line = one held-constant bolt value.
    </p>
    <div class="color-coding-selector" id="sensitivity-mode-tabs">
      <button class="active sub-header" data-mode="camber" id="btn-sens-camber">Camber</button>
      <button class="sub-header" data-mode="caster" id="btn-sens-caster">Caster</button>
    </div>
    <div class="sensitivity-grid" id="sensitivity-grid">
      <!-- one card per wheel -->
      <div class="sensitivity-card" id="sens-card-FL">
        <div class="card-title sub-header">FL</div>
        <div class="chart-wrapper sensitivity-chart-wrapper">
          <canvas id="sens-chart-FL" aria-label="FL sensitivity chart"></canvas>
        </div>
        <div class="sensitivity-placeholder" id="sens-placeholder-FL">No data loaded</div>
      </div>
      <div class="sensitivity-card" id="sens-card-FR">
        <div class="card-title sub-header">FR</div>
        <div class="chart-wrapper sensitivity-chart-wrapper">
          <canvas id="sens-chart-FR" aria-label="FR sensitivity chart"></canvas>
        </div>
        <div class="sensitivity-placeholder" id="sens-placeholder-FR">No data loaded</div>
      </div>
      <div class="sensitivity-card" id="sens-card-RL">
        <div class="card-title sub-header">RL</div>
        <div class="chart-wrapper sensitivity-chart-wrapper">
          <canvas id="sens-chart-RL" aria-label="RL sensitivity chart"></canvas>
        </div>
        <div class="sensitivity-placeholder" id="sens-placeholder-RL">No data loaded</div>
      </div>
      <div class="sensitivity-card" id="sens-card-RR">
        <div class="card-title sub-header">RR</div>
        <div class="chart-wrapper sensitivity-chart-wrapper">
          <canvas id="sens-chart-RR" aria-label="RR sensitivity chart"></canvas>
        </div>
        <div class="sensitivity-placeholder" id="sens-placeholder-RR">No data loaded</div>
      </div>
    </div>
  </section>
  ```
  Add CSS rules to `site/css/shared.css` for:
  - `.sensitivity-grid`: `display: grid; grid-template-columns: 1fr 1fr; gap: 16px;`
  - `.sensitivity-card`: `background: var(--panel); border: 1px solid var(--border); padding: 12px;`
  - `.sensitivity-chart-wrapper`: `height: 200px; position: relative;`
  - `.sensitivity-placeholder`: `display: none; text-align: center; color: var(--muted); padding: 40px 0; font-size: 12px;`

- [x] T008 [US2] Add sensitivity section wiring to `js/report-page.js`:
  - Add a module-level map `const _wheelResults = { FL: null, FR: null, RL: null, RR: null }` (type `Record<string, WheelResult|null>`).
    Wherever a wheel's result is currently stored/updated (the point where `result` is assigned after processing), also write `_wheelResults[wheel] = result`.
    This gives `_renderSensitivityCharts()` access to all four wheels simultaneously without changing existing single-wheel render logic.
  - Add `charts.sensitivity = { FL: null, FR: null, RL: null, RR: null }` alongside existing `charts.main`
  - Add `let activeSensitivityMode = 'camber'` module-level variable
  - Add function `_renderSensitivityCharts()`:
    - Show `section-sensitivity` via `_showSection('section-sensitivity')`
    - For each wheel in `['FL','FR','RL','RR']`:
      - If `_wheelResults[wheel]` exists: destroy old instance, call
        `buildSensitivityChart('sens-chart-${wheel}', _wheelResults[wheel].rows169, wheel,
        _wheelResults[wheel].targets ?? _getWheelTargets(wheel), activeSensitivityMode)`,
        store in `charts.sensitivity[wheel]`, hide placeholder div, show canvas
      - Else: destroy old instance, show placeholder div, hide canvas
  - Call `_renderSensitivityCharts()` wherever `_renderMainChart()` is called (so both update together)
  - Wire mode toggle buttons: `document.getElementById('sensitivity-mode-tabs').addEventListener('click', e => {`
    `if (!e.target.dataset.mode) return;`
    `activeSensitivityMode = e.target.dataset.mode;`
    `document.querySelectorAll('#sensitivity-mode-tabs button').forEach(b => b.classList.toggle('active', b.dataset.mode === activeSensitivityMode));`
    `_renderSensitivityCharts(); })`

**Checkpoint**: Bolt Sensitivity section visible, Camber↔Caster toggle rebuilds all charts,
loaded wheels show data, unloaded wheels show placeholder.

---

## Phase 5: User Story 3 — All Four Wheels Simultaneously (P3)

US3 requires no new implementation. It is fully satisfied by US2's placeholder/populate logic
working correctly when four wheels are loaded. Covered by integration tests in Phase 6.

---

## Phase 6: Integration Tests & Cleanup

**Purpose**: Verify all user stories end-to-end and remove dead code from chart-builder.js.

- [x] T009 [P] Write `tests/integration/report-scatter-charts.mjs` covering the 7 scenarios
  from `specs/001-scatter-sensitivity-charts/quickstart.md`:
  - **S1 — Scatter renders**: Load FR CSV → evaluate `Chart.getChart('main-chart').config.type`
    in page context → assert equals `'scatter'`; also verify `Chart.getChart('main-chart').data.datasets.length >= 1`
  - **S2 — Wheel tab switch**: Load FL + FR → click FR tab → wait for redraw → click FL tab →
    verify no console errors and chart still present
  - **S3 — Rear wheel label**: Load RL → switch to RL chart tab → verify Y-axis aria-label
    or canvas title contains 'Toe'
  - **S4 — Sensitivity section renders**: Load FR → verify `#section-sensitivity` visible →
    verify `#sens-chart-FR` canvas visible → verify `#sens-placeholder-FR` hidden
  - **S5 — Mode toggle**: Click `#btn-sens-caster` → verify button has `active` class →
    click `#btn-sens-camber` → verify camber button active again, no errors
  - **S6 — Placeholder for missing wheel**: Load FR only → verify `#sens-placeholder-FL`
    is visible (not hidden)
  - **S7 — All four wheels**: Load all four CSVs → verify all four `sens-chart-*` canvases
    visible, all four `sens-placeholder-*` hidden

- [x] T010 Add `report-scatter-charts` to test suite in `tests/test-runner.js` so
  `npm run test:all-sync` includes the new integration test file.

- [x] T011 Remove dead code from `js/chart-builder.js` — functions only used by the old
  `buildMainChart` line chart that no longer exist:
  - `_aggregateByFrontBolt(rows169)` — was used to reduce 169 rows for line chart
  - `_buildGroupBandsPlugin(rows169)` — alternating band background plugin
  - `_buildDropLinesPlugin(cambers, casters, aggregated, targets)` — vertical drop lines at crossings
  - `_findNearestCrossing(values, target)` — interpolation helper for drop lines
  - `_mainChartOptions(aggregated, showCaster, wheel)` — line chart options builder
  - `_comboLabel(f, r)` and `_delta(d)` — if not referenced by any remaining code
  - Verify each function is truly unreferenced before deleting (grep for function name)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (Foundational)**: After Phase 1 — blocks T003 and T006
- **Phase 3 (US1)**: T003 and T004 require T002; T003, T004, T005 can proceed in Phase 3 order
- **Phase 4 (US2)**: T006 requires T002; T007 requires T001; T008 requires T006 + T007
- **Phase 5 (US3)**: No implementation tasks
- **Phase 6 (Cleanup)**: T009 requires T004 + T008; T010 requires T009; T011 after T004

### User Story Dependencies

- **US1 (P1)**: Depends only on T002 (Foundational) — no dependency on US2 or US3
- **US2 (P2)**: Depends only on T002 (Foundational) — no dependency on US1 (different section)
- **US3 (P3)**: Fully satisfied by US2 implementation; no additional tasks

### Within Each User Story

- T003 (chart function) before T004 (wire it) before T005 (update note)
- T006 (chart function) and T007 (DOM) can run in parallel → T008 requires both

### Parallel Opportunities

- T003 [US1] and T006 [US2] are logically independent but share `js/chart-builder.js` — implement
  sequentially in one file; T007 (report.html) can run in parallel with either
- T007 [US2] (report.html DOM) can proceed in parallel with T003 and T006 (different file)
- T009 and T010 (test infrastructure) are independent of each other

---

## Parallel Example: US1 + US2 Start

```text
# After T002 (colour helper) is done:

Stream A (chart-builder.js — sequential, same file):
  T003 → T006          (buildScatterChart then buildSensitivityChart)

Stream B (report.html — parallel with Stream A):
  T007                 (section-sensitivity DOM)

# Then:
  T004 (wire scatter in report-page.js) — needs T003
  T008 (wire sensitivity in report-page.js) — needs T006 + T007
  T005 (update chart note) — needs T004
  T009 (integration tests) — needs T004 + T008
  T010 → T011 (cleanup)
```

---

## Implementation Strategy

### MVP (US1 only — 4 tasks)

1. Phase 1: T001
2. Phase 2: T002
3. Phase 3: T003 → T004 → T005
4. **Validate**: Run quickstart Scenario 1 — scatter renders, crosshair visible, tooltip works
5. Stop and demo before building sensitivity section

### Incremental Delivery

1. MVP (above) → scatter works
2. Add US2: T006 → T007 → T008 → quickstart Scenarios 4 + 5
3. Load all four wheels → verify US3 (quickstart Scenario 6 + 7) — no new code
4. Phase 6: T009 → T010 → T011

---

## Notes

- All tasks modify existing files except T009 (new test file); no scaffolding commands needed
- `destroyChart` and `updateChartNote` are unchanged — zero risk to existing callers
- T011 (dead code removal) is safe only after T004 confirms `buildMainChart` is fully replaced
- Dev server required for T009 integration tests: `npm start` on port 8080
- Before T009: run `npm run test:all-sync` to confirm baseline test count has not regressed
