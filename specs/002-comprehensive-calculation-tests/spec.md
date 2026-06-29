# Specification: Comprehensive Automated Test Suite for Alignment Calculations

**Feature**: Comprehensive Automated Test Suite for Alignment Calculations  
**Status**: Specification  
**Created**: 2026-06-29

---

## Summary

Build exhaustive automated test suite covering all calculation formulas, invariants, edge cases, and data integrity in the alignment system. Tests validate caster/camber calculations, symmetry rules, interpolation logic, color coding, lock behavior, and ensure all prior audit findings remain fixed. Infrastructure includes Jest units + Puppeteer UI tests + property-based invariant checking with CI/CD integration.

---

## User Scenarios & Testing

### Scenario 1: Test Engineer Runs Pre-Commit Validation
- Engineer modifies a calculation formula in `chart-builder.js`
- Engineer runs `npm run test:calculation-unit`
- Suite executes all formula unit tests in under 5 seconds
- Test passes (formula change is backward compatible) OR fails with clear error showing which formula broke
- Engineer sees regression alerts if scoring direction or monotonicity changed

### Scenario 2: CI Pipeline Validates Overnight Before Deploy
- Nightly job runs full test suite: unit + integration + invariants + regression
- Puppeteer tests take screenshots and extract values from UI
- HTML report generated showing test coverage, pass/fail count, performance metrics
- If any test fails, email alert sent to team
- If regression detected (prior export now produces different result), deployment blocked

### Scenario 3: Code Reviewer Audits Symmetry Logic Change
- Developer changes rear symmetry rules in `report-page.js`
- Reviewer runs `npm run test:symmetry-correctness`
- Tests verify: RL toe locked updates RR, FL=FR when symmetric config enabled, asymmetric options show when disabled
- Reviewer sees results: 8 pass, 2 fail → asks for fix

### Scenario 4: QA Validates Data Integrity After Export/Import Cycle
- QA exports alignment data from UI
- QA reimports same file
- Test runs `npm run test:csv-integrity`
- Compares cell-by-cell values: all 169 cells match original
- Confirms localStorage persists across page reloads
- Validates scientific notation (1.23e-4) handled correctly

### Scenario 5: Determinism Check Before Release
- Release manager runs `npm run test:determinism`
- Suite runs same input 10 times, validates identical output each run
- Confirms no randomness leaking into calculations
- Approves build for production release

---

## Functional Requirements

### Unit Test Suite
1. **Caster Calculation Tests**
   - Test formula: `(camber_360CW - camber_360ACW) / 2`
   - Validate with known inputs (e.g., 360CW=6.0, 360ACW=4.0 → caster=1.0)
   - Test edge cases: zero difference, identical values, max/min positions

2. **Camber Average Formula**
   - Test 3-point average: `(360ACW + 0° + 360CW) / 3`
   - Validate precision (no rounding errors accumulating)
   - Test with identical values and varying inputs

3. **Interpolation Linear Calculation**
   - Test value at 0.5 between -3 and +3 ≈ `(val_at_-3 + val_at_+3) / 2`
   - Verify only applies between measured points, never extrapolates
   - Validate interpolated flag correct

4. **Golden Rule Score Monotonicity**
   - Test that score increases monotonically as distance to target decreases
   - Verify no scoring dips (closest cell always wins)
   - Confirm direction correct (best = highest score, worst = lowest)

5. **Color Coding Distance Mapping**
   - Test mapping: distance to target → color (green/orange/red)
   - Verify monotonic: closer values always greener or equal
   - Validate threshold boundaries

### Invariant Test Suite (Must Always Be True)
6. **Symmetry Pair Invariants**
   - Test: FL bolt = FR bolt mirror when rear toe locked
   - Test: RL/RR positions match if symmetric config enabled
   - Verify invariants hold across all valid bolt positions

7. **Interpolation Bounds**
   - Test: interpolated values never outside measured neighbor range
   - Test: no extrapolation beyond -6 to +6 positions
   - Verify for all density modes (5×5, 7×7, 13×13)

8. **Color Monotonicity**
   - Test: cell closer to target is never redder than cell further from target
   - Test: best cell (closest to any target) is always green
   - Verify across all wheels and metrics

