# Quickstart: Test Suite Validation Guide

Complete validation guide for the automated test suite. Run scenarios to confirm all formulas, data integrity, symmetry logic, and performance targets are correct.

---

## Prerequisites

- Node.js v20+ installed
- Dev server running: `npm start` (port 8080)
- All dependencies installed: `npm install`
- Puppeteer cache populated: `npx puppeteer browsers install chrome`

---

## Running Tests

### All Tests (Full Suite)

```bash
npm run test:all-sync
```

**Expected**: ~60 seconds, all tests PASS, CI report generated

### Unit Tests Only (Fast Feedback)

```bash
npm run test:calculation-unit
```

**Expected**: < 5 seconds, all formula tests PASS

### Integration Tests (Full Flows)

```bash
npm run test:calculation-integration
```

**Expected**: < 20 seconds, all workflow tests PASS

### Specific Category

```bash
# Formula correctness
npm run test:calculation-unit

# Data integrity
npm run test:csv-integrity

# Symmetry logic
npm run test:symmetry-correctness

# Regression detection
npm run test:regression

# Performance baseline
npm run test:performance

# Determinism check
npm run test:determinism
```

### With Coverage Report

```bash
npm run test:coverage
```

**Output**: Generates `coverage/` directory with HTML coverage report

---

## Validation Scenario 1: Formula Correctness

Verify caster, camber, and interpolation formulas produce correct values.

**Setup**:
```bash
npm start              # in terminal 1 (leave running)
npm run test:calculation-unit -- --testNamePattern="Caster"
```

**What it tests**:
- Caster formula: `(360CW - 360ACW) / 2`
- Test cases: 360CW=6.0, 360ACW=4.0 → caster=1.0
- Edge cases: identical values (→0), negative diff, max/min positions

**Expected output**:
```
Caster Calculation
  formula (360CW - 360ACW) / 2
    ✓ should return 1.0 when 360CW=6.0 and 360ACW=4.0
    ✓ should return 0 when angles are identical
    ✓ should handle negative differences
    ✓ should handle max position values
    ✓ should handle min position values

5 passed (120ms)
```

**If fails**:
- Check formula in `js/calculation.js` (or similar)
- Verify division operator, operand order
- Check for NaN/Infinity edge case handling

---

## Validation Scenario 2: Data Integrity (CSV Export/Import)

Verify data survives export → import → comparison cycle without loss.

**Setup**:
```bash
npm run test:csv-integrity
```

**What it tests**:
1. Populate 13×13 grid with sample data (169 cells)
2. Export all cells to CSV format
3. Clear grid, reimport CSV
4. Compare each cell value (must match exactly)
5. Verify localStorage persists across page reload

**Expected output**:
```
CSV Export/Import Integrity
  Export-Import Cycle
    ✓ should export all 169 cells from grid
    ✓ should reimport CSV without value loss
    ✓ should match cell-by-cell (169/169)
    ✓ should handle long decimals (precision test)
    ✓ should persist localStorage across reload

5 passed (3500ms)
```

**Cells checked**:
- FL, FR, RL, RR wheels (all 4)
- Every angle position (360ACW, 0°, 360CW)
- All 13×13 positions (-6 to +6)

**If fails**:
- Check CSV export format (header, delimiters)
- Verify string-to-number conversion preserves precision
- Check localStorage serialization/deserialization

---

## Validation Scenario 3: Symmetry & Locking Logic

Verify rear toe lock, symmetric camber, and asymmetric config work correctly.

**Setup**:
```bash
npm run test:symmetry-correctness
```

**What it tests**:
1. **Rear Toe Lock**: Set lock, change RL, verify RR auto-updates
2. **Symmetric Camber**: Enable lock, set FL, verify FR matches
3. **Asymmetric Config**: Disable lock, set FL≠FR, verify allowed
4. **Lock Persistence**: Set lock, reload page, verify still enabled
5. **Recommendation Filtering**: Verify symmetric pairs only when lock enabled

**Expected output**:
```
Symmetry & Locking Behavior
  Rear Toe Lock
    ✓ should propagate RL change to RR when locked
    ✓ should not propagate when unlocked
    ✓ should persist lock state across reload

  Symmetric Camber
    ✓ should match FL to FR when enabled
    ✓ should allow FL≠FR when disabled
    ✓ should toggle enable/disable correctly

  Lock Persistence
    ✓ should restore lock state on page reload
    ✓ should survive config page navigation

8 passed (4200ms)
```

**If fails**:
- Check lock state storage in localStorage
- Verify propagation logic in `report-page.js` or calc module
- Check event listeners for input changes

---

## Validation Scenario 4: Regression Detection (Prior Exports)

Load known alignment file, recalculate, verify all 169 cells match baseline.

**Setup**:
```bash
npm run test:regression -- --testNamePattern="Prior.*Exports"
```

**What it tests**:
1. Load `tests/fixtures/exports/alignment-export-v1.json`
2. Recalculate entire 13×13 grid from scratch
3. Compare all 169 cells:
   - Expected camber value
   - Expected caster value
   - Expected cell color (green/orange/red)
4. Tolerance: 0.01° (0.01 degrees)
5. Repeat for v2 export (different sample data)

