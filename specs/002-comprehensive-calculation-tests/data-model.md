# Data Model: Test Suite Entities & Fixtures

## Overview

Test suite uses JSON-based fixtures stored in `tests/fixtures/` representing alignment measurement grids, calculations, and performance baselines. All test data is deterministic and version-controlled.

---

## Core Entities

### GridCell

Represents a single bolt position combination measurement point in a wheel's grid.

| Field | Type | Constraint | Notes |
|-------|------|-----------|-------|
| frontBolt | integer | -6 to +6 | Camber bolt position (x-axis) |
| rearBolt | integer | -6 to +6 | Caster bolt position (y-axis) |
| measured | boolean | true/false | Whether cell is measured (not interpolated) |
| isInterpolated | boolean | true/false | Inverse of measured (convenience flag) |
| angle360ACW | float | degrees | Camber at 360° anti-clockwise steering |
| angle0 | float | degrees | Camber at 0° steering position |
| angle360CW | float | degrees | Camber at 360° clockwise steering |
| expectedCamber | float | degrees | Calculated average camber (360ACW + 0° + 360CW) / 3 |
| expectedCaster | float | degrees | Calculated caster (360CW - 360ACW) / 2 |
| expectedColor | string | green/orange/red | Expected UI cell color (distance to target) |

**Validation Rules**:
- angles in [-10, 10]° range (alignment-specific)
- measurable positions (-6, -3, 0, +3, +6) must have measured=true
- measured=true implies isInterpolated=false
- expectedCamber = (angle360ACW + angle0 + angle360CW) / 3
- expectedCaster = (angle360CW - angle360ACW) / 2

**Invariants**:
- Required positions must exist: -6, -3, 0, +3, +6 for each axis
- All 169 cells must be present (13×13) or 25 cells (5×5), etc.
- Interpolated cells: values between measured neighbor range

### Wheel

Represents complete measurement grid for a single wheel (FL, FR, RL, RR).

| Field | Type | Constraint | Notes |
|-------|------|-----------|-------|
| wheel | enum | FL/FR/RL/RR | Wheel identifier |
| gridSize | integer | 5, 7, 13 | Density (5×5=25, 7×7=49, 13×13=169 cells) |
| cells | GridCell[] | length = gridSize² | All bolt position combinations |
| targets | object | required | Target alignment values |
| targets.camber | float | degrees | Front: -1.10°, Rear: -1.50° |
| targets.caster | float | degrees | Front only: 5.00° (rear uses toe) |
| targets.toe | float | degrees | Per wheel: 0.07° |

**Validation**:
- cells array length must = gridSize²
- All required positions present in cells array
- Targets must be numeric and realistic

**Invariants**:
- All 4 wheels (FL, FR, RL, RR) must be present in test fixture
- Same gridSize for all wheels when comparing

### TestResult

Represents outcome of a single test execution (unit, integration, performance).

| Field | Type | Constraint | Notes |
|-------|------|-----------|-------|
| testName | string | non-empty | Unique test identifier |
| category | string | unit/integration/invariant/regression/performance | Test classification |
| passed | boolean | true/false | Test outcome |
| duration | integer | ms | Execution time |
| actual | float | numeric | Actual value produced |
| expected | float | numeric | Expected/baseline value |
| tolerance | float | numeric | Allowed deviation |
| message | string | optional | Pass message or failure reason |

**Validation**:
- duration >= 0
- If passed=true, |actual - expected| <= tolerance
- message required if passed=false

### PerformanceBaseline

Aggregate performance metrics across multiple test runs (for regression detection).

| Field | Type | Constraint | Notes |
|-------|------|-----------|-------|
| testName | string | non-empty | Performance test identifier |
| avgDuration | integer | ms | Average across all samples |
| minDuration | integer | ms | Fastest run |
| maxDuration | integer | ms | Slowest run |
| stdDev | float | ms | Standard deviation |
| sampleCount | integer | > 0 | Number of runs averaged |
| timestamp | ISO8601 | date | When baseline was measured |
| ciRunnerSpecs | string | optional | Reference device info (CPU, mem, browser version) |

**Validation**:
- minDuration <= avgDuration <= maxDuration
- stdDev >= 0
- sampleCount >= 10 (statistically meaningful baseline)

### ExportFixture

Complete snapshot of alignment data (input + calculated output) from a known version.

| Field | Type | Constraint | Notes |
|-------|------|-----------|-------|
| version | string | semver | Fixture version (e.g., "1.0.0") |
| generatedDate | ISO8601 | date | When fixture was created |
| sampleDataVersion | string | grid density | "5x5", "7x7", "13x13" |
| wheels | Wheel[] | length = 4 | FL, FR, RL, RR wheels |
| configState | object | optional | Locked/symmetric settings at generation time |
| calculationSummary | object | optional | High-level stats (best cell, worst cell, avg color) |

**Purpose**: Regression testing — load fixture, recalculate, compare to stored values

---