9. **Measured Flag Correctness**
   - Test: `isInterpolated === false` only for measured positions
   - Test: required positions (-6, -3, 0, +3, +6) never interpolated
   - Verify for all wheels

### Boundary & Edge Case Tests
10. **Min/Max Position Handling**
    - Test positions -6 to +6 all work without errors
    - Validate calculations correct at boundaries
    - Test grid doesn't crash with out-of-range inputs

11. **Required Position Validation**
    - Test all 5 required positions (-6, -3, 0, +3, +6) always present
    - Verify cannot delete or clear required cells
    - Test grid highlights required positions visually

12. **Grid Resize Stability** (5×5 → 13×13 → 5×5)
    - Test all cells recalculated correctly
    - Verify no data corruption during resize
    - Validate interpolation updated correctly

13. **Empty Grid Handling**
    - Test clearing all data shows proper message (no crash)
    - Verify can reload after clear
    - Test sample data populates empty grid correctly

14. **Single Measurement Stability**
    - Test interpolation works with only 1 measured cell
    - Verify calculations don't break with minimal data
    - Test with only center cell (0,0) populated

15. **Zero Target Handling**
    - Test calculations valid when targets are 0°
    - Verify color coding works with zero targets
    - Test scoring doesn't break

16. **Division by Zero Prevention**
    - Test caster calculation when 360CW = 360ACW (diff = 0)
    - Test interpolation when neighbor values identical
    - Verify safeguards prevent NaN/Infinity

17. **Precision & Identical Values**
    - Test string-to-number conversion preserves precision
    - Test with identical input values (no division issues)
    - Verify long decimals not truncated

### Regression Test Suite
18. **Prior Export Compatibility**
    - Load known alignment files from `test/fixtures/exports/`
    - Recalculate entire grid from scratch
    - Verify all 169 cells match expected values within tolerance
    - Test multiple export versions (different sample data sets)

19. **Sample Data Determinism**
    - Run sample data generation 10 times
    - Verify identical values produced each time
    - Confirm no randomness in algorithm

20. **Code Change Regression**
    - Snapshot test: store current calculation output
    - After code change, verify output matches snapshot
    - Alert if snapshot differs (regression detected)

### Cross-Validation Tests
21. **Manual Caster Spot Check**
    - Pick 5 random cells
    - Manually calculate caster from visible 3-position values
    - Compare manual calculation to app result
    - All 5 must match within 0.01°

22. **Camber Input Immutability**
    - Load input values into grid
    - Run calculation/export cycle
    - Verify input values unchanged
    - Confirm calculations don't mutate input state

23. **Target Read-Only Validation**
    - Load targets on INDEX page
    - Run full report calculation
    - Verify targets unchanged (not modified by calculations)
    - Test across all metric types (camber, caster, toe)

24. **CSV Export Cell-by-Cell Validation**
    - Export all 169 cells to CSV
    - Compare each CSV value to visible grid value
    - All cells must match exactly
    - Test with all wheels (FL, FR, RL, RR)

### Symmetry & Locking Tests
25. **Rear Toe Lock Propagation**
    - Set rear toe locked in config
    - Change RL toe value in input
    - Verify RR toe auto-updates to match
    - Test persists across page reload

26. **Symmetric Camber Enforcement**
    - Enable symmetric camber config
    - Set FL camber at bolt position
    - Verify FR camber matches automatically
    - Test lock toggle enables/disables behavior

27. **Asymmetric Config Validation**
    - Disable symmetry rules
    - Set FL ≠ FR bolt positions
    - Verify targets allow this (no forced symmetry)
    - Verify report shows both values independently

28. **Lock State Persistence**
    - Set locks (rear toe, symmetric camber, etc.)
    - Navigate between pages
    - Return to input page
    - Verify lock states unchanged

29. **Symmetric Pair Recommendations**
    - Enable symmetry lock
    - Verify recommendations only suggest FL=FR positions
    - Verify RL/RR pairs only suggested for rear config
    - Test asymmetric config shows independent options

30. **Asymmetric Option Display**
    - Disable symmetry config
    - Verify "no match found" shows when FL ≠ FR required
    - Test independent optimization shows for each wheel

