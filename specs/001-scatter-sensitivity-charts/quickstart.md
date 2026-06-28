# Quickstart: Validation Guide

## Prerequisites

1. Dev server running on port 8080: `npm start` (or equivalent static server)
2. FR alignment CSV available — use `site/data/alignment-FR.csv` (sample data)
3. Browser with devtools open (Console tab) for error monitoring

---

## Scenario 1 — Scatter replaces line chart (FR wheel, default density)

1. Open `http://localhost:8080/site/report.html`
2. Load `alignment-FR.csv` via the FR file loader
3. **Expected**: The chart section shows a scatter plot (not a line chart).
   - 25 coloured dots visible (5 camber bolt groups × 5 measured caster bolt positions)
   - 5 distinct colours, one per camber bolt value (−2 to +2)
   - Dots within each group connected by a dashed line
   - A crosshair marker visible at the configured camber and caster targets

4. Hover over any dot.
   **Expected**: Tooltip shows camber bolt, caster bolt, achieved camber°, achieved caster°,
   and distance from target in degrees.

5. Hover over a dot near the crosshair.
   **Expected**: That dot has a visible glow or highlight distinguishing it from far dots.

---

## Scenario 2 — Wheel tab switch

1. Load both FL and FR CSVs.
2. Click the FR tab in the chart section.
   **Expected**: Scatter updates to FR data.
3. Click FL tab.
   **Expected**: Scatter updates to FL data. No JavaScript errors in console.

---

## Scenario 3 — Rear wheel label

1. Load a rear wheel CSV (RL or RR).
2. Switch to the RL or RR tab in the chart section.
   **Expected**: Y-axis labelled "Toe (°)" (not "Caster (°)").
   Target crosshair Y position reflects the toe target (default 0.07°).

---

## Scenario 4 — Bolt Sensitivity section, Camber mode (default)

1. Load FR CSV.
2. Scroll to the "Bolt Sensitivity" section below the scatter.
   **Expected**: Section visible with "Camber" button active and "Caster" button inactive.
   FR mini-chart shows data; FL/RL/RR cards show placeholder state.

3. In the FR mini-chart (Camber mode):
   - X-axis label: "Camber Bolt"
   - Y-axis label: "Camber (°)"
   - 5 lines visible (one per caster bolt value)
   - Horizontal dashed line at target camber (−1.1° by default)

---

## Scenario 5 — Bolt Sensitivity toggle to Caster mode

1. With FR data loaded, click "Caster" button in the Bolt Sensitivity section.
   **Expected**: All mini-charts rebuild.
   FR mini-chart (Caster mode):
   - X-axis label: "Caster Bolt"
   - Y-axis label: "Caster (°)"
   - 5 lines visible (one per camber bolt value)
   - Horizontal dashed line at target caster (5.0° by default)

2. Click "Camber" to switch back.
   **Expected**: Charts rebuild again to Camber mode. No stale state from Caster mode.

---

## Scenario 6 — All four wheels loaded

1. Load all four wheel CSVs.
2. Verify the Bolt Sensitivity section shows four populated mini-charts (no placeholders).
3. Toggle between Camber and Caster modes — all four update simultaneously.

---

## Scenario 7 — Integration test suite

```bash
# From repo root with dev server running on port 8080:
npx jest tests/integration/report-scatter-charts.mjs --forceExit
```

**Expected**: All tests in `report-scatter-charts.mjs` pass.
Existing test count must not decrease (149-test baseline check):

```bash
npm run test:all-sync
```

**Expected**: All previously passing tests continue to pass.

---

## Data Values Cross-Check

After loading `alignment-FR.csv` (sample data), open the "Raw Data Summary" table and
compare values against the scatter tooltip for the same bolt combination.

For bolt combination (camberBolt=0, casterBolt=0):
- Table cell value = scatter tooltip camber° value ✓
- Caster tab table value = scatter tooltip caster° value ✓

Any discrepancy indicates a data mapping bug between the table and the scatter.

---

## Troubleshooting

| Symptom | Likely Cause |
|---------|-------------|
| Scatter shows 0 dots | `rows169` filtered to only interpolated rows — check `isInterpolated` field |
| Wrong Y-axis label on rear wheel | `REAR_WHEELS.includes(wheel)` check missing or inverted |
| Mini-charts don't rebuild on toggle | `destroyChart()` not called before `buildSensitivityChart()` |
| Console error on wheel tab switch | Old scatter instance not destroyed before new one built |
| Points not highlighted near target | `distFromTarget` calculation uses wrong target field for rear wheels |
