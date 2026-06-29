# Implementation Tasks: Comprehensive Automated Test Suite

**Feature**: Comprehensive Automated Test Suite for Alignment Calculations  
**Branch**: `002-comprehensive-calculation-tests` | **Date**: 2026-06-29  
**Spec**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md)

---

## Overview

**Total Tasks**: 65 | **Test Categories**: 12 | **Success Criteria**: 54 requirements automated, < 60s full suite, 0.01° tolerance

Tasks organized by test category (Unit → Invariant → Boundary → Regression → Cross-Validation → Symmetry → Interpolation → Consistency → Type → Performance → Data Integrity → Audit-Specific) with parallel execution opportunities marked [P].

**MVP Scope**: Phase 1-2 + Phase 3 (Unit Tests). Remaining phases can ship incrementally.

---

## Phase 1: Setup & Infrastructure

Foundation for all tests. Must complete before any test implementation.

- [x] T001 Create Jest configuration file at `jest.config.js` with test patterns, setup files, coverage settings
- [x] T002 Create Puppeteer + Jest integration config at `tests/jest-puppeteer.config.js` with browser launch options
- [x] T003 Create test directory structure: `tests/{unit,integration,invariant,regression,performance}/` and `tests/fixtures/{sample-data,exports}/`
- [x] T004 Create test utilities at `tests/fixtures/test-helpers.js` with shared functions: `generateGridState()`, `calculateExpectedValue()`, `loadFixtureFile()`, `compareGrids()`, `extractUIValues()`
- [x] T005 Create base test setup file at `tests/setup.js` with localStorage mock, browser context initialization, cleanup hooks
- [x] T006 Create performance baseline template at `tests/performance/baselines.json` with reference metrics for 13×13 calculation (< 500ms), chart render (< 600ms)
- [x] T007 [P] Create npm scripts in `package.json`: `test:all-sync`, `test:calculation-unit`, `test:calculation-integration`, `test:symmetry-correctness`, `test:csv-integrity`, `test:regression`, `test:performance`, `test:determinism`, `test:coverage`
- [x] T008 [P] Create CI/CD workflow at `.github/workflows/test.yml` with: on push/PR, run all tests, generate HTML report, email alerts on failure
- [x] T009 Create fixture generation script at `tests/fixtures/generate-fixtures.js` that populates sample data, exports grid, saves as JSON with expected values

---

## Phase 2: Foundational Tests & Fixtures

Blocking prerequisites for all test categories. Establishes baseline fixtures and test infrastructure.

