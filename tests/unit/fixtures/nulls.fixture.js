/**
 * Null/Empty Fixtures: Missing data and edge case handling
 */

/**
 * All null toe: Toe measurement is null/undefined across entire grid
 * Tests handling of missing metric
 */
export const allNullToe = [
  { frontBolt: -2, rearBolt: -2, neg20: -1.0, zero: -1.1, pos20: -1.2, toe: null },
  { frontBolt: 0, rearBolt: 0, neg20: -1.1, zero: -1.2, pos20: -1.3, toe: null },
  { frontBolt: 2, rearBolt: 2, neg20: -1.2, zero: -1.3, pos20: -1.4, toe: null },
];

/**
 * Partial null toe: Some measurements have toe, others don't
 * Tests mixed null handling
 */
export const partialNullToe = [
  { frontBolt: -2, rearBolt: -2, neg20: -1.0, zero: -1.1, pos20: -1.2 },  // No toe field
  { frontBolt: 0, rearBolt: 0, neg20: -1.1, zero: -1.2, pos20: -1.3, toe: 0.05 },  // Has toe
  { frontBolt: 2, rearBolt: 2, neg20: -1.2, zero: -1.3, pos20: -1.4, toe: null },  // Null toe
];

/**
 * Null caster (rear wheel): Caster is null/undefined
 * Expected for rear wheels (no caster adjustment available)
 */
export const nullCasterRearWheel = [
  { frontBolt: 0, rearBolt: 0, camber: -1.5, caster: null, targetCaster: null },
];

/**
 * Empty measurements: No measured rows
 * Tests graceful handling of completely empty input
 */
export const emptyMeasurements = [];

/**
 * Undefined field: Field is literally undefined
 * Tests typeof undefined handling
 */
export const undefinedFields = [
  { frontBolt: 0, rearBolt: 0, neg20: undefined, zero: -1.1, pos20: -1.2 },
  { frontBolt: 1, rearBolt: 1, neg20: -1.0, zero: undefined, pos20: -1.2 },
  { frontBolt: 2, rearBolt: 2, neg20: -1.0, zero: -1.1, pos20: undefined },
];

/**
 * NaN values: Field contains NaN
 * Tests NaN propagation and handling
 */
export const nanValues = [
  { frontBolt: 0, rearBolt: 0, neg20: NaN, zero: -1.1, pos20: -1.2 },
  { frontBolt: 1, rearBolt: 1, neg20: -1.0, zero: NaN, pos20: -1.2 },
];

/**
 * Infinity values: Field contains Infinity
 * Tests extreme value handling
 */
export const infinityValues = [
  { frontBolt: 0, rearBolt: 0, neg20: Infinity, zero: -1.1, pos20: -1.2 },
  { frontBolt: 1, rearBolt: 1, neg20: -1.0, zero: -Infinity, pos20: -1.2 },
];
