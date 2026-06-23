# Testing

**Eccentric Bolt Alignment System**  
Last updated: June 23, 2026

---

## Test Architecture

Two layers:

| Layer | Tool | Purpose |
|-------|------|---------|
| Unit | Jest + Babel | Pure function correctness — math, scoring, interpolation |
| Integration | Puppeteer | End-to-end browser behaviour — UI rendering, localStorage, page navigation |

---

## Running Tests

```bash
npm test                    # Full suite (unit + all integration)
npm run test:unit           # Unit tests only (no browser)
npm run test:unit:watch     # Unit tests in watch mode
npm run test:coverage       # Unit tests with coverage report
npm run test:<name>         # Single integration suite (see package.json scripts)
```

---

## Unit Tests (`tests/unit/`)

Covers all pure JS modules. No browser, no DOM, no network.

| File | What it tests |
|------|--------------|
| `math-utils.test.js` | `calculateCaster`, `calculateCasterMultiplier`, `toeDegreesToResultantMm`, `calculateDeltas`, `getColorThreshold`, `formatAngle`, `formatMillimeters` |
| `interpolation.test.js` | Bilinear interpolation, sparse grid fallback, edge cases |
| `report-engine.test.js` | Golden Rule scoring (monotonicity invariant), `processWheel`, `symmetryAnalysis`, top-lists, rear fallback |
| `washer-math.test.js` | Bolt position → SVG coordinate conversion |
| `constants.test.js` | Constant values and ordering |
| `localstorage-io.test.js` | Persistence read/write |
| `input-grid.test.js` | Grid state management |
| `ui-modules.test.js` | UI module structure |

### Key invariants protected by unit tests

- **Scoring monotonicity**: worsening camber always raises the Golden Rule score. A position with higher `|camberDelta|` must never score lower than one with lower `|camberDelta|` when caster is equal. Tests probe the old inversion point (|camberDelta| crossing 0.5°).
- **Caster formula**: `|pos20 − neg20| / (2 × sin(wheelAngle))` — absolute value, correct for both wheels.
- **Bilinear fallback**: off-diagonal cells in sparse grids use nearest measured value, never 0.
- **Sort direction**: `topByCamberDelta` / `topByCasterDelta` sort by `Math.abs()`, not signed delta.

---

## Integration Tests (`tests/integration/`)

Puppeteer tests that launch a real browser against the dev server. Each suite is independently runnable.

### Home Screen

**`home-screen-validation.mjs`** — Target display, navigation, edit form  
Verifies all 5 alignment targets (camber, caster, toe-front, camber-rear, toe-rear) match `constants.js` values and display with correct formatting. Checks edit form toggles and page navigation.

### Input Screen

**`input-grid-rendering.mjs`** — Grid structure, headers, cell inputs, accessibility  
169 cells render, column/row headers match bolt positions (−6 to +6), required positions (−6/−3/0/+3/+6) highlighted, each cell has 3 numeric inputs, ARIA structure intact.

**`input-wheel-management.mjs`** — Wheel tabs, data isolation, persistence  
FL tab active by default. Data entered in FL does not appear in FR and vice versa. Switching tabs preserves previously entered data. Page reload maintains data integrity.

**`input-csv-operations.mjs`** — Save/load CSV, file format, validation  
CSV export has correct headers (Front, Rear, Zero, Pos20, Neg20) and 169 data rows. CSV import populates grid correctly. Wheels maintain independent datasets.

**`camber-sync.mjs`** — Data persistence across pages  
Verifies camber values written to localStorage appear identically on the report page. Tests GREEN/ORANGE/RED colour tier classification (±0.15° / ±0.40° thresholds from TARGET_CAMBER = −1.1°).

**`camber-sweep-sync.mjs`** — Sweep data and caster calculation  
Verifies neg20/pos20 readings sync between pages. Validates caster colour tiers (±0.25° / ±0.60° from TARGET_CASTER = 5.0°). Tests data persistence, not raw calculation correctness.

**`load-sample-data-validation.mjs`** — Sample data generation per wheel  
Confirms sample data button generates plausible measurements for all four wheels independently.

### Report Screen

**`report-table-rendering.mjs`** — Table structure, focused indicators, colour coding  
13×13 table renders with dual-value cells (camber/caster). Focused indicators limited to top 3–5 per metric. Blue boxes for camber-best, green for caster-best, gradient for both. Interpolated cells italic. Colour coding toggle present.

**`report-chart-interactions.mjs`** — Chart rendering, wheel switching, legend  
Chart canvas renders at correct size. Legend shows target values with degree symbol. FL/FR tabs switch chart data. Dual-axis structure maintained.

**`combination-chart-validation.mjs`** — Chart data mapping, target lines  
Data points correctly mapped. Target lines visible for both camber and caster.

**`color-coding-ui.mjs`** — Dynamic colour toggle, CSS classes  
Cells have correct CSS classes (`target-met` / `near-target` / `off-target`) in camber mode. Clicking "By Caster" radio updates classes without page reload. Colour changes correspond to correct thresholds for the selected mode.

**`target-values-validation.mjs`** — Target display in legend  
Chart note paragraph contains both camber and caster targets. Individual spans (`#chart-note-camber`, `#chart-note-caster`) populated from `constants.js`. Values formatted with degree symbol.

**`clear-empty-cycle.mjs`** — Empty state transitions  
Clear action resets to empty state correctly.

**`multi-field-sync.mjs`** — Sustained synchronisation  
Multiple field changes sync correctly across page navigations.

---

## Troubleshooting

| Issue | Solution |
|-------|---------|
| Port 8080 in use | `lsof -i :8080` then `kill -9 <PID>` |
| Module not found | `rm -rf node_modules && npm install` |
| Browser won't start | Ensure 300 MB free disk space |
| Tests timeout | Increase `testTimeout` in `jest.config.js` |
