/**
 * Other Fixtures: Special cases and constants edge cases
 */

/**
 * Caster multiplier edge case: Values that trigger CASTER_MULTIPLIER = 1.462
 * Tests calculation accuracy with specific multiplier
 */
export const casterMultiplierTestCases = [
  // Small delta (result: 1.462 × 0.1 = 0.1462)
  { neg20: -1.0, pos20: -1.1, expected: 0.1462 },
  // Medium delta (result: 1.462 × 0.5 = 0.731)
  { neg20: -1.0, pos20: -1.5, expected: 0.731 },
  // Large delta (result: 1.462 × 1.0 = 1.462)
  { neg20: -1.0, pos20: -2.0, expected: 1.462 },
  // Zero delta (result: 1.462 × 0.0 = 0)
  { neg20: -1.0, pos20: -1.0, expected: 0 },
];

/**
 * Color threshold edge case: Values exactly at tier boundaries
 * Camber thresholds: 0.15° (GREEN/ORANGE), 0.40° (ORANGE/RED)
 */
export const colorThresholdBoundaryCamber = [
  { absDelta: 0.14, expected: 'target-met' },      // Just within GREEN
  { absDelta: 0.15, expected: 'near-target' },     // At GREEN/ORANGE boundary (should be 'near-target' per <=)
  { absDelta: 0.16, expected: 'near-target' },     // Just outside GREEN
  { absDelta: 0.39, expected: 'near-target' },     // Just within ORANGE
  { absDelta: 0.40, expected: 'off-target' },      // At ORANGE/RED boundary (should be 'off-target')
  { absDelta: 0.41, expected: 'off-target' },      // Just outside ORANGE
];

/**
 * Color threshold edge case: Caster boundaries
 * Caster thresholds: 0.25° (GREEN/ORANGE), 0.60° (ORANGE/RED)
 */
export const colorThresholdBoundaryCaster = [
  { absDelta: 0.24, expected: 'target-met', metric: 'caster' },
  { absDelta: 0.25, expected: 'near-target', metric: 'caster' },
  { absDelta: 0.59, expected: 'near-target', metric: 'caster' },
  { absDelta: 0.60, expected: 'off-target', metric: 'caster' },
];

/**
 * Color threshold edge case: Toe boundaries
 * Toe thresholds: 0.10° (GREEN/ORANGE), 0.20° (ORANGE/RED)
 */
export const colorThresholdBoundaryToe = [
  { absDelta: 0.09, expected: 'target-met', metric: 'toe' },
  { absDelta: 0.10, expected: 'near-target', metric: 'toe' },
  { absDelta: 0.19, expected: 'near-target', metric: 'toe' },
  { absDelta: 0.20, expected: 'off-target', metric: 'toe' },
];

/**
 * Symmetry tolerance edge case: Camber boundaries
 * Camber symmetry tolerance: ±0.3° (SYMMETRY_TOLERANCE)
 */
export const symmetryToleranceBoundaryCamber = [
  { fl: -1.10, fr: -1.10, symmetric: true },       // Identical (within tolerance)
  { fl: -1.10, fr: -1.30, symmetric: true },       // Exactly at ±0.3° boundary
  { fl: -1.10, fr: -1.31, symmetric: false },      // Just outside ±0.3°
  { fl: -1.10, fr: -0.80, symmetric: true },       // At +0.3° boundary
  { fl: -1.10, fr: -0.79, symmetric: false },      // Just outside +0.3°
];

/**
 * Symmetry tolerance edge case: Caster boundaries
 * Caster symmetry tolerance: ±0.15°
 */
export const symmetryToleranceBoundaryCaster = [
  { fl: 5.0, fr: 5.0, symmetric: true },           // Identical
  { fl: 5.0, fr: 5.15, symmetric: true },          // At ±0.15° boundary
  { fl: 5.0, fr: 5.16, symmetric: false },         // Just outside ±0.15°
  { fl: 5.0, fr: 4.85, symmetric: true },          // At -0.15° boundary
  { fl: 5.0, fr: 4.84, symmetric: false },         // Just outside -0.15°
];

/**
 * Deltamath edge case: Negative deltas (measured < target)
 */
export const deltaMathNegative = [
  { value: -1.2, target: -1.1, expectedDelta: -0.1, expectedAbsDelta: 0.1 },
  { value: -1.5, target: -1.1, expectedDelta: -0.4, expectedAbsDelta: 0.4 },
];

/**
 * Delta math edge case: Positive deltas (measured > target)
 */
export const deltaMathPositive = [
  { value: -1.0, target: -1.1, expectedDelta: 0.1, expectedAbsDelta: 0.1 },
  { value: -0.7, target: -1.1, expectedDelta: 0.4, expectedAbsDelta: 0.4 },
];

/**
 * Delta math edge case: Zero delta (measured = target)
 */
export const deltaMathZero = [
  { value: -1.1, target: -1.1, expectedDelta: 0, expectedAbsDelta: 0 },
];

/**
 * Integer vs. float precision
 * Tests rounding and precision handling
 */
export const precisionTestCases = [
  { value: -1.125, target: -1.1, precision: 2 },
  { value: -1.1111, target: -1.1, precision: 4 },
  { value: -1.09999, target: -1.1, precision: 5 },
];