### Interpolation Integrity Tests
31. **Linear Interpolation Correctness**
    - Test value at exact midpoint between measured positions
    - Verify: `value_at_0 = (value_at_-3 + value_at_+3) / 2`
    - Test quarter-point, three-quarter-point
    - Validate for all wheels

32. **Extrapolation Prevention**
    - Test requesting value beyond -6 (most negative)
    - Test requesting value beyond +6 (most positive)
    - Verify error or boundary clamp (never extrapolate)
    - Test all positions -6 to +6 valid only

33. **Interpolated Flag Accuracy**
    - Test required positions never marked interpolated
    - Test non-measured positions marked interpolated
    - Test density change updates all flags correctly
    - Verify flag used correctly in color coding

34. **Density Change Recalculation**
    - Change density from 5×5 to 13×13
    - Verify all new interpolated cells calculated
    - Verify required positions still measured
    - Test back to 5×5 recalculates correctly

### Consistency & Determinism Tests
35. **Input → Output Determinism**
    - Load known input file
    - Calculate grid once, snapshot result
    - Clear cache, reload input
    - Calculate again, verify identical output

36. **localStorage Integrity**
    - Populate grid with data
    - Reload page (verify localStorage preserved)
    - Export, import, reload again
    - Verify data survives multiple reload cycles

37. **Wheel Tab Isolation**
    - Edit FL wheel measurements
    - Switch to FR, RL, RR wheels
    - Return to FL
    - Verify FL changes preserved, other wheels unchanged

38. **Clear & Reload Consistency**
    - Load alignment file
    - Clear all data
    - Reload same file
    - Verify output identical to first load

### Type & Dimension Tests
39. **Angle Unit Consistency**
    - Test all camber/caster values in degrees (not radians)
    - Test if conversion ever needed, values correct
    - Verify degree symbol displayed consistently
    - Test with values 0-7° range typical for camber

40. **Toe Distance Units**
    - Test rear toe in mm (not degrees)
    - Verify no confusion with camber/caster units
    - Test typical values 0-2mm
    - Verify unit labels correct in UI

41. **String to Number Conversion**
    - Test parsing "5.71" → 5.71 (exact, no truncation)
    - Test with comma separators if supported
    - Test negative values "-1.50" correct
    - Test scientific notation "1.23e-4" handled
    - Verify precision not lost in conversion

42. **Unit Consistency Across Formulas**
    - Test caster formula uses degrees (not mixed units)
    - Test camber formula consistent (all degrees)
    - Test interpolation doesn't convert between units
    - Verify no unit confusion in any calculation path

### Performance Tests
43. **13×13 Grid Calculation Speed**
    - Populate 169-cell grid with sample data
    - Measure calculation time from input to grid display
    - Verify < 1 second (target: 200-500ms)
    - Test on reference device/browser

44. **Chart Render Speed**
    - Load report page with 169 calculated cells
    - Measure scatter chart render time
    - Verify < 1 second (target: 300-600ms)
    - Test with all 4 wheels

45. **No Memory Leaks**
    - Populate sample data (10 times: populate → clear → reload)
    - Monitor memory usage across cycles
    - Verify no consistent growth (memory released after clear)
    - Test with Chrome DevTools memory profiler

46. **Grid Density Mode Switching**
    - Switch between 5×5 ↔ 13×13 ↔ 5×5 (5 times)
    - Verify smooth transitions (no lag)
    - Confirm UI responsive during resize
    - Test no data corruption during switches

### Data Integrity Tests
47. **CSV Export Reimport Losslessness**
    - Export full 169-cell grid to CSV
    - Import same CSV file
    - Compare cell-by-cell: all values match original
    - Test with multiple export/import cycles

48. **localStorage Long Decimal Handling**
    - Store value with many decimals (5.123456789)
    - Save to localStorage, reload page
    - Verify value retrieved accurately
    - Test precision not lost (> 4 decimal places)

49. **Scientific Notation Handling**
    - Test input: "1.23e-4" parsed as 0.000123
    - Test calculations with such values
    - Test export preserves precision
    - Verify no NaN or Infinity in output

