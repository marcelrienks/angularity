# Implementation Plan: Parametric Scatter & Bolt Sensitivity Charts

**Branch**: `001-scatter-sensitivity-charts` | **Date**: 2026-06-28 | **Spec**: [spec.md](spec.md)

## Summary

Replace the current dual-y-axis line chart with a parametric scatter plot (achieved
camber° vs achieved caster°) that plots each measured bolt combination as a 2D point,
grouped and colour-coded by camber bolt value. Add a new "Bolt Sensitivity" section
below with a 2×2 grid of mini-charts (one per wheel) showing how each angle responds
as one bolt is swept across its range. All charts use the existing Chart.js v4 instance
and the existing `rows169` data structure — no new data processing is required.

## Technical Context

**Language/Version**: Vanilla JavaScript ES6+ (browser-native, no build step)

**Primary Dependencies**: Chart.js v4.4.4 (CDN, already loaded in report.html)

**Storage**: N/A — read-only from existing `WheelResult.rows169` in memory

**Testing**: Puppeteer integration tests via Jest (`npm run test:all-sync`, dev server on port 8080 required)

**Target Platform**: Browser (desktop-first, responsive)

**Project Type**: Client-side web application (static files)

**Performance Goals**: Chart render ≤ 1 second on reference device; mode toggle feels instant

**Constraints**: Client-side only (no external API calls); no new npm dependencies; Chart.js
already loaded; measurement density is configurable (3–13 points per axis = 9–169 measured
combinations); charts must handle all valid densities

**Scale/Scope**: 4 wheels × up to 169 combinations per wheel; 4 mini-charts in sensitivity section

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Client-Side Purity | ✅ PASS | Pure UI changes; no external calls; reads existing in-memory `rows169` |
| II. Physics-First Correctness | ✅ PASS | No new physics calculations; existing computed camber/caster values used verbatim |
| III. Integration-Test Coverage | ✅ PASS (conditional) | New Puppeteer tests required (see quickstart.md); existing test baseline must not shrink |
| IV. Discrete Grid Fidelity | ✅ PASS | Scatter shows only measured (`isInterpolated === false`) rows; no new interpolation in recommendations |
| V. Independent Wheel Optimization | ✅ PASS | Each wheel's scatter and mini-chart are independent; wheel tabs control selection |

**Constitution Check: PASS** — no violations, no complexity justification required.

## Project Structure

### Documentation (this feature)

```text
specs/001-scatter-sensitivity-charts/
├── plan.md              ← this file
├── research.md          ← Phase 0 output
├── data-model.md        ← Phase 1 output
├── quickstart.md        ← Phase 1 output
├── contracts/
│   └── chart-module.md  ← Phase 1 output
└── checklists/
    └── requirements.md
```

### Source Code Changes

```text
js/
├── chart-builder.js     ← modify: replace buildMainChart with buildScatterChart;
│                           add buildSensitivityChart; keep destroyChart
└── report-page.js       ← modify: wire scatter; add sensitivity section + toggle logic

site/
└── report.html          ← modify: add section-sensitivity DOM

tests/integration/
└── report-scatter-charts.mjs   ← new: integration tests for scatter + sensitivity
```

**Structure Decision**: Single project. All changes are contained to three existing files
plus one new test file. No new modules required.
