# API Reference: Unit Test Coverage

**Spec**: 005 – Unit Test Coverage (API-Driven)  
**Last Updated**: 25 April 2026  
**Status**: Complete API Contract Documentation

---

## Module: interpolation.js

### Function: interpolateGrid()

**Signature**:
```javascript
export function interpolateGrid(measuredRows) → GridCell[][]
```

**Purpose**: Convert sparse grid measurements (1–169 points) into a complete 13×13 dense grid using bilinear interpolation.

**Parameters**:
- `measuredRows: MeasuredRow[]` - Array of measured grid points

**MeasuredRow Structure**:
```javascript
{
  frontBolt: number,     // Position on front bolt line (-6 to +6, integers only)
  rearBolt: number,      // Position on rear bolt line (-6 to +6, integers only)
  neg20: number,         // Camber reading at -20° steering (degrees)
  zero: number,          // Camber reading at 0° steering (degrees)
  pos20: number,         // Camber reading at +20° steering (degrees)
}
```

**Return Type**: `GridCell[][]` (2D Array - 13×13, NOT flat!)
- Outer array: Front bolt position (13 positions: -6, -5, ..., 5, 6)
- Inner array: Rear bolt position (13 positions: -6, -5, ..., 5, 6)
- Total cells: 169

**GridCell Structure**:
```javascript
{
  frontBolt: number,           // Position identifier (-6 to +6)
  rearBolt: number,            // Position identifier (-6 to +6)
  neg20: number,               // Interpolated or measured value
  zero: number,                // Interpolated or measured value
  pos20: number,               // Interpolated or measured value
  isInterpolated: boolean,     // true if interpolated, false if measured
}
```

**Behavior**:
- **Sparse Input**: Accepts 0–169 measured points
- **Complete Output**: Always returns 13×13 grid with all 169 cells
- **Measured Cells**: Return exact values with `isInterpolated = false`
- **Unmeasured Cells**: Use bilinear interpolation with `isInterpolated = true`
- **Edge Cases**: Falls back to nearest-neighbor if insufficient data
- **Empty Input**: Returns 13×13 grid with NaN values

**Examples**:

*Example 1: Minimal grid (single point at center)*
```javascript
const input = [
  { frontBolt: 0, rearBolt: 0, neg20: -1.0, zero: -1.1, pos20: -1.2 }
];
const output = interpolateGrid(input);
console.log(output.length);              // 13
console.log(output[0].length);           // 13
console.log(output[6][6]);               // { frontBolt: 0, rearBolt: 0, neg20: -1.0, zero: -1.1, pos20: -1.2, isInterpolated: false }
console.log(output[5][6].isInterpolated); // true (interpolated from adjacent cells)
```

*Example 2: Two-point grid (front-left and rear-right corners)*
```javascript
const input = [
  { frontBolt: -6, rearBolt: -6, neg20: -0.7, zero: -0.8, pos20: -0.9 },
  { frontBolt: 6, rearBolt: 6, neg20: -1.3, zero: -1.4, pos20: -1.5 }
];
const output = interpolateGrid(input);
// Interior points interpolated between corners
console.log(output[0][0].isInterpolated);   // false (measured)
console.log(output[12][12].isInterpolated); // false (measured)
console.log(output[6][6].isInterpolated);   // true (interpolated)
```

---

## Module: math-utils.js

### Function: calculateDeltas()

**Signature** ⚠️ **Returns Object, NOT number**:
```javascript
export function calculateDeltas(value, target) → Object
```

**Purpose**: Calculate signed and absolute differences between measured and target values.

**Parameters**:
- `value: number` - Measured value (degrees)
- `target: number` - Target/reference value (degrees)

**Return Type**:
```javascript
{
  delta: number,     // Signed difference: value - target
  absDelta: number,  // Absolute value: |value - target|
}
```

**Examples**:
```javascript
calculateDeltas(-1.2, -1.1);  // { delta: -0.1, absDelta: 0.1 }
calculateDeltas(-1.0, -1.1);  // { delta: 0.1, absDelta: 0.1 }
calculateDeltas(-1.1, -1.1);  // { delta: 0, absDelta: 0 }
calculateDeltas(-1.5, -1.1);  // { delta: -0.4, absDelta: 0.4 }
```

---

### Function: getColorThreshold()

**Signature** ⚠️ **Returns CSS class string, NOT boolean**:
```javascript
export function getColorThreshold(absDelta, metric = 'camber') → string
```

**Purpose**: Map absolute delta value to quality tier (green/orange/red) based on threshold.

**Parameters**:
- `absDelta: number` - Absolute delta value (always ≥ 0)
- `metric: string` - One of: `'camber'` (default), `'caster'`, `'toe'`