50. **Invalid Data Rejection**
    - Test NaN input rejected or handled gracefully
    - Test Infinity input rejected or clamped
    - Test null/undefined handled (not crash)
    - Test negative bolt positions outside -6 to +6 rejected
    - Verify error messages clear to user

### Audit-Specific Validation Tests
51. **Golden Rule Score Monotonicity**
    - Test 100 random bolt positions
    - For each: calculate score at that position
    - Verify: if position_A closer to target than position_B, then score_A > score_B
    - Confirm no score dips or inversions

52. **Scoring Direction Correctness**
    - Test: best cell (closest to target) has highest score
    - Test: worst cell (furthest from target) has lowest score
    - Verify: score = f(distance), monotonically decreasing in distance
    - Confirm direction not inverted

53. **Prior Physics Audit Results**
    - Load results from `project_math_audit.md` findings
    - Re-validate each confirmed-correct calculation
    - Verify prior bugs remain fixed (test regression for fixes)
    - Confirm measurement protocol unchanged

54. **Rear Symmetry with Asymmetric Targets**
    - Set asymmetric targets: FL camber -1.10°, FR camber -1.20°
    - Disable symmetry lock
    - Verify report doesn't force FL = FR
    - Test shows independent optimization per wheel
    - Confirm symmetry options appear only as recommendations, not enforcement

---

## Success Criteria

- **100% test execution**: All 54 test categories automated, runnable via npm scripts
- **Sub-second validation**: Unit tests complete in < 5 seconds; full suite in < 60 seconds
- **Zero regressions**: Sample data determinism confirmed; prior exports produce identical results
- **Formula accuracy**: All spot-check calculations (manual vs app) match within 0.01°
- **Data integrity**: CSV export/import losslessness validated; long decimals preserved
- **Invariant coverage**: All must-always-be-true properties tested and passing
- **Edge case handling**: Division by zero, empty grids, single measurements, out-of-range inputs all handled
- **Performance benchmarks**: 13×13 calculation < 1s, chart render < 1s, no memory leaks over cycles
- **CI/CD integration**: Tests run on every commit; regression detected and blocked before deploy
- **Documentation**: Test fixtures, known values, expected results all documented in code

---

## Key Entities

### Test Files & Directories
```
tests/unit/
  ├── calculation-formulas.test.js          (caster, camber, interpolation)
  ├── scoring-monotonicity.test.js          (golden rule score)
  ├── color-coding.test.js                  (distance → color mapping)
  └── grid-edge-cases.test.js               (empty, single value, div-by-zero)

tests/integration/
  ├── symmetry-locking.test.mjs             (rear toe, camber locks)
  ├── csv-export-integrity.test.mjs         (export/import cell-by-cell)
  ├── data-persistence.test.mjs             (localStorage, page reload)
  └── calculation-determinism.test.mjs      (same input = same output)

tests/invariant/
  ├── interpolation-bounds.test.js          (never outside measured range)
  ├── color-monotonicity.test.js            (closer always ≥ greener)
  ├── measured-flag.test.js                 (correct interpolation marking)
  └── symmetry-invariants.test.js           (pair equality when locked)

tests/regression/
  ├── prior-exports.test.mjs                (load known files, validate)
  ├── audit-findings.test.mjs               (re-verify physics audit results)
  └── snapshot.test.js                      (code change regression detection)

tests/performance/
  ├── calculation-speed.test.mjs            (< 1s for 13×13)
  ├── chart-render.test.mjs                 (< 1s scatter plot)
  ├── memory-leaks.test.mjs                 (10× populate/clear/reload)
  └── density-switching.test.mjs            (5×5 ↔ 13×13 smooth)

tests/fixtures/
  ├── sample-data/
  │   └── known-values.json                 (reference output for regression)
  ├── exports/
  │   ├── alignment-export-v1.json          (prior alignment file)
  │   └── alignment-export-v2.json          (different sample set)
  └── test-helpers.js                       (shared utilities, mock data)
```

### Shared Test Utilities
- `generateGridState(density, fillWith)` — create test grid
- `calculateExpectedValue(pos, neighbors)` — compute expected value for assertions
- `loadFixtureFile(name)` — load test data from fixtures/
- `compareGrids(grid1, grid2, tolerance)` — cell-by-cell comparison
- `extractUIValues(page, selector)` — Puppeteer helper for UI value extraction