## Test Fixtures (JSON Schema)

### Full Fixture File Example

```json
{
  "version": "1.0",
  "generatedDate": "2026-06-29T12:00:00Z",
  "sampleDataVersion": "13x13",
  "wheels": {
    "FL": {
      "wheel": "FL",
      "gridSize": 13,
      "targets": {
        "camber": -1.10,
        "caster": 5.00,
        "toe": 0.07
      },
      "cells": [
        {
          "frontBolt": -6,
          "rearBolt": -6,
          "measured": true,
          "isInterpolated": false,
          "angle360ACW": 5.71,
          "angle0": 2.0,
          "angle360CW": 0.74,
          "expectedCamber": 2.82,
          "expectedCaster": -2.485,
          "expectedColor": "red"
        },
        {
          "frontBolt": -6,
          "rearBolt": -5,
          "measured": false,
          "isInterpolated": true,
          "angle360ACW": 5.59,
          "angle0": 1.84,
          "angle360CW": 0.63,
          "expectedCamber": 2.69,
          "expectedCaster": -2.48,
          "expectedColor": "red"
        }
      ]
    },
    "FR": { /* ... */ },
    "RL": { /* ... */ },
    "RR": { /* ... */ }
  },
  "configState": {
    "rearToeLocked": false,
    "symmetricCamber": false,
    "measurementDensity": 13
  },
  "calculationSummary": {
    "bestCellFL": { "frontBolt": 0, "rearBolt": 0, "score": 0.98 },
    "worstCellFL": { "frontBolt": -6, "rearBolt": -6, "score": 0.12 },
    "averageColorDistanceFL": 0.45
  }
}
```

---

## File Organization

### `tests/fixtures/exports/`

Prior alignment files for regression testing.

```
alignment-export-v1.json       Sample data with known output (13×13)
alignment-export-v2.json       Different sample set for regression baseline
alignment-export-sparse.json   5×5 density fixture for boundary testing
alignment-export-edge-cases.json  Division by zero, identical values, etc.
```

### `tests/fixtures/sample-data/`

Known-correct calculation values for unit test assertions.

```
known-values.json              Lookup table: (frontBolt, rearBolt) → expectedValues
caster-test-cases.json         Caster formula test cases: 360CW, 360ACW → expectedCaster
interpolation-points.json      Interpolation test values: neighbors → expectedInterpolated
```

### `tests/performance/baselines.json`

Performance benchmark baseline (regenerated with each release).

```json
{
  "calculation-speed-13x13": {
    "testName": "13×13 grid full calculation",
    "avgDuration": 350,
    "minDuration": 280,
    "maxDuration": 420,
    "stdDev": 45,
    "sampleCount": 20,
    "timestamp": "2026-06-29T12:00:00Z"
  },
  "chart-render-scatter": {
    "testName": "Scatter chart render with 169 points",
    "avgDuration": 420,
    "minDuration": 350,
    "maxDuration": 500,
    "stdDev": 55,
    "sampleCount": 20,
    "timestamp": "2026-06-29T12:00:00Z"
  }
}
```

---

## Relationships

```
ExportFixture (1) ─── contains ──→ Wheel (4)
                                      ↓
                                   GridCell (169 per wheel)

TestResult ─ validates → GridCell | Wheel | ExportFixture
PerformanceBaseline ─ measures → TestResult (aggregated)
```

---

## Validation & Constraints

**Cell-Level**:
- Angles in degrees: [-10, 10]
- Measured flag consistency: measured=true ⟺ isInterpolated=false
- Required positions: -6, -3, 0, +3, +6 must be measured

**Wheel-Level**:
- All 4 wheels present: FL, FR, RL, RR
- gridSize consistent across wheels
- cells array length = gridSize²

**Fixture-Level**:
- version semver-compliant
- All wheels valid
- Targets realistic (camber ~-2 to 0°, caster ~4-6°, toe ~0-0.1°)

**Performance-Level**:
- sampleCount >= 10
- minDuration <= avgDuration <= maxDuration
- stdDev >= 0

---

## Fixture Generation & Maintenance

**How Fixtures Are Created**:
1. Run application with sample data: `npm run test:populate-sample`
2. Extract grid from browser localStorage
3. Calculate expected values (caster, camber, color)
4. Validate against known-good values
5. Save as `tests/fixtures/exports/alignment-export-vN.json`

**When to Update Baselines**:
- After intentional formula changes (version bump + PR doc)
- After fixing calculation bugs (regression test now passes)
- After performance improvements (baseline decreases, tests pass)

**Regression Detection**:
- Load fixture, recalculate
- Compare all 169 cells to fixture values
- Alert if any cell differs > tolerance (0.01°)

---

## Test Data Lifecycle

```
Create Fixture
    ↓
Load in Test
    ↓
Recalculate
    ↓
Compare to Expected
    ↓
Pass/Fail Result
    ↓
Store Result in TestResult
    ↓
Aggregate for Baseline (if performance test)
```