**Expected output**:
```
Regression: Prior Exports
  alignment-export-v1.json
    ✓ should match all FL cells within 0.01° (169/169)
    ✓ should match all FR cells within 0.01° (169/169)
    ✓ should match all RL cells within 0.01° (169/169)
    ✓ should match all RR cells within 0.01° (169/169)

  alignment-export-v2.json
    ✓ should match all FL cells within 0.01° (169/169)
    ✓ should match all FR cells within 0.01° (169/169)
    ✓ should match all RL cells within 0.01° (169/169)
    ✓ should match all RR cells within 0.01° (169/169)

8 passed (2800ms)
```

**If fails**:
- A formula changed but wasn't locked in place
- Snapshot mismatch: `expect(actual).toEqual(expected)` will show which cell failed
- Check fixture baseline is correct (re-verify `alignment-export-vN.json`)

---

## Validation Scenario 5: Performance Baselines

Measure calculation speed, chart render, and memory stability against baseline.

**Setup**:
```bash
npm run test:performance
```

**What it tests**:
1. **Calculation Speed**: 13×13 grid < 1 second (target: 200-500ms)
2. **Chart Render**: Scatter plot < 1 second (target: 300-600ms)
3. **Memory Leaks**: Populate/clear 10 times, check growth < 5%
4. **Density Switching**: 5×5 ↔ 13×13 ↔ 5×5 smooth transitions

**Expected output**:
```
Performance Benchmarks
  Calculation Speed
    ✓ 13x13 grid: 385ms (baseline 350ms ±45ms) ✓ PASS
    ✓ 7x7 grid: 145ms (baseline 120ms ±20ms) ✓ PASS
    ✓ 5x5 grid: 78ms (baseline 65ms ±15ms) ✓ PASS

  Chart Rendering
    ✓ Scatter plot render: 450ms (baseline 420ms ±55ms) ✓ PASS

  Memory Stability
    ✓ 10 cycles: heap growth 2.3% (threshold 5%) ✓ PASS

  Density Switching
    ✓ 5x5 → 13x13: 85ms (smooth) ✓ PASS
    ✓ 13x13 → 5x5: 72ms (smooth) ✓ PASS

6 passed (18000ms)
```

**If fails**:
- **Performance regression**: Check for added calculation overhead
- **Memory leak**: Use Chrome DevTools to inspect heap snapshots
- **Slow chart**: Profile Chart.js rendering, check data density

---

## Validation Scenario 6: Determinism (Same Input = Same Output)

Run same sample data 10 times, verify identical output each run (no randomness).

**Setup**:
```bash
npm run test:determinism
```

**What it tests**:
1. Populate sample data (13×13)
2. Calculate grid, snapshot output
3. Clear, repopulate, calculate
4. Repeat 10 times total
5. Compare all snapshots (must be identical)

**Expected output**:
```
Determinism: No Randomness
  Sample Data Generation
    ✓ Run 1: 169 cells calculated
    ✓ Run 2: matches run 1 (169/169 cells match)
    ✓ Run 3: matches run 1 (169/169 cells match)
    ✓ Run 4: matches run 1 (169/169 cells match)
    ✓ Run 5: matches run 1 (169/169 cells match)
    ✓ Run 6: matches run 1 (169/169 cells match)
    ✓ Run 7: matches run 1 (169/169 cells match)
    ✓ Run 8: matches run 1 (169/169 cells match)
    ✓ Run 9: matches run 1 (169/169 cells match)
    ✓ Run 10: matches run 1 (169/169 cells match)

10 passed (5200ms)
All runs produced identical output ✓ DETERMINISM VERIFIED
```

**If fails**:
- Look for randomness in calculation logic
- Check `Math.random()` usage (should not exist)
- Verify no timing-dependent logic

---

## Troubleshooting

### "Dev server not running on port 8080"
```bash
# Terminal 1
npm start

# Terminal 2 (in different window)
npm run test:all-sync
```

### "Tests timeout after 30 seconds"
- Increase Jest timeout: `jest.setTimeout(60000)` in test file
- Check if browser is hanging: inspect Chrome processes
- Verify Puppeteer cache is populated: `npx puppeteer browsers install chrome`

### "Assertion failed: actual X, expected Y"
- Check fixture baseline is correct
- Re-generate fixture: `npm run test:generate-fixture`
- Verify formula hasn't changed

### "Memory leak detected: growth 12%"
- Close other browser windows (Chrome memory)
- Run test again in isolation: `npm run test:performance -- --testNamePattern="Memory"`
- Profile with Chrome DevTools: `npm run test:performance -- --debug`

### "CSV export has blank cells"
- Check export format (CSV vs JSON)
- Verify grid is fully populated before export
- Check file encoding (UTF-8)

---

## CI/CD Integration

Tests run automatically on every commit via GitHub Actions.

**Check CI status**:
```bash
# View workflow runs
gh run list

# View logs for latest run
gh run view -w tests.yml
```

**Artifacts** (available in Actions):
- `coverage/` - Coverage report (HTML)
- `test-results.json` - Structured test output
- `performance-baseline.json` - Updated baselines (if faster)

**Blocking failures**: Tests must pass before merge to `main`

---

## Next Steps

After validation passes:
1. Review code coverage: `npm run test:coverage`
2. Update performance baselines if intentionally optimized
3. Commit fixture updates and test additions
4. Create PR with test changes

If any scenario fails, investigate and fix root cause before proceeding.
