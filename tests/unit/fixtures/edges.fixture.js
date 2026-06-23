/**
 * Edge Case Fixtures: Boundary conditions and corner cases
 */

/**
 * Bolt position boundaries: Minimum (-6, -6)
 */
export const boltPositionMin = [
  { frontBolt: -6, rearBolt: -6, neg20: -0.7, zero: -0.8, pos20: -0.9 },
];

/**
 * Bolt position boundaries: Maximum (+6, +6)
 */
export const boltPositionMax = [
  { frontBolt: 6, rearBolt: 6, neg20: -1.3, zero: -1.4, pos20: -1.5 },
];

/**
 * Bolt position boundaries: Mixed (min front, max rear)
 */
export const boltPositionMixed1 = [
  { frontBolt: -6, rearBolt: 6, neg20: -0.9, zero: -1.0, pos20: -1.1 },
];

/**
 * Bolt position boundaries: Mixed (max front, min rear)
 */
export const boltPositionMixed2 = [
  { frontBolt: 6, rearBolt: -6, neg20: -1.1, zero: -1.2, pos20: -1.3 },
];

/**
 * All corners of 13×13 grid
 * Tests interpolation from all boundary conditions
 */
export const allCorners = [
  { frontBolt: -6, rearBolt: -6, neg20: -0.7, zero: -0.8, pos20: -0.9 },
  { frontBolt: -6, rearBolt: 6, neg20: -0.9, zero: -1.0, pos20: -1.1 },
  { frontBolt: 6, rearBolt: -6, neg20: -1.1, zero: -1.2, pos20: -1.3 },
  { frontBolt: 6, rearBolt: 6, neg20: -1.3, zero: -1.4, pos20: -1.5 },
];

/**
 * Boundary interpolation: Query points at grid boundaries
 * All 13 front positions, one rear position
 */
export const boundaryInterpolationFrontAxis = Array.from(
  { length: 5 },
  (_, i) => ({ frontBolt: -6 + i * 3, rearBolt: -6, neg20: -0.7 - i * 0.1, zero: -0.8 - i * 0.1, pos20: -0.9 - i * 0.1 })
);

/**
 * Boundary interpolation: Query points at grid boundaries
 * One front position, all 13 rear positions
 */
export const boundaryInterpolationRearAxis = Array.from(
  { length: 5 },
  (_, i) => ({ frontBolt: -6, rearBolt: -6 + i * 3, neg20: -0.7 - i * 0.05, zero: -0.8 - i * 0.05, pos20: -0.9 - i * 0.05 })
);

/**
 * Extrapolation below range: Query point below minimum
 * All measurements at positive front positions
 */
export const extrapolationBelowFrontMin = [
  { frontBolt: 3, rearBolt: 0, neg20: -1.1, zero: -1.2, pos20: -1.3 },
  { frontBolt: 6, rearBolt: 0, neg20: -1.2, zero: -1.3, pos20: -1.4 },
];

/**
 * Extrapolation above range: Query point above maximum
 * All measurements at negative front positions
 */
export const extrapolationAboveFrontMax = [
  { frontBolt: -6, rearBolt: 0, neg20: -0.8, zero: -0.9, pos20: -1.0 },
  { frontBolt: -3, rearBolt: 0, neg20: -0.95, zero: -1.05, pos20: -1.15 },
];

/**
 * Value range: Minimum measurement values
 * All readings at lower bound
 */
export const valueRangeMinimum = [
  { frontBolt: 0, rearBolt: 0, neg20: -2.0, zero: -2.0, pos20: -2.0 },
];

/**
 * Value range: Maximum measurement values
 * All readings at upper bound
 */
export const valueRangeMaximum = [
  { frontBolt: 0, rearBolt: 0, neg20: 2.0, zero: 2.0, pos20: 2.0 },
];
