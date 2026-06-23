# Implementation Plan: White-Label Theming System

**Branch**: `001-white-label-theming` | **Date**: 2026-06-23 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/001-white-label-theming/spec.md`

## Summary

Refactor `site/css/shared.css` from a bespoke dark design to a white-label base using
CSS custom properties. Add two VS Code-matched theme layers (Light+, Dark+) toggled
via a persistent config menu. Standardize typography to three scales site-wide.
Remove the Google Fonts external dependency in favor of a system monospace stack.

## Technical Context

**Language/Version**: HTML5, Vanilla JavaScript (ES6+), CSS3

**Primary Dependencies**: None new. Puppeteer + Jest (existing, for tests).

**Storage**: `localStorage` key `angularity-theme` (values: `"light"` | `"dark"` | absent = white-label default)

**Testing**: Puppeteer integration tests via Jest (`npm run test:all-sync`), dev server on port 8080

**Target Platform**: Browser — all modern evergreen browsers (Chrome, Firefox, Safari, Edge)

**Project Type**: Static web application (client-side only, no server runtime)

**Performance Goals**: Theme switch perceived as instant (< 100ms); zero flash of unstyled/wrong-theme content (FOUC) on page load

**Constraints**: No external network requests for fonts or theming (constitution Principle I — offline capable); no build step; no new runtime dependencies

**Scale/Scope**: 3 HTML pages, 1 primary CSS file (2601 lines), 2 new theme layers, 1 new JS module, new Puppeteer test suite

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Client-Side Purity | ✅ PASS | Theme stored in `localStorage`. No server calls. Google Fonts removed → system fonts (offline safe). |
| II. Physics-First Correctness | ✅ PASS | No alignment math touched. Functional color coding explicitly preserved. |
| III. Integration-Test Coverage | ✅ PASS (gated) | New Puppeteer tests required for theme switching, persistence, and FOUC prevention. Must not reduce 149-test baseline. |
| IV. Discrete Grid Fidelity | ✅ PASS | No grid logic touched. |
| V. Independent Wheel Optimization | ✅ PASS | No scoring or optimization logic touched. |

**Post-design re-check**: Required after Phase 1. Verify functional color variables are untouched.

## Project Structure

### Documentation (this feature)

```text
specs/001-white-label-theming/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
└── tasks.md             # Phase 2 output (/speckit-tasks)
```

### Source Code (repository root)

```text
site/
├── css/
│   └── shared.css          # Refactored: white-label base + [data-theme] overrides + typography scale
├── js/
│   ├── theme-manager.js    # NEW: theme persistence, config menu, FOUC-safe init
│   └── [existing modules unchanged]
├── index.html              # Updated: FOUC inline script in <head>, config menu HTML
├── input.html              # Updated: FOUC inline script in <head>, config menu HTML
└── report.html             # Updated: FOUC inline script in <head>, config menu HTML

tests/
└── theme/
    └── theme-switching.test.js   # NEW: Puppeteer tests for switching, persistence, FOUC
```

## Complexity Tracking

No constitution violations. No complexity justification required.