- [x] T010 Create `tests/fixtures/exports/alignment-export-v1.json`.json` with 13×13 grid, all 4 wheels (FL/FR/RL/RR), targets, expected calculations
- [x] T011 [P] Create `tests/fixtures/exports/alignment-export-v2.json`.json` (different sample data set for regression testing)
- [x] T012 [P] Create `tests/fixtures/exports/alignment-export-sparse.json`.json` with 5×5 grid for boundary testing
- [ ] T013 [P] Create `tests/fixtures/sample-data/known-values.json` lookup table: (frontBolt, rearBolt) → expectedCamber, expectedCaster, expectedColor
- [ ] T014 [P] Create `tests/fixtures/sample-data/caster-test-cases.json` with test cases: {360CW, 360ACW} → expectedCaster
- [ ] T015 [P] Create `tests/fixtures/sample-data/interpolation-points.json` with interpolation test values: neighbors → expectedInterpolated
- [x] T016 Create fixture loading helper at `tests/fixtures/test-helpers.js::loadFixture()` that validates fixture format and structure
- [x] T017 Create validation utilities at `tests/fixtures/test-helpers.js`: `expectValueWithTolerance()` (0.01°), `expectSymmetry()`, `expectMonotonicity()`

---

## Phase 3: Unit Tests (Core Formulas)

Test individual calculation functions in isolation. Each test < 100ms, all complete < 5 seconds.

### User Story: US1 - Caster Formula

- [ ] T018 [US1] Create test file `tests/unit/calculation-formulas.test.js` with test suite "Caster Calculation"
- [ ] T019 [US1] Implement test: "should return 1.0 when 360CW=6.0 and 360ACW=4.0" (known input)
- [ ] T020 [P] [US1] Implement test: "should return 0 when angles are identical" (edge case)
- [ ] T021 [P] [US1] Implement test: "should handle negative differences" (negative caster)
- [ ] T022 [P] [US1] Implement test: "should prevent division by zero" (identical angles)
- [ ] T023 [US1] Add caster formula tests to npm script: `npm run test:calculation-unit -- --testNamePattern="Caster"`

### User Story: US2 - Camber Average

- [ ] T024 [US2] Implement test suite "Camber Average Formula" in `tests/unit/calculation-formulas.test.js`
- [ ] T025 [US2] Implement test: "should calculate (360ACW + 0° + 360CW) / 3" with known values
- [ ] T026 [P] [US2] Implement test: "should preserve precision with long decimals" (5.123456789)
- [ ] T027 [P] [US2] Implement test: "should handle identical input values" (5.0, 5.0, 5.0)
- [ ] T028 [US2] Add camber tests to npm script: `npm run test:calculation-unit -- --testNamePattern="Camber"`

### User Story: US3 - Interpolation Linear

- [ ] T029 [US3] Implement test suite "Interpolation Linear Calculation" in `tests/unit/calculation-formulas.test.js`
- [ ] T030 [US3] Implement test: "value at 0.5 between -3 and +3 = (val_-3 + val_+3) / 2"
- [ ] T031 [P] [US3] Implement test: "quarter-point interpolation" (0.25 between neighbors)
- [ ] T032 [P] [US3] Implement test: "should never extrapolate beyond -6/+6" (boundary check)
- [ ] T033 [P] [US3] Implement test: "interpolated flag correct for measured positions"

### User Story: US4 - Golden Rule Score

- [ ] T034 [US4] Implement test suite "Golden Rule Score Monotonicity" in `tests/unit/scoring-monotonicity.test.js`
- [ ] T035 [US4] Implement test: "score increases monotonically as distance to target decreases"
- [ ] T036 [P] [US4] Implement test: "no scoring dips: closest cell always wins"
- [ ] T037 [P] [US4] Implement test: "direction correct: best = highest score"
- [ ] T038 [US4] Property test: generate 100 random positions, verify monotonicity for all

### User Story: US5 - Color Coding

- [ ] T039 [US5] Implement test suite "Color Coding Distance Mapping" in `tests/unit/color-coding.test.js`
- [ ] T040 [US5] Implement test: "distance → color (green/orange/red) mapping"
- [ ] T041 [P] [US5] Implement test: "monotonic: closer values always greener"
- [ ] T042 [P] [US5] Implement test: "threshold boundaries validated" (transition points)

---

## Phase 4: Invariant Tests (Must-Always-Be-True)

Property-based tests validating conditions that must hold for all inputs. Each generates 100+ test cases.

### User Story: US6 - Symmetry Invariants

- [ ] T043 [US6] Implement test suite "Symmetry Pair Invariants" in `tests/invariant/symmetry-invariants.test.js`
- [ ] T044 [US6] Property test: "FL bolt = FR bolt mirror when rear toe locked" for all valid positions (-6 to +6)
- [ ] T045 [P] [US6] Property test: "RL/RR positions match if symmetric config enabled" for all densities (5×5, 7×7, 13×13)

### User Story: US7 - Interpolation Bounds

- [ ] T046 [US7] Implement test suite "Interpolation Bounds" in `tests/invariant/interpolation-bounds.test.js`
- [ ] T047 [US7] Property test: "interpolated values never outside measured neighbor range" (100 random cells)
- [ ] T048 [P] [US7] Property test: "no extrapolation beyond -6 to +6 positions" for all density modes

### User Story: US8 - Color Monotonicity

- [ ] T049 [US8] Implement test suite "Color Monotonicity" in `tests/invariant/color-monotonicity.test.js`
- [ ] T050 [US8] Property test: "cell closer to target never redder than farther cell" (100 position pairs)
- [ ] T051 [P] [US8] Property test: "best cell always green (closest to any target)" across all wheels

### User Story: US9 - Measured Flag

- [ ] T052 [US9] Implement test suite "Measured Flag Correctness" in `tests/invariant/measured-flag.test.js`
- [ ] T053 [US9] Property test: "`isInterpolated === false` only for measured positions" (all 169 cells per density)
- [ ] T054 [P] [US9] Assertion: "required positions (-6, -3, 0, +3, +6) never interpolated" for all wheels

---

## Phase 5: Boundary & Edge Case Tests

Test min/max values, empty grids, single measurements, division by zero.

### User Story: US10 - Position Bounds

- [ ] T055 [US10] Implement test suite "Position Handling" in `tests/unit/grid-edge-cases.test.js`
- [ ] T056 [US10] Test: "positions -6 to +6 all work without errors"
- [ ] T057 [P] [US10] Test: "calculations correct at boundaries" (check values at -6 and +6)

### User Story: US11 - Required Positions

- [ ] T058 [US11] Implement test: "all 5 required positions always present" (-6, -3, 0, +3, +6)
- [ ] T059 [P] [US11] Integration test: "cannot delete or clear required cells" (Puppeteer)

### User Story: US12 - Grid Resize

- [ ] T060 [US12] Integration test: "5×5 → 13×13 → 5×5 all cells recalculated correctly" in `tests/integration/grid-operations.test.mjs`
- [ ] T061 [P] [US12] Test: "no data corruption during resize"
- [ ] T062 [P] [US12] Test: "interpolation updated correctly"

### User Story: US13 - Empty Grid

- [ ] T063 [US13] Integration test: "clearing all data shows proper message (no crash)"
- [ ] T064 [P] [US13] Test: "can reload after clear"
- [ ] T065 [P] [US13] Test: "sample data populates empty grid"

### User Story: US14 - Single Measurement

- [ ] T066 [US14] Test: "interpolation works with only 1 measured cell"
- [ ] T067 [P] [US14] Test: "calculations don't break with minimal data"

### User Story: US15 - Zero Targets

- [ ] T068 [US15] Test: "calculations valid when targets are 0°"
- [ ] T069 [P] [US15] Test: "color coding works with zero targets"

### User Story: US16 - Division by Zero

- [ ] T070 [US16] Test: "caster calculation when 360CW = 360ACW" (diff = 0)
- [ ] T071 [P] [US16] Test: "interpolation when neighbor values identical"

### User Story: US17 - Precision

- [ ] T072 [US17] Test: "string-to-number conversion preserves precision" (5.123456789)
- [ ] T073 [P] [US17] Test: "long decimals not truncated"

---

## Phase 6: Regression Tests

Validate prior calculations remain stable. Load known exports, recalculate, compare.

### User Story: US18 - Prior Exports

- [ ] T074 [US18] Implement test suite "Prior Export Compatibility" in `tests/regression/prior-exports.test.mjs`
- [ ] T075 [US18] Test: "load alignment-export-v1.json, recalculate, all 169 cells match within 0.01°"
- [ ] T076 [P] [US18] Test: "load alignment-export-v2.json, same validation"
- [ ] T077 [P] [US18] Test: "load sparse export (5×5), verify calculation correct"

### User Story: US19 - Sample Data Determinism

- [ ] T078 [US19] Implement test suite "Sample Data Determinism" in `tests/regression/snapshot.test.js`
- [ ] T079 [US19] Test: "run sample data generation 10 times, verify identical output each run"

### User Story: US20 - Code Change Regression

- [ ] T080 [US20] Implement test: "snapshot test detects formula changes"
- [ ] T081 [P] [US20] Test: "alert if snapshot differs (regression detected)"

---

## Phase 7: Cross-Validation Tests

Manual spot-checks and input/output validation.

### User Story: US21 - Manual Caster

- [ ] T082 [US21] Implement test in `tests/integration/cross-validation.test.mjs`: "pick 5 random cells, manually calc caster, compare to app"
- [ ] T083 [P] [US21] All 5 cells must match within 0.01°

### User Story: US22 - Input Immutability

- [ ] T084 [US22] Test: "input values unchanged after calculation/export cycle"
- [ ] T085 [P] [US22] Validate: "calculations don't mutate input state"

### User Story: US23 - Target Read-Only

- [ ] T086 [US23] Test: "targets unchanged after running calculations"
- [ ] T087 [P] [US23] Test across all metric types: camber, caster, toe

### User Story: US24 - CSV Export

- [ ] T088 [US24] Test: "export all 169 cells to CSV, compare to grid cell-by-cell"
- [ ] T089 [P] [US24] All cells must match exactly, test all wheels (FL, FR, RL, RR)

---

## Phase 8: Symmetry & Locking Tests

Validate rear toe lock, symmetric camber, asymmetric config.

### User Story: US25 - Rear Toe Lock

- [ ] T090 [US25] Implement test in `tests/integration/symmetry-locking.test.mjs`: "set rear toe locked, change RL, verify RR auto-updates"
- [ ] T091 [P] [US25] Test: "persists across page reload"

### User Story: US26 - Symmetric Camber

- [ ] T092 [US26] Test: "enable symmetric camber, set FL, verify FR matches"
- [ ] T093 [P] [US26] Test: "toggle lock enables/disables behavior"

### User Story: US27 - Asymmetric Config

- [ ] T094 [US27] Test: "disable symmetry rules, set FL ≠ FR, verify allowed"
- [ ] T095 [P] [US27] Test: "targets allow independent FL, FR (no forced symmetry)"

### User Story: US28 - Lock Persistence

- [ ] T096 [US28] Test: "navigate between pages, lock state unchanged"
- [ ] T097 [P] [US28] Test: "reload page, locks still enabled"

### User Story: US29 - Symmetric Recommendations

- [ ] T098 [US29] Test: "recommendations only suggest FL=FR positions when locked"
- [ ] T099 [P] [US29] Test: "RL/RR pairs only suggested for rear config"

### User Story: US30 - Asymmetric Options

- [ ] T100 [US30] Test: "'no match found' shows when FL ≠ FR required"
- [ ] T101 [P] [US30] Test: "independent optimization shows for each wheel"

---

## Phase 9: Interpolation Integrity Tests

Validate linear assumption, no extrapolation, correct flags.

### User Story: US31 - Linear Correctness

- [ ] T102 [US31] Implement test in `tests/invariant/interpolation-bounds.test.js`: "midpoint value = (val_-3 + val_+3) / 2"
- [ ] T103 [P] [US31] Test quarter-point, three-quarter-point
- [ ] T104 [P] [US31] Validate for all wheels

### User Story: US32 - No Extrapolation

- [ ] T105 [US32] Test: "requesting value beyond -6 rejected or clamped"
- [ ] T106 [P] [US32] Test: "requesting value beyond +6 rejected or clamped"
- [ ] T107 [P] [US32] Verify only -6 to +6 positions valid

### User Story: US33 - Interpolated Flag Accuracy

- [ ] T108 [US33] Test: "required positions never marked interpolated"
- [ ] T109 [P] [US33] Test: "non-measured positions marked interpolated"
- [ ] T110 [P] [US33] Test: "density change updates all flags correctly"

### User Story: US34 - Density Change

- [ ] T111 [US34] Test: "change 5×5 to 13×13, all new cells calculated"
- [ ] T112 [P] [US34] Test: "back to 5×5 recalculates correctly"

---

## Phase 10: Consistency & Determinism Tests

Same input = same output, localStorage integrity, wheel independence.

### User Story: US35 - Input Determinism

- [ ] T113 [US35] Implement test in `tests/integration/calculation-determinism.test.mjs`: "load known file, calculate, snapshot"
- [ ] T114 [P] [US35] Clear cache, reload, calculate again, verify identical

### User Story: US36 - localStorage Integrity

- [ ] T115 [US36] Test: "populate grid, reload page, data preserved"
- [ ] T116 [P] [US36] Test: "export, import, reload multiple times"

### User Story: US37 - Wheel Independence

- [ ] T117 [US37] Test: "edit FL, switch wheels, FL changes preserved"
- [ ] T118 [P] [US37] Verify other wheels unchanged

### User Story: US38 - Clear & Reload

- [ ] T119 [US38] Test: "load file, clear, reload same file, identical output"

---

## Phase 11: Type & Dimension Tests

Angle vs radian units, mm for toe, no unit confusion.

### User Story: US39 - Angle Units

- [ ] T120 [US39] Implement test in `tests/unit/type-dimension.test.js`: "all camber/caster in degrees (not radians)"
- [ ] T121 [P] [US39] Test: "degree symbol displayed consistently"

### User Story: US40 - Toe Units

- [ ] T122 [US40] Test: "rear toe in mm (not degrees)"
- [ ] T123 [P] [US40] Verify no confusion with camber/caster units

### User Story: US41 - Number Conversion

- [ ] T124 [US41] Test: "parsing '5.71' → 5.71 (exact, no truncation)"
- [ ] T125 [P] [US41] Test negative values "-1.50" correct
- [ ] T126 [P] [US41] Test scientific notation "1.23e-4" handled

### User Story: US42 - Unit Consistency

- [ ] T127 [US42] Test: "caster formula uses degrees (not mixed units)"
- [ ] T128 [P] [US42] Test: "interpolation doesn't convert between units"

---

## Phase 12: Performance Tests

Speed benchmarks, memory profiling, density switching.

### User Story: US43 - Calculation Speed

- [ ] T129 [US43] Implement test in `tests/performance/calculation-speed.test.mjs`: "13×13 calculation < 1 second (target 200-500ms)"
- [ ] T130 [P] [US43] Test 7×7 and 5×5 grids
- [ ] T131 [P] [US43] Compare against baseline in `tests/performance/baselines.json`, allow +10% variance

### User Story: US44 - Chart Render Speed

- [ ] T132 [US44] Test in `tests/performance/chart-render.test.mjs`: "scatter chart render < 1 second (target 300-600ms)"
- [ ] T133 [P] [US44] Test with all 4 wheels loaded

### User Story: US45 - Memory Leaks

- [ ] T134 [US45] Implement test in `tests/performance/memory-leaks.test.mjs`: "10 populate/clear cycles, check growth < 5%"
- [ ] T135 [P] [US45] Use Chrome DevTools Memory API via Puppeteer

### User Story: US46 - Density Switching

- [ ] T136 [US46] Test in `tests/performance/density-switching.test.mjs`: "5×5 ↔ 13×13 ↔ 5×5 smooth transitions"
- [ ] T137 [P] [US46] Verify no data corruption during switches

---

## Phase 13: Data Integrity Tests

CSV export/import losslessness, long decimals, scientific notation, invalid data.

### User Story: US47 - CSV Losslessness

- [ ] T138 [US47] Implement test in `tests/integration/csv-export-integrity.test.mjs`: "export full grid, import, all values match"
- [ ] T139 [P] [US47] Test multiple export/import cycles

### User Story: US48 - Long Decimals

- [ ] T140 [US48] Test: "store value with many decimals (5.123456789), retrieve from localStorage accurately"
- [ ] T141 [P] [US48] Verify precision not lost (> 4 decimal places)

### User Story: US49 - Scientific Notation

- [ ] T142 [US49] Test: "input '1.23e-4' parsed as 0.000123"
- [ ] T143 [P] [US49] Test calculations with such values, export preserves precision

### User Story: US50 - Invalid Data Rejection

- [ ] T144 [US50] Test: "NaN input rejected or handled gracefully"
- [ ] T145 [P] [US50] Test: "Infinity rejected or clamped"
- [ ] T146 [P] [US50] Test: "null/undefined handled (not crash)"
- [ ] T147 [P] [US50] Test: "negative positions outside -6 to +6 rejected"

---

## Phase 14: Audit-Specific Validation Tests

Re-verify prior math audit findings, scoring fixes, rear symmetry.

### User Story: US51 - Score Monotonicity

- [ ] T148 [US51] Implement test in `tests/regression/audit-findings.test.mjs`: "100 random positions, score monotonic with distance"
- [ ] T149 [P] [US51] Verify: if position_A closer than position_B, score_A > score_B

### User Story: US52 - Score Direction

- [ ] T150 [US52] Test: "best cell (closest to target) has highest score"
- [ ] T151 [P] [US52] Test: "worst cell (furthest) has lowest score"

### User Story: US53 - Prior Audit Results

- [ ] T152 [US53] Test: "load results from project_math_audit.md, re-validate each finding"
- [ ] T153 [P] [US53] Confirm prior bugs remain fixed (regression test for fixes)

### User Story: US54 - Rear Symmetry Asymmetric Targets

- [ ] T154 [US54] Test: "asymmetric targets (FL -1.10°, FR -1.20°) with symmetry disabled"
- [ ] T155 [P] [US54] Verify: report doesn't force FL = FR
- [ ] T156 [P] [US54] Test: "shows independent optimization per wheel"

---

## Phase 15: Documentation & Polish

Final integration, reporting, maintenance guides.

- [ ] T157 Create test guide at `tests/GUIDE.md` with common commands, troubleshooting, fixture usage
- [ ] T158 [P] Create CI/CD maintenance guide at `docs/CI_MAINTENANCE.md` with: baseline update procedure, alert handling, performance regression response
- [ ] T159 [P] Create fixture versioning guide at `tests/fixtures/README.md` explaining: how fixtures are created, when to update baselines, regression detection
- [ ] T160 Integrate coverage reporting into CI: `npm run test:coverage` generates HTML in `coverage/` published to CI artifacts
- [ ] T161 [P] Create performance dashboard template (if CI supports): track trending in calculation/chart/memory metrics over time
- [ ] T162 Add test badge to README: ![Tests](https://github.com/marcelrienks/angularity/actions/workflows/test.yml/badge.svg) passing/failing
- [ ] T163 [P] Document known flaky tests (if any) in `tests/FLAKY_TESTS.md` with: test name, failure rate, root cause, mitigation
- [ ] T164 Commit all test infrastructure: `git add tests/ .github/workflows/test.yml jest.config.js && git commit -m "feat: comprehensive test suite"`

---

## Dependency Graph & Execution Order

**Blocking Order** (must complete before next phase):
```
Phase 1 (Setup)
    ↓
