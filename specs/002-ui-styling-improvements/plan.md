# Implementation Plan: UI Styling Improvements

**Branch**: `002-ui-styling-improvements` | **Date**: 2026-06-25 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/002-ui-styling-improvements/spec.md`

## Summary

Purely CSS + HTML class-attribute changes to fix three latent styling bugs (hardcoded dark hex borders, undefined `--bg-light` variable, undersized paragraph text), eliminate inline presentational styles in `index.html`, and add visual appeal improvements (spacing scale, section visual hierarchy, primary button prominence, read-only field treatment, and consistent focus states). No JavaScript, no logic, no new files. All visual state lives in `shared.css`.

## Technical Context

**Language/Version**: Vanilla HTML5 / CSS3 / JavaScript (ES6+) — no transpile, no build step

**Primary Dependencies**: None for styling. Test harness: Puppeteer (jest-puppeteer 9.0), Jest 29.5, Node.js dev server on port 8080

**Storage**: `localStorage` only (no changes)

**Testing**: `npm run test:all-sync` — Puppeteer integration suite (149-test baseline). Unit tests via `jest --config tests/jest.unit.config.cjs`

**Target Platform**: Desktop browser (Chromium via Puppeteer); mobile responsive via existing `@media` breakpoints (unchanged)

**Project Type**: Static web application — single CSS file, three HTML pages

**Performance Goals**: No regression in page load. CSS-only changes have negligible size impact

**Constraints**: All changes in `site/css/shared.css` and `site/*.html` class attributes only. No new files. No JavaScript edits. No inline styles introduced

**Scale/Scope**: 1 CSS file (2654 lines), 3 HTML files, ~13 CSS variable additions, ~8 new/updated CSS rules, ~15 HTML attribute changes

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Client-Side Purity | ✅ PASS | No server calls added. No data leaves browser. Changes are CSS/HTML only |
| II. Physics-First Correctness | ✅ PASS | No math, calculation, or scoring code touched |
| III. Integration-Test Coverage | ✅ PASS | Puppeteer tests verify behaviour (DOM state, values), not pixel-level styling. Baseline of 149 tests must pass after changes |
| IV. Discrete Grid Fidelity | ✅ PASS | Input grid cell dimensions and layout unchanged |
| V. Independent Wheel Optimization | ✅ PASS | No report engine, scoring, or recommendation logic touched |

**Post-Design Re-check**: No violations anticipated. Re-verify III after implementation: run full `npm run test:all-sync` and confirm 149-test count holds.

## Project Structure

### Documentation (this feature)

```text
specs/002-ui-styling-improvements/
├── plan.md              ← this file
├── research.md          ← Phase 0 findings
├── data-model.md        ← CSS design token inventory
├── quickstart.md        ← validation guide
└── tasks.md             ← Phase 2 output (not yet created)
```

### Source Code (changed files only)

```text
site/
├── css/
│   └── shared.css       ← all CSS changes (variables, rules, focus states)
├── index.html           ← class additions + inline style removal
├── input.html           ← .primary class on Save CSV button only
└── report.html          ← no changes (inline styles there are JS-driven state)
```

**Structure Decision**: Single static site with one CSS file. All changes are additive to `shared.css` (new variables, new utility classes, updated existing rules) and class attribute edits in HTML. No restructuring.

**Note on report.html inline styles**: `report.html` contains ~12 inline styles, but inspection shows they are all either (a) JS-toggled `display:none` state or (b) complex one-off layout wrappers. These are outside the spec scope (FR-005 targets `index.html`) and should be addressed in a future cleanup pass.

## Complexity Tracking

No constitution violations. Section not applicable.
