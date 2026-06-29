# Implementation Plan: Comprehensive Automated Test Suite for Alignment Calculations

**Branch**: `002-comprehensive-calculation-tests` | **Date**: 2026-06-29 | **Spec**: [spec.md](spec.md)

## Summary

Deliver exhaustive automated test suite validating all alignment calculation formulas, invariants, edge cases, data integrity, and prior audit findings. Organize tests into 8 categories (unit, invariant, boundary, regression, cross-validation, symmetry, interpolation, consistency, type, performance, data integrity, audit-specific) with Jest + Puppeteer infrastructure, test fixtures, shared utilities, and CI/CD integration. 54 requirements automated; 100% test coverage of specification; all calculations validated to 0.01° tolerance.

## Technical Context

**Language/Version**: JavaScript ES6+ (browser-native, no build step required)

**Primary Dependencies**: 
- Jest v25.0.0+ (already in devDependencies)
- Puppeteer v24.43.1+ (already in devDependencies)
- jest-puppeteer v9.0.0+ (already in devDependencies)

**Storage**: localStorage for test data (5-10MB sufficient); JSON fixtures checked into repo

**Testing Approach**:
- Unit tests: Jest (functions in isolation)
- Integration tests: Puppeteer + Jest (full UI flow)
- Invariant tests: Property-based assertions (must-always-be-true)
- Performance tests: Timer benchmarks + memory profiling (Chrome DevTools)

**Performance Targets**:
- Unit test suite: < 5 seconds
- Full suite end-to-end: < 60 seconds
- 13×13 grid calculation: 200-500ms
- Chart render: 300-600ms
- No memory leaks over 10 populate/clear cycles

**Constraints**:
- Tests must be read-only (no source code modification)
- Tests must clean up (localStorage cleared after each test)
- Numerical comparisons: 0.01° tolerance
- Browser target: Chrome/Chromium via Puppeteer (default)

## Constitution Check

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Client-Side Purity | ✅ PASS | Tests validate calculations run entirely in browser, no external API calls, data never leaves localStorage |
| II. Physics-First Correctness | ✅ PASS | Tests validate all formulas against known correct values; monotonicity invariant for scoring validated; audit findings re-verified |
| III. Integration-Test Coverage | ✅ PASS (conditional) | New Puppeteer test suite validates primary user journeys; 149-test baseline preserved; regression detection implemented |
| IV. Discrete Grid Fidelity | ✅ PASS | Tests confirm 169-combination exhaustive evaluation, -6 to +6 range, required positions always present, no interpolation in recommendations |
| V. Independent Wheel Optimization | ✅ PASS | Tests validate FL/FR independence, symmetry rules applied correctly, independent optimization per wheel |

**Constitution Check: PASS** — no violations. Feature complies with all core principles.

---

## Phase 0: Research Complete

All clarifications resolved:

1. **Test fixture format**: JSON (stored in `tests/fixtures/`)
2. **CI/CD platform**: GitHub Actions (`.github/workflows/test.yml`)
3. **Performance tolerance**: +10% variance allowed; baseline measured on CI runner
4. **Property-based testing**: Manual assertions (100 random positions per invariant)
5. **Memory leak detection**: Chrome DevTools Memory API via Puppeteer

---

## Phase 1: Design Artifacts

### Data Model

**Test File Structure**:
```
tests/
├── unit/ (calculation-formulas, scoring, color-coding, edge-cases)
├── integration/ (symmetry-locking, csv-integrity, data-persistence, determinism)
├── invariant/ (interpolation-bounds, color-monotonicity, measured-flag, symmetry)
├── regression/ (prior-exports, audit-findings, snapshot)
├── performance/ (calculation-speed, chart-render, memory-leaks, density-switching)
└── fixtures/ (sample-data/, exports/, test-helpers.js)
```

**Test Fixture JSON Schema**:
- version, generatedDate, sampleDataVersion
- wheels: { FL/FR/RL/RR: { gridSize, cells[], targets } }
- cells: frontBolt, rearBolt, measured, isInterpolated, angle360ACW, angle0, angle360CW, expectedCamber, expectedCaster, expectedColor

**Key Entities**:
- GridCell: -6 to +6 positions, measured flag, interpolated flag, 3 angles, expected values
- Wheel: gridSize 5/7/13, all cells, targets (camber/caster/toe)
- TestResult: name, passed, duration, tolerance, actual, expected, message
- PerformanceBaseline: name, avg/min/max duration, stdDev, sampleCount

### Test Contracts

**Jest Pattern**: Arrange → Act → Assert with `toBeCloseTo(expected, 2)` for 0.01° tolerance

**Puppeteer Pattern**: Setup browser → navigate → interact → extract → assert → cleanup localStorage

**Performance Assertions**: `toBeLessThan(threshold)` for ms-based benchmarks

### Quickstart (4 Validation Scenarios)

1. **Formula Correctness**: `npm run test:calculation-unit` validates caster/camber/interpolation with known inputs
2. **Data Integrity**: `npm run test:csv-integrity` exports → imports → cell-by-cell comparison (169/169 match)
3. **Symmetry**: `npm run test:symmetry-correctness` verifies locking, propagation, asymmetric config
4. **Regression**: `npm run test:regression` loads prior exports, recalculates, matches baseline snapshot

### Agent Context Update

CLAUDE.md updated: spec reference → plan.md for test suite guidance

---

## Phase 1 Artifacts Generated

- ✅ `plan.md` (this file)
- 🔜 `data-model.md` (entity definitions)
- 🔜 `contracts/test-structure.md` (Jest/Puppeteer patterns)
- 🔜 `quickstart.md` (validation scenarios)
- ✅ `CLAUDE.md` (agent context updated)

---

## Critical Path

1. Setup (Jest config, Puppeteer, fixtures) → 3 tasks
2. Unit tests (caster, camber, interpolation, scoring, color) → 5 tasks
3. Invariants (symmetry, bounds, monotonicity, flags) → 4 tasks
4. Boundary cases (empty grid, div by zero, precision) → 5 tasks
5. Integration (symmetry, CSV, determinism, exports) → 7 tasks
6. Performance (speed, memory, density switching) → 4 tasks
7. CI/CD (GitHub Actions pipeline) → 1 task
8. Documentation (guide, troubleshooting) → 1 task

**Dependency**: Infrastructure (1) → all others (2-8 parallel possible after 1)

---

## Success Criteria

- 54 requirements fully automated (100% coverage)
- All tests passing: unit < 5s, full suite < 60s
- Zero regressions: prior exports match baseline
- Formula accuracy: spot checks ≤ 0.01° error
- Invariants proven: 100% must-always-be-true conditions hold
- Performance: 13×13 < 1s, chart < 1s
- CI/CD: tests block bad commits before deploy
- Determinism: 10 runs same input = identical output
- Memory stable: < 5% growth over 10 cycles

---

## Ready for Task Generation

Proceed with `/speckit-tasks` to generate actionable implementation tasks.