**Return Type**: CSS class string:
- `'target-met'` - Within green zone (best)
- `'near-target'` - Within orange zone (acceptable)
- `'off-target'` - Beyond orange zone (red, not acceptable)

**Thresholds by Metric**:

| Metric | Tier | Threshold | CSS Class |
|--------|------|-----------|-----------|
| **Camber** | GREEN | ≤ 0.15° | target-met |
| | ORANGE | ≤ 0.40° | near-target |
| | RED | > 0.40° | off-target |
| **Caster** | GREEN | ≤ 0.25° | target-met |
| | ORANGE | ≤ 0.60° | near-target |
| | RED | > 0.60° | off-target |
| **Toe** | GREEN | ≤ 0.10° | target-met |
| | ORANGE | ≤ 0.20° | near-target |
| | RED | > 0.20° | off-target |

**Examples**:
```javascript
getColorThreshold(0.10, 'camber');  // 'target-met' (≤ 0.15°)
getColorThreshold(0.15, 'camber');  // 'near-target' (> 0.15° but ≤ 0.40°)
getColorThreshold(0.25, 'camber');  // 'near-target'
getColorThreshold(0.40, 'camber');  // 'off-target' (> 0.40°)
getColorThreshold(0.50, 'camber');  // 'off-target'

getColorThreshold(0.20, 'caster');  // 'target-met' (≤ 0.25°)
getColorThreshold(0.30, 'caster');  // 'near-target' (> 0.25° but ≤ 0.60°)
getColorThreshold(0.65, 'caster');  // 'off-target'

getColorThreshold(0.08, 'toe');     // 'target-met' (≤ 0.10°)
getColorThreshold(0.15, 'toe');     // 'near-target'
getColorThreshold(0.25, 'toe');     // 'off-target'
```

---

### Function: calculateCaster()

**Signature**:
```javascript
export function calculateCaster(camberNeg20, camberPos20) → number
```

**Purpose**: Calculate caster angle from camber readings at two steering angles.

**Parameters**:
- `camberNeg20: number` - Camber reading at -20° steering (degrees)
- `camberPos20: number` - Camber reading at +20° steering (degrees)

**Return Type**: `number` (caster angle in degrees)

**Formula**:
```
Caster = CASTER_MULTIPLIER × |camberPos20 - camberNeg20|
       = 1.462 × |ΔCamber|
```

**Constant**: `CASTER_MULTIPLIER = 1.462`

**Examples**:
```javascript
calculateCaster(-0.8, -1.4);  // 1.462 × |-1.4 - (-0.8)| = 1.462 × 0.6 = 0.877
calculateCaster(-1.0, -1.1);  // 1.462 × |-1.1 - (-1.0)| = 1.462 × 0.1 = 0.1462
calculateCaster(-1.2, -1.2);  // 1.462 × |-1.2 - (-1.2)| = 1.462 × 0 = 0
calculateCaster(-1.0, -2.0);  // 1.462 × |-2.0 - (-1.0)| = 1.462 × 1.0 = 1.462
```

---

### Function: formatAngle()

**Signature**:
```javascript
export function formatAngle(degrees) → string
```

**Purpose**: Format angle value as human-readable string with 2 decimal places.

**Parameters**:
- `degrees: number` - Angle value in degrees

**Return Type**: `string` (formatted with ° symbol and 2 decimals)

**Examples**:
```javascript
formatAngle(-1.125);  // "-1.13°"
formatAngle(5.001);   // "5.00°"
formatAngle(0.1);     // "0.10°"
```

---

### Function: formatMillimeters()

**Signature**:
```javascript
export function formatMillimeters(value) → string
```

**Purpose**: Format measurement value as human-readable string in millimeters.

**Parameters**:
- `value: number` - Value in millimeters

**Return Type**: `string` (formatted with unit)

**Examples**:
```javascript
formatMillimeters(2.5);    // "2.50 mm"
formatMillimeters(0.001);  // "0.00 mm"
```

---

## Module: report-engine.js

### Function: processWheel()

**Signature**:
```javascript
export function processWheel(parsedCSV, options = {}) → WheelResult
```

**Purpose**: Process raw CSV data through interpolation and analysis pipeline, returning comprehensive wheel alignment report.

**Parameters**:
- `parsedCSV: ParsedCSVData` - Data from CSV parsed by csv-io.js
- `options?: object` - Optional configuration (defaults provided)