### Fixtures & Known Values
- `alignment-export-v1.json` — sample data with known correct calculations
- `symmetry-test-cases.json` — test cases for all symmetry scenarios
- `edge-cases.json` — division by zero, identical values, out of range
- `performance-baseline.json` — expected speeds for benchmarking

---

## Assumptions

1. **Testing Framework**: Jest for unit/integration tests (already in package.json); Puppeteer for UI tests (already installed)
2. **Performance Targets**: "< 1 second" means:
   - Unit test suite execution: all 50+ tests in < 5 seconds
   - 13×13 grid calculation: 200-500ms typical
   - Chart render: 300-600ms typical
   - Full suite end-to-end: < 60 seconds
3. **Precision Tolerance**: Numerical comparisons allow 0.01° tolerance (0.0001 in decimal form)
4. **Browser Environment**: Tests target Chrome/Chromium (Puppeteer default); Firefox/Safari tested separately if needed
5. **CI/CD Platform**: Tests expected to run on GitHub Actions or similar; custom platform-specific config needed
6. **Sample Data Stability**: Sample data generation algorithm is deterministic and won't change (regression test baseline)
7. **Prior Audit Status**: Physics audit results and scoring fixes documented in project memory are frozen as regression baseline
8. **Data Fixtures**: All test fixture files checked into repo (not generated at test time) for reproducibility
9. **Wheel Independence**: Each wheel's grid is independent; symmetry rules applied post-calculation, not during
10. **Interpolation Method**: Linear interpolation only; no spline or higher-order methods

---

## Dependencies & Constraints

### External Dependencies
- **Jest** (v25.0.0+) — unit & integration test runner (already in devDependencies)
- **Puppeteer** (v24.43.1+) — headless browser for UI testing (already in devDependencies)
- **jest-puppeteer** (v9.0.0+) — Jest + Puppeteer integration (already in devDependencies)

### Constraints
- Tests must not modify source code or data files (read-only validation)
- No test database required (localStorage-only data)
- Tests must clean up after themselves (clear localStorage, close browser contexts)
- CI/CD pipeline must fail if any test fails (blocking)
- Performance tests may vary by machine (baseline on reference device, +10% tolerance allowed)

### Known Constraints from Codebase
- Chart.js v4 used (via CDN) — chart render timing depends on network + browser perf
- localStorage limited to ~5-10MB per domain (sufficient for test data)
- No external API calls (all calculations client-side)
- No build step (vanilla JS, can test directly from `/site/` directory)

---

## Scope

### Included
- All 54 test categories above (unit, invariant, boundary, regression, cross-validation, symmetry, interpolation, consistency, type, performance, data integrity, audit-specific)
- Jest unit test infrastructure setup
- Puppeteer UI test infrastructure
- Test fixtures and known values
- npm scripts for running test subsets
- HTML report generation (coverage + results)
- CI/CD configuration
- Memory leak detection

### Excluded
- Testing browser compatibility (only Chrome via Puppeteer)
- Mobile/responsive design testing (unit/integration focus)
- Accessibility testing (WCAG compliance)
- Security testing (SQL injection, XSS, etc.)
- Load testing (10,000+ concurrent users)
- Visual regression testing (screenshot comparison)
- Stress testing (1M cells, unusual configurations)

---

## Open Questions & Clarifications

**All clarifications resolved via assumptions above.**

---

## Related Features & Context

**Prior Work**:
- **Math Audit** ([project_math_audit.md](../../project_math_audit.md)): Physics/math validation; identified correct formulas and fixed bugs
- **Scoring Fix** ([project_scoring_fix.md](../../project_scoring_fix.md)): Critical fix to monotonicity invariant in golden rule score
- **Scatter Charts** ([001-scatter-sensitivity-charts/plan.md](../001-scatter-sensitivity-charts/plan.md)): Parametric scatter visualization (uses calculations validated here)

**Dependent Features**:
- Any future calculation changes must pass this test suite before merge

---

## Notes

This specification builds comprehensive automated validation ensuring all formulas, invariants, and business logic remain correct through code changes. Tests serve as regression guard rails and documentation of expected behavior.
