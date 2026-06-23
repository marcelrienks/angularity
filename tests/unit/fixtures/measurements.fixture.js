/**
 * Measurement Fixtures: Specific test values for calculation testing
 * 
 * These fixtures test boundary conditions, color thresholds, and delta calculations
 * using constants from math-utils.js and constants.js
 * 
 * Color Thresholds (from research.md):
 * - Camber GREEN: ±0.15°, ORANGE: ±0.40°, RED: >0.40°
 * - Caster GREEN: ±0.25°, ORANGE: ±0.60°, RED: >0.60°
 * - Toe GREEN: ±0.10°, ORANGE: ±0.20°, RED: >0.20°
 */

/**
 * Excellent camber, good caster: Within green zones
 * Target camber: -1.1°, Target caster: 5.0°
 */
export const excellentCamberGoodCaster = {
  camberBolt: 0,
  casterBolt: 0,
  neg20: -0.95,     // Measured
  zero: -1.08,      // Measured (delta: -0.08, within camber GREEN ±0.15°)
  pos20: -1.24,     // Measured (implies caster: ~0.26, within GREEN ±0.25°)
};

/**
 * Excellent camber, poor caster: Camber green, caster orange/red
 * Camber within green, but caster > 0.60°
 */
export const excellentCamberPoorCaster = {
  camberBolt: 0,
  casterBolt: 0,
  neg20: -0.90,     // Measured
  zero: -1.09,      // Measured (delta: -0.09, within camber GREEN)
  pos20: -1.50,     // Measured (implies caster: ~0.87, RED >0.60°)
};

/**
 * Poor camber (just outside green): Camber orange
 * Target -1.1°, measured -1.30° (delta: -0.20, orange but not red)
 */
export const poorCamberOrangeTier = {
  camberBolt: 0,
  casterBolt: 0,
  neg20: -1.00,     // Measured
  zero: -1.30,      // Measured (delta: -0.20, within camber ORANGE ±0.40°)
  pos20: -1.50,     // Measured
};

/**
 * Very poor camber (in red zone): Camber red
 * Target -1.1°, measured -1.60° (delta: -0.50, RED >0.40°)
 */
export const veryPoorCamberRedTier = {
  camberBolt: 0,
  casterBolt: 0,
  neg20: -1.10,     // Measured
  zero: -1.60,      // Measured (delta: -0.50, RED >0.40°)
  pos20: -2.10,     // Measured
};

/**
 * Boundary: Right at camber GREEN/ORANGE boundary (0.15°)
 * Target -1.1°, measured -1.25° (delta: -0.15, exactly at boundary)
 */
export const boundaryGreenOrangeCamber = {
  camberBolt: 0,
  casterBolt: 0,
  neg20: -1.00,     // Measured
  zero: -1.25,      // Measured (delta: -0.15, at GREEN/ORANGE boundary)
  pos20: -1.50,     // Measured
};

/**
 * Boundary: Right at camber ORANGE/RED boundary (0.40°)
 * Target -1.1°, measured -1.50° (delta: -0.40, exactly at boundary)
 */
export const boundaryOrangeRedCamber = {
  camberBolt: 0,
  casterBolt: 0,
  neg20: -1.05,     // Measured
  zero: -1.50,      // Measured (delta: -0.40, at ORANGE/RED boundary)
  pos20: -1.95,     // Measured
};

/**
 * Null toe scenario: No toe measurement (zero value)
 * Useful for testing handling of missing/undefined data
 */
export const nullToeValue = {
  camberBolt: 0,
  casterBolt: 0,
  neg20: -1.08,     // Measured
  zero: -1.10,      // Measured (valid)
  pos20: -1.32,     // Measured (valid)
  toe: null,        // Null toe
};

/**
 * Different caster metrics: Specific values for caster testing
 * Uses CASTER_MULTIPLIER = 1.462
 */
export const casterMetrics = [
  // Excellent caster (within GREEN ±0.25°)
  {
    camberBolt: 0,
    casterBolt: 0,
    neg20: -1.05,
    zero: -1.11,
    pos20: -1.27,    // Implies caster ≈ 1.462 × 0.22 = 0.32°, within GREEN
  },
  // Good caster (within ORANGE ±0.60°)
  {
    camberBolt: 0,
    casterBolt: 0,
    neg20: -1.02,
    zero: -1.15,
    pos20: -1.44,    // Implies caster ≈ 1.462 × 0.42 = 0.61°, at/near RED
  },
  // Poor caster (RED > 0.60°)
  {
    camberBolt: 0,
    casterBolt: 0,
    neg20: -0.95,
    zero: -1.20,
    pos20: -1.50,    // Implies caster ≈ 1.462 × 0.55 = 0.80°, RED
  },
];

/**
 * Positive deltas: Target is positive reference
 * Useful for testing absolute value handling
 */
export const positiveTargetDeltas = {
  target: 0.5,      // Positive target
  measurements: [
    0.4,            // delta = -0.1, absDelta = 0.1
    0.5,            // delta = 0, absDelta = 0
    0.6,            // delta = +0.1, absDelta = 0.1
    0.75,           // delta = +0.25, absDelta = 0.25
    1.0,            // delta = +0.5, absDelta = 0.5
  ],
};

/**
 * Negative deltas: Target is negative reference
 * Tests with negative values (typical for camber)
 */
export const negativeTargetDeltas = {
  target: -1.1,     // Negative target (typical camber)
  measurements: [
    -0.95,          // delta = +0.15, absDelta = 0.15 (at camber GREEN boundary)
    -1.10,          // delta = 0, absDelta = 0
    -1.25,          // delta = -0.15, absDelta = 0.15
    -1.50,          // delta = -0.40, absDelta = 0.40 (at RED boundary)
    -1.60,          // delta = -0.50, absDelta = 0.50 (RED)
  ],
};

/**
 * Full 13×13 interpolated grid sample
 * Represents output of interpolateGrid() for testing report-engine calculations
 */
export const sampleInterpolatedGrid = Array.from({ length: 13 }, (_, fi) =>
  Array.from({ length: 13 }, (_, ri) => ({
    camberBolt: -6 + fi,
    casterBolt: -6 + ri,
    neg20: -1.0 + (fi * 0.05) + (ri * 0.03),
    zero: -1.1 + (fi * 0.05) + (ri * 0.03),
    pos20: -1.2 + (fi * 0.05) + (ri * 0.03),
    isInterpolated: fi % 2 === 1 || ri % 2 === 1,  // Some interpolated
  }))
);

/**
 * Zero values across all measurements
 * Edge case: All measurements are exactly 0.0
 */
export const allZeroMeasurements = {
  camberBolt: 0,
  casterBolt: 0,
  neg20: 0,
  zero: 0,
  pos20: 0,
};

/**
 * Large positive values
 * Tests handling of unrealistic/extreme values
 */
export const largePositiveValues = {
  camberBolt: 0,
  casterBolt: 0,
  neg20: 10.5,
  zero: 11.2,
  pos20: 12.0,
};

/**
 * Large negative values
 * Tests handling of extreme negative values
 */
export const largeNegativeValues = {
  camberBolt: 0,
  casterBolt: 0,
  neg20: -10.5,
  zero: -11.2,
  pos20: -12.0,
};