**WheelResult Structure**:
```javascript
{
  grid: GridCell[][],                  // 13×13 interpolated grid (from interpolateGrid)
  rows169: DerivedRow[],               // 169 calculated rows with deltas and colors
  bestCell: BestCell,                  // Single cell with best overall combination
  bestCamberCell: BestCell,            // Best camber match to target
  bestCasterCell: BestCell,            // Best caster match to target
  topByCamberDelta: BestCell[],        // Top N cells ordered by camber quality
  topByCasterDelta: BestCell[],        // Top N cells ordered by caster quality
  targets: {
    camber: number,                    // Target camber (degrees)
    caster: number,                    // Target caster (degrees) - null for rear wheels
    toe: number,                       // Target toe (millimeters or degrees)
  },
  measuredToe: number,                 // Toe value from CSV
}
```

**DerivedRow Structure** (one per grid cell):
```javascript
{
  frontBolt: number,                   // Grid position (-6 to +6)
  rearBolt: number,                    // Grid position (-6 to +6)
  camber: number,                      // Interpolated camber (degrees)
  caster: number,                      // Calculated caster (degrees)
  camberDelta: {                       // Result of calculateDeltas(camber, target.camber)
    delta: number,
    absDelta: number,
  },
  casterDelta: {                       // Result of calculateDeltas(caster, target.caster)
    delta: number,
    absDelta: number,
  },
  camberColor: string,                 // Result of getColorThreshold(camberDelta.absDelta, 'camber')
  casterColor: string,                 // Result of getColorThreshold(casterDelta.absDelta, 'caster')
  scoring: number,                     // Golden Rule score (0–100)
}
```

**BestCell Structure**:
```javascript
{
  frontBolt: number,
  rearBolt: number,
  camber: number,
  caster: number,
  camberDelta: {delta, absDelta},
  casterDelta: {delta, absDelta},
  camberColor: string,
  casterColor: string,
  scoring: number,
  reason: string,                      // Explanation of selection (e.g., "Best camber match")
}
```

**Behavior**:
- **Golden Rule Scoring**: Applies complex scoring algorithm
  - Camber deviation > 1.0° gets heavy penalty
  - Balanced approach: considers both camber and caster
  - Scoring range: 0 (worst) to 100 (perfect)
- **Rear Wheels**: targetCaster = null (no caster adjustment available)
- **Symmetry**: Can be analyzed via symmetryAnalysis() function

**Example**:
```javascript
const wheelResult = processWheel(parsedCSV);
console.log(wheelResult.bestCell.camberColor);  // 'target-met' or 'near-target'
console.log(wheelResult.rows169.length);        // 169
console.log(wheelResult.grid.length);           // 13 (2D array)
console.log(wheelResult.targets.caster);        // null if rear wheel
```

---

### Function: symmetryAnalysis()

**Signature**:
```javascript
export function symmetryAnalysis(flResult, frResult, rlResult?, rrResult?) → SymmetryResult
```

**Purpose**: Analyze symmetry between left and right wheels, accounting for rear wheel special case.

**Parameters**:
- `flResult: WheelResult` - Front-left wheel result
- `frResult: WheelResult` - Front-right wheel result
- `rlResult?: WheelResult` - Rear-left wheel result (optional)
- `rrResult?: WheelResult` - Rear-right wheel result (optional)

**Symmetry Tolerances**:

| Axis | Metric | Tolerance |
|------|--------|-----------|
| **Front (FL/FR)** | Camber | ±0.3° |
| | Caster | ±0.15° |
| **Rear (RL/RR)** | Camber | ±0.3° |
| | Caster | N/A (null for rear) |

**SymmetryResult Structure**:
```javascript
{
  frontSymmetry: {
    camber: boolean,     // true if |FL.camber - FR.camber| ≤ 0.3°
    caster: boolean,     // true if |FL.caster - FR.caster| ≤ 0.15°
  },
  rearSymmetry?: {
    camber: boolean,     // true if |RL.camber - RR.camber| ≤ 0.3°
    // Note: No caster field (rear wheels have no caster target)
  },
  overallSymmetric: boolean,  // true if all checked axes are symmetric
}
```

**Rear Wheel Behavior**:
- Rear wheels have `targetCaster = null` in options
- No caster symmetry check for rear wheels
- Only camber is checked for rear wheel symmetry

**Examples**:

*Example 1: Symmetric front, no rear wheels*
```javascript
const result = symmetryAnalysis(flResult, frResult);
// result.frontSymmetry = { camber: true, caster: true }
// result.rearSymmetry = undefined
// result.overallSymmetric = true
```

*Example 2: Asymmetric front*
```javascript
const result = symmetryAnalysis(flResult, frResult);
// flResult.bestCell.camber = -1.0, frResult.bestCell.camber = -1.5
// Difference: 0.5° > 0.3° tolerance
// result.frontSymmetry = { camber: false, caster: true }
// result.overallSymmetric = false
```

