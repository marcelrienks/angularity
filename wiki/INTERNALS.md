# INTERNALS — Technical Deep-Dives & Algorithms

**MX-5 NC1 Wheel Alignment System**  
Last updated: April 26, 2026

In-depth technical documentation: algorithms, optimizations, debugging, and edge cases.

---

## Table of Contents

1. [Bilinear Interpolation Algorithm](#bilinear-interpolation-algorithm)
2. [Report Generation & Three Optima](#report-generation--three-optima)
3. [Golden Rule Scoring](#golden-rule-scoring)
4. [Data Transformation Pipeline](#data-transformation-pipeline)
5. [Error Handling Patterns](#error-handling-patterns)
6. [Performance Optimizations](#performance-optimizations)
7. [Debugging & Tracing](#debugging--tracing)

---

## Bilinear Interpolation Algorithm

### Problem Statement

**Input**: Sparse measurement grid (30–100 measured points out of 169 possible)

**Output**: Dense grid with all 169 cells filled (measured + interpolated)

**Challenge**: Estimate alignment values at unmeasured bolt position combinations using neighboring measurements.

### Mathematical Foundation

Bilinear interpolation estimates a value at point (x, y) using four nearest corner points.

**Formula**:
```
Let f(x, y) = value at position (x, y)
Let (x₀, x₁) = two nearest x positions (x₀ < x < x₁)
Let (y₀, y₁) = two nearest y positions (y₀ < y < y₁)

Define normalized distances:
ux = (x - x₀) / (x₁ - x₀)   where 0 ≤ ux ≤ 1
uy = (y - y₀) / (y₁ - y₀)   where 0 ≤ uy ≤ 1

Interpolated value:
f(x, y) = f(x₀,y₀)·(1-ux)·(1-uy) + f(x₁,y₀)·ux·(1-uy)
        + f(x₀,y₁)·(1-ux)·uy   + f(x₁,y₁)·ux·uy
```

**In Plain English**: Weight each corner by its distance to the target point. Closer corners have higher weight.

### Example: Interpolate at Front -0.5, Rear +1.5

**Scenario**: Measurements at four corners, need value at center-ish point.

```javascript
const f00 = 0.50;  // Front 0, Rear -1
const f10 = 0.75;  // Front -1, Rear -1
const f01 = 0.30;  // Front 0, Rear +3
const f11 = 0.55;  // Front -1, Rear +3

const x = -0.5, y = 1.5;   // Target position
const x0 = 0, x1 = -1;
const y0 = -1, y1 = +3;

// Calculate normalized distances
const ux = (x - x0) / (x1 - x0) = (-0.5 - 0) / (-1 - 0) = 0.5  // Halfway between
const uy = (y - y0) / (y1 - y0) = (1.5 - (-1)) / (3 - (-1)) = 0.625

// Bilinear interpolation
const result = f00 * (1-ux) * (1-uy) + f10 * ux * (1-uy)
             + f01 * (1-ux) * uy     + f11 * ux * uy
           = 0.50 * 0.5 * 0.375 + 0.75 * 0.5 * 0.375
           + 0.30 * 0.5 * 0.625 + 0.55 * 0.5 * 0.625
           = 0.09375 + 0.14063 + 0.09375 + 0.17188
           = 0.50 (weighted average of four corners)
```

### Implementation Strategy

```javascript
function interpolateGrid(measuredRows) {
  const grid = initialize13x13GridWithNaN();
  
  // Step 1: Place measured points
  for (const row of measuredRows) {
    const { frontBolt, rearBolt, neg20, zero, pos20 } = row;
    const frontIdx = frontBolt + 6;  // Map -6..+6 to 0..12
    const rearIdx = rearBolt + 6;
    grid[frontIdx][rearIdx] = { neg20, zero, pos20, isInterpolated: false };
  }
  
  // Step 2: For each unmeasured cell, find nearest 4 neighbors and interpolate
  for (let fi = 0; fi < 13; fi++) {
    for (let ri = 0; ri < 13; ri++) {
      if (!grid[fi][ri]) {  // Unmeasured cell
        // Find four nearest measured points
        const corners = findNearestFourCorners(grid, fi, ri);
        
        // Interpolate all three steering angles
        grid[fi][ri] = {
          neg20: bilinearInterpolate(corners, 'neg20'),
          zero: bilinearInterpolate(corners, 'zero'),
          pos20: bilinearInterpolate(corners, 'pos20'),
          isInterpolated: true
        };
      }
    }
  }
  
  return grid;
}
```

### Edge Cases

1. **No measurements** → Return grid of NaN
2. **Single measurement** → Use nearest-neighbor (repeat same value)
3. **Measurements only on edges** → Extrapolation (use edge value)
4. **Sparse scattered measurements** → Interpolation may be inaccurate (caveat: "best effort")

---

## Report Generation & Three Optima

### Concept: Why Three Recommendations?

**Problem**: Camber and caster are **coupled** in eccentric bolt adjustment.
- Moving front bolt affects both camber AND caster simultaneously
- Moving rear bolt affects both simultaneously
- A bolt position optimized for camber may sacrifice caster, and vice versa

**Solution**: Show three trade-off scenarios.

```javascript
bestCell       = Best compromise (balances both equally)
bestCamberCell = Best camber (sacrifices caster if needed)
bestCasterCell = Best caster (sacrifices camber if needed)
```

### Analysis Pipeline (Step-by-Step)

#### Step 1: Load Measurement Grid

```javascript
const measurements = [
  { frontBolt: -1, rearBolt: +2, neg20: 1.50, zero: 1.55, pos20: 1.48 },
  { frontBolt:  0, rearBolt: -1, neg20: 1.35, zero: 1.40, pos20: 1.38 },
  // ... typically 30-100 measurements
];
```

#### Step 2: Interpolation → Full Grid

```javascript
const gridData = interpolateGrid(measurements);
// Result: 13×13 grid with all 169 cells filled
// Each cell: { neg20, zero, pos20, isInterpolated }
```

#### Step 3: Calculate Camber & Caster per Cell

```javascript
for (let fi = 0; fi < 13; fi++) {
  for (let ri = 0; ri < 13; ri++) {
    const cell = grid[fi][ri];
    
    // Average three steering angles for camber
    const camber = (cell.neg20 + cell.zero + cell.pos20) / 3;
    
    // Caster = change in camber across steering angles
    const caster = (cell.neg20 - cell.pos20) / 40;  // 40° steering range
    
    cell.camber = camber;
    cell.caster = caster;
  }
}
```

#### Step 4: Score Each Position (Golden Rule)

```javascript
for each cell in grid:
  error_camber = cell.camber - TARGET_CAMBER
  error_caster = cell.caster - TARGET_CASTER
  
  score = calculateGoldenRuleScore(error_camber, error_caster)
  
  cell.score = score
  
  // Track three best positions
  if (score < best_compromise.score):
    best_compromise = cell
  if (error_camber < best_camber.error_camber):
    best_camber = cell
  if (error_caster < best_caster.error_caster):
    best_caster = cell
```

#### Step 5: Return Three Optima

```javascript
return {
  bestCell: best_compromise,
  bestCamberCell: best_camber,
  bestCasterCell: best_caster
}
```

---

## Golden Rule Scoring

### Three-Tier Hierarchy

Scoring prioritizes based on camber and caster accuracy.

#### Tier 1: Camber Lock
```
If |camber_error| > 1.0°, reject this position entirely
Score = ∞ (worst possible)
Rationale: Camber way off causes tire wear and handling issues
```

#### Tier 2: Conditional Caster
```
If |camber_error| ≤ 0.5°:
  Weight caster 3x (prioritize caster since camber is excellent)
Else:
  Fall through to Tier 3
```

#### Tier 3: Balanced Weighting
```
Default weighted approach:
  Score = (1.5 × |camber_error|) + (1.0 × |caster_error|)
```

### Scoring Examples

**Position A: Camber -1.10° (perfect), Caster 4.95° (0.05° off)**
```
|camber_error| = |-1.10 - (-1.1)| = 0.0°   ← ≤ 0.5°, so use Tier 2
|caster_error| = |4.95 - 5.0| = 0.05°

Score (Tier 2) = (1.5 × 0.0) + (3.0 × 0.05) = 0.15  ← Best camber, trades caster
```

**Position B: Camber -1.15° (0.05° off), Caster 5.00° (perfect)**
```
|camber_error| = |-1.15 - (-1.1)| = 0.05°  ← ≤ 0.5°, so use Tier 2
|caster_error| = |5.00 - 5.0| = 0.0°

Score (Tier 2) = (1.5 × 0.05) + (3.0 × 0.0) = 0.075  ← Best caster, trades camber
```

**Position C: Camber -1.12° (0.02° off), Caster 4.98° (0.02° off)**
```
|camber_error| = |-1.12 - (-1.1)| = 0.02°  ← ≤ 0.5°, so use Tier 2
|caster_error| = |4.98 - 5.0| = 0.02°

Score (Tier 2) = (1.5 × 0.02) + (3.0 × 0.02) = 0.09  ← Best compromise
```

**Result**:
- bestCasterCell = Position B (score 0.075, prioritizes caster)
- bestCamberCell = Position A (score 0.15, prioritizes camber)
- bestCell (compromise) = Position C (score 0.09, balances both)

---

## Data Transformation Pipeline

### Complete Tracing Flow

```
INPUT PAGE (User enters measurement)
  ↓
  User clicks cell: Front -1, Rear +2
  Enters value: -1.15° (at 0° steering)
  ↓
VALIDATION LAYER
  Range check: -3.0 to +3.0 ✓
  Type check: numeric ✓
  Precision: 0.01 ✓
  ↓
PERSISTENCE LAYER
  Save to localStorage
  Key: wheel-FL-gridState
  Data: { frontBolt: -1, rearBolt: +2, neg20: ?, zero: -1.15, pos20: ? }
  (User must enter all three steering angles, not just 0°)
  ↓ (user navigates to report)
REPORT PAGE LOAD
  ↓
LOAD FROM STORAGE
  Read: wheel-FL-gridState (all 169 cells)
  Sparse: ~50 cells measured, ~119 empty
  ↓
INTERPOLATION LAYER
  Input: 50 measured cells
  Process: Bilinear interpolation on 13×13 grid
  Output: All 169 cells filled (measured + interpolated)
  ↓
ANALYSIS ENGINE
  Input: Dense 13×13 grid
  Process:
    1. Calculate camber & caster for each cell (average 3 steering angles)
    2. Score each position (Golden Rule)
    3. Extract best 3 (compromise, camber, caster)
  Output: {
    bestCell: { front: -1, rear: +2, camber: -1.10, caster: 5.05, score: 0.15 },
    bestCamberCell: { ... },
    bestCasterCell: { ... }
  }
  ↓ (rendering layer - all independent)
  ├─ Raw Data Summary: reads dense grid directly
  ├─ Chart Generator: reads dense grid directly
  ├─ Bolt Diagram: reads best cells directly
  └─ Symmetry Analysis: compares FL & FR independent analyses
```

### Validation Checkpoints

1. **Input**: User data type & range
2. **Persistence**: localStorage quota & permissions
3. **Interpolation**: Handle NaN and sparse data
4. **Analysis**: Reject if too few measurements
5. **Rendering**: Graceful fallback if component fails

---

## Error Handling Patterns

### Pattern 1: Input Validation (User Data)

```javascript
function validateMeasurement(value) {
  // Step 1: Check for null/undefined
  if (value === null || value === undefined) {
    return {
      error: 'INVALID_VALUE',
      message: 'Measurement value is required',
      recovery: 'user'
    };
  }
  
  // Step 2: Check type
  if (typeof value !== 'number') {
    return {
      error: 'INVALID_TYPE',
      message: 'Measurement must be a number',
      recovery: 'user'
    };
  }
  
  // Step 3: Check range
  if (value < -3.0 || value > +3.0) {
    return {
      error: 'OUT_OF_RANGE',
      message: `Measurement must be -3.0 to +3.0 (got ${value}°)`,
      recovery: 'user'
    };
  }
  
  // Valid
  return { error: null };
}
```

### Pattern 2: Recovery Strategy (localStorage Quota)

```javascript
function saveWithRecovery(key, data) {
  try {
    localstorage-io.save(key, data);  // Try normal save
  } catch (err) {
    if (err.name === 'QuotaExceededError') {
      // Recovery: Delete old preset to make room
      presets-manager.deletePreset('auto-save-old');
      
      // Retry save
      try {
        localstorage-io.save(key, data);
        showNotification('Freed storage, data saved');
      } catch (retryErr) {
        throw retryErr;  // Still failing, give up
      }
    } else {
      throw err;  // Not recoverable
    }
  }
}
```

### Pattern 3: Silent Failure (Edge Case)

```javascript
function interpolateValue(neighbors) {
  // If we have no neighbors, can't interpolate
  if (!neighbors || neighbors.length === 0) {
    // Return default, log warning (not error)
    console.warn('No neighbors for interpolation, using default value');
    return 0;  // Default value
  }
  
  // Proceed with normal interpolation
  return bilinearInterpolate(neighbors);
}
```

---

## Performance Optimizations

### High-Priority: localStorage Debouncing

**Problem**: `JSON.stringify()` called on EVERY keystroke (169 cells × 3 angles × multiple changes/sec)

**Current Performance**: ~100 serializations/minute during active editing

**Impact**: Noticeable lag on slower devices

**Solution**: Debounce localStorage writes to 500ms

```javascript
let debounceTimer = null;

function saveToLocalStorage() {
  try {
    localStorage.setItem('wheelData', JSON.stringify(gridState));
  } catch (err) {
    showErrorBanner('Failed to save alignment data');
  }
}

inputElement.addEventListener('input', (e) => {
  const value = e.target.value;
  gridState[cellKey] = value;
  
  // Debounce: clear existing timer, set new one
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(saveToLocalStorage, 500);
});
```

**Expected Impact**: 50-80% reduction in localStorage operations

### Medium-Priority: Double-Sort Fix

**Problem**: Grid processed twice (sorts 169 cells twice for camber and caster)

**Current Code**:
```javascript
const topCamberPositions = allPositions.sort((a, b) => a.camberError - b.camberError);
const topCasterPositions = allPositions.sort((a, b) => a.casterError - b.casterError);
```

**Solution**: Single sort, extract both from sorted array

```javascript
const allPositions = [...];
allPositions.sort((a, b) => a.goldenRuleScore - b.goldenRuleScore);

const bestCell = allPositions[0];  // Best compromise
const bestCamberCell = allPositions.reduce((best, pos) => 
  Math.abs(pos.camberError) < Math.abs(best.camberError) ? pos : best
);
const bestCasterCell = allPositions.reduce((best, pos) => 
  Math.abs(pos.casterError) < Math.abs(best.casterError) ? pos : best
);
```

**Expected Impact**: 2x faster grid processing

---

## Debugging & Tracing

### Trace a Measurement Through the Pipeline

1. **Set breakpoint in input-grid.js** (when value entered)
2. **Step into localStorage-io.save()**  (verify stored)
3. **Reload report page, set breakpoint in report-engine.js**
4. **Step through analyzeWheel()** (watch grid values)
5. **Inspect calculated camber/caster** (compare vs expected)
6. **Check Golden Rule scoring** (verify position ranked correctly)

### Common Debugging Scenarios

**Scenario 1: Report shows different value than I entered**

```javascript
// Likely cause: Interpolation changed the value

// Check:
// 1. Was it measured or interpolated?
grid[fi][ri].isInterpolated  // true = interpolated (estimated)

// 2. Verify the interpolation formula
// Use browser console:
const grid = interpolateGrid(measurements);
console.table(grid);  // See which cells are measured vs interpolated

// 3. Check if measurement was too sparse
// If < 10 measurements total, interpolation quality poor
```

**Scenario 2: Bolt position doesn't match symmetry search result**

```javascript
// Likely cause: Symmetry tolerance too strict

// Check:
CAMBER_TOLERANCE  // Should be ±0.3°
CASTER_TOLERANCE  // Should be ±0.3°

// 2. Verify symmetry search result
const symmetryResult = reportEngine.findSymmetricPair(flData, frData);
console.log(symmetryResult);  // See FL/FR values

// 3. Calculate differences manually
const camberDiff = Math.abs(flData.bestCell.camber - frData.bestCell.camber);
const casterDiff = Math.abs(flData.bestCell.caster - frData.bestCell.caster);
console.log(`Camber diff: ${camberDiff}°, Caster diff: ${casterDiff}°`);
```

### Browser DevTools Tips

| Task | How |
|------|-----|
| **Inspect grid state** | `console.log(JSON.parse(localStorage['wheel-FL-gridState']))` |
| **Watch interpolation** | Set breakpoint in interpolation.js → step through bilinear formula |
| **Check scoring** | `console.log(result.bestCell.score)` → verify against calculated |
| **Trace data flow** | Add `console.log()` at each pipeline step → follow output |
| **Performance profile** | DevTools → Performance → record interaction → analyze |

---

## Related Documentation

- **System architecture & design**: [ARCHITECTURE.md](ARCHITECTURE.md)
- **How to use the tool**: [GUIDE.md](GUIDE.md)
- **Current blockers**: [todo.md](todo.md)