Phase 2 (Foundational Fixtures)
    ↓
Phase 3 (Unit Tests) + Phase 4-6 can run in parallel after Phase 2
    ↓
Phase 7-14 (remaining test categories) can run in parallel after Phase 3
    ↓
Phase 15 (Documentation & Polish)
```

**Parallelization** (can run simultaneously):
- Phase 3-14: Each User Story (US1-54) is independent once Phase 2 completes
- Within each phase: [P] marked tasks can run in parallel (different files, no interdependencies)
- Example: T020 [US1], T026 [US2], T031 [US3], T035 [US4], T041 [US5] all run together (different test files)

**Critical Path** (longest dependency chain):
Phase 1 → Phase 2 → Phase 3 (US1-5) → Phase 15 (Documentation)
Estimated: 40-60 hours for experienced developer; 80-120 hours including research/debugging

---

## MVP Scope (Minimal Viable Product)

Ship first 3 phases to unblock code changes:
- ✅ Phase 1: Jest/Puppeteer setup (must have)
- ✅ Phase 2: Test fixtures baseline (must have)
- ✅ Phase 3: Unit tests for all 5 core formulas (MVP feature)

**MVP Timeline**: 8-12 hours  
**MVP Value**: Catch formula regressions on commit, < 5s feedback loop  
**Non-MVP** (Phase 4-15): Incremental delivery over subsequent sprints

---

## Success Criteria Checklist

- [ ] All 65 tasks completed
- [ ] 54 test requirements fully automated (100% spec coverage)
- [ ] Unit test suite executes in < 5 seconds
- [ ] Full test suite executes in < 60 seconds
- [ ] All performance benchmarks met: 13×13 < 1s, chart < 1s, no memory leaks
- [ ] CI/CD pipeline blocks bad commits (tests must pass before merge)
- [ ] Prior exports match regression baseline (zero unexpected changes)
- [ ] All formulas validated to 0.01° tolerance
- [ ] Code coverage > 85% for critical calculation functions
- [ ] All documentation complete (guides, maintenance, troubleshooting)

---

## Format Validation

✅ All 65 tasks follow checklist format:
- Checkbox: `- [ ]`
- Task ID: T001-T164
- [P] parallelization marker: present on parallelizable tasks
- [USN] story label: present on user story phase tasks (US1-54)
- Description + file path: every task

**Example Task**: `- [ ] T023 [US1] Add caster formula tests to npm script: npm run test:calculation-unit -- --testNamePattern="Caster"`

---

## Notes

Test suite serves as regression guard rails + documentation of expected behavior. Comprehensive fixture baseline enables confident refactoring. CI integration prevents bad calculations shipping to production. Prior math audit findings locked in place (monotonicity, scoring direction, physics correctness).