*Example 3: Front and rear wheels*
```javascript
const result = symmetryAnalysis(flResult, frResult, rlResult, rrResult);
// result.frontSymmetry = { camber: true, caster: true }
// result.rearSymmetry = { camber: true }
// result.overallSymmetric = true
```

---

## Module: input-grid.js

### Function: setMeasurements()

**Signature**:
```javascript
export function setMeasurements(measurements) → void
```

**Purpose**: Store grid measurements in memory.

**Parameters**:
- `measurements: MeasuredRow[]` - Grid measurement data

**Behavior**: Stores data for retrieval by getMeasurements()

---

### Function: getMeasurements()

**Signature**:
```javascript
export function getMeasurements() → MeasuredRow[]
```

**Purpose**: Retrieve stored grid measurements.

**Return Type**: Array of MeasuredRow objects or empty array if none stored

---

### Function: reset()

**Signature**:
```javascript
export function reset() → void
```

**Purpose**: Clear all stored measurements.

---

### Function: validate()

**Signature**:
```javascript
export function validate() → ValidationResult
```

**Purpose**: Validate integrity of stored measurements.

**Return Type**:
```javascript
{
  isValid: boolean,
  errors: string[],      // List of validation errors if any
}
```

---

## Module: localstorage-io.js

### Function: saveMeasurements()

**Signature**:
```javascript
export function saveMeasurements(data) → void
```

**Purpose**: Persist grid measurements to localStorage.

**Parameters**:
- `data: MeasuredRow[]` - Measurements to save

**Behavior**:
- Uses localStorage key: `alignment_measurements`
- Serializes to JSON
- No errors thrown on failure (graceful degradation)

---

### Function: loadMeasurements()

**Signature**:
```javascript
export function loadMeasurements() → MeasuredRow[]
```

**Purpose**: Retrieve grid measurements from localStorage.

**Return Type**: Array of MeasuredRow objects or empty array if not found

**Behavior**:
- Returns empty array if key doesn't exist
- Returns empty array if JSON parse fails (corrupt data)
- No errors thrown

---

### Function: clearMeasurements()

**Signature**:
```javascript
export function clearMeasurements() → void
```

**Purpose**: Delete grid measurements from localStorage.

---

## Module: table-builder.js

### Function: buildTable()

**Signature**:
```javascript
export function buildTable(rows) → HTMLTableElement
```

**Purpose**: Generate HTML table from row data.

**Parameters**:
- `rows: object[]` - Array of data objects to tabulate

**Return Type**: DOM element (table)

---

## Module: chart-builder.js

### Function: buildChart()

**Signature**:
```javascript
export function buildChart(data, options) → HTMLElement
```

**Purpose**: Generate chart visualization from data.

**Parameters**:
- `data: object[]` - Chart data
- `options: object` - Chart configuration (type, colors, etc.)

**Return Type**: DOM element (chart container)

---

## Module: washer-diagram.js

### Function: drawWasher()

**Signature**:
```javascript
export function drawWasher(context, angles, radius) → void
```

**Purpose**: Draw washer diagram on canvas.

**Parameters**:
- `context: CanvasRenderingContext2D` - Canvas context
- `angles: number[]` - Array of angles to plot
- `radius: number` - Radius for diagram scaling

---

## Constants: constants.js

**CAMBER_TARGET**: -1.1° (target camber)  
**CASTER_TARGET**: 5.0° (target caster)  
**TOE_TARGET**: 0.0° (target toe)  
**CASTER_MULTIPLIER**: 1.462 (caster calculation constant)  
**SYMMETRY_TOLERANCE**: 0.3° (camber symmetry tolerance)  
**CASTER_TOLERANCE**: 0.15° (caster symmetry tolerance)  
**COLOR_THRESHOLDS**: Color tier definitions (see getColorThreshold() section)

---

## Test Requirements Summary

| Module | Critical APIs | Min Coverage |
|--------|---------------|--------------|
| interpolation | interpolateGrid() | 80% |
| math-utils | calculateDeltas, getColorThreshold, calculateCaster | 80% |
| report-engine | processWheel, symmetryAnalysis | 80% |
| input-grid | setMeasurements, getMeasurements, validate | 70% |
| localstorage-io | saveMeasurements, loadMeasurements | 75% |
| table-builder | buildTable | 60% |
| chart-builder | buildChart | 60% |
| washer-diagram | drawWasher | 65% |

---

## Error Handling Philosophy

All modules follow **graceful degradation**:
- No errors thrown on invalid input
- Fallback values or empty results returned
- Errors logged to console (via error-handler.js)
- Tests should verify graceful behavior, not error throwing
