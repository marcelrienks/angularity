/**
 * Grid Fixtures: Sparse grid variations for interpolation testing
 * 
 * Each fixture represents a sparse set of measured points (1-169)
 * to be fed into interpolateGrid() for bilinear interpolation.
 * 
 * Fixtures include:
 * - Minimal grids (center point only)
 * - Dense grids (many measured points)
 * - Boundary cases (corners, edges)
 * - Clusters (groups of nearby points)
 * - Edge cases (single row/column, gaps)
 */

/**
 * Minimal grid: Single measured point at center (0, 0)
 * Tests fallback behavior when only one point is available
 */
export const minimalGridSingleCenter = [
  { frontBolt: 0, rearBolt: 0, neg20: -1.0, zero: -1.1, pos20: -1.2 },
];

/**
 * Minimal grid: Two diagonal points (corners)
 * Tests basic 2-point interpolation
 */
export const minimalGridDiagonal = [
  { frontBolt: -6, rearBolt: -6, neg20: -0.8, zero: -0.9, pos20: -1.0 },
  { frontBolt: 6, rearBolt: 6, neg20: -1.2, zero: -1.3, pos20: -1.4 },
];

/**
 * Minimal grid: 3×3 center cluster
 * Tests interpolation within small measured region
 */
export const minimalGridCluster3x3 = [
  { frontBolt: -2, rearBolt: -2, neg20: -1.0, zero: -1.1, pos20: -1.2 },
  { frontBolt: -2, rearBolt: 0, neg20: -1.0, zero: -1.0, pos20: -1.2 },
  { frontBolt: -2, rearBolt: 2, neg20: -1.0, zero: -0.9, pos20: -1.2 },
  { frontBolt: 0, rearBolt: -2, neg20: -1.1, zero: -1.1, pos20: -1.3 },
  { frontBolt: 0, rearBolt: 0, neg20: -1.1, zero: -1.1, pos20: -1.3 },
  { frontBolt: 0, rearBolt: 2, neg20: -1.1, zero: -1.1, pos20: -1.3 },
  { frontBolt: 2, rearBolt: -2, neg20: -1.2, zero: -1.2, pos20: -1.4 },
  { frontBolt: 2, rearBolt: 0, neg20: -1.2, zero: -1.2, pos20: -1.4 },
  { frontBolt: 2, rearBolt: 2, neg20: -1.2, zero: -1.2, pos20: -1.4 },
];

/**
 * FL (Front-Left) minimal: Realistic measured data
 * Based on actual alignment measurement workflow
 */
export const minimalGridFL = [
  { frontBolt: -2, rearBolt: -2, neg20: -0.95, zero: -1.05, pos20: -1.25 },
  { frontBolt: 0, rearBolt: 0, neg20: -1.05, zero: -1.15, pos20: -1.35 },
  { frontBolt: 2, rearBolt: 2, neg20: -1.15, zero: -1.25, pos20: -1.45 },
];

/**
 * FR (Front-Right) minimal: Realistic measured data
 */
export const minimalGridFR = [
  { frontBolt: -2, rearBolt: -2, neg20: -0.90, zero: -1.00, pos20: -1.20 },
  { frontBolt: 0, rearBolt: 0, neg20: -1.00, zero: -1.10, pos20: -1.30 },
  { frontBolt: 2, rearBolt: 2, neg20: -1.10, zero: -1.20, pos20: -1.40 },
];

/**
 * Dense grid: 5×5 complete cross measurements
 * Tests interpolation with more comprehensive data
 */
export const denseGrid5x5 = [
  // Front -6
  { frontBolt: -6, rearBolt: -6, neg20: -0.7, zero: -0.8, pos20: -0.9 },
  { frontBolt: -6, rearBolt: -3, neg20: -0.75, zero: -0.85, pos20: -0.95 },
  { frontBolt: -6, rearBolt: 0, neg20: -0.8, zero: -0.9, pos20: -1.0 },
  { frontBolt: -6, rearBolt: 3, neg20: -0.85, zero: -0.95, pos20: -1.05 },
  { frontBolt: -6, rearBolt: 6, neg20: -0.9, zero: -1.0, pos20: -1.1 },
  // Front -3
  { frontBolt: -3, rearBolt: -6, neg20: -0.8, zero: -0.9, pos20: -1.0 },
  { frontBolt: -3, rearBolt: -3, neg20: -0.9, zero: -1.0, pos20: -1.1 },
  { frontBolt: -3, rearBolt: 0, neg20: -0.95, zero: -1.05, pos20: -1.15 },
  { frontBolt: -3, rearBolt: 3, neg20: -1.0, zero: -1.1, pos20: -1.2 },
  { frontBolt: -3, rearBolt: 6, neg20: -1.05, zero: -1.15, pos20: -1.25 },
  // Front 0 (center row)
  { frontBolt: 0, rearBolt: -6, neg20: -0.9, zero: -1.0, pos20: -1.1 },
  { frontBolt: 0, rearBolt: -3, neg20: -1.0, zero: -1.1, pos20: -1.2 },
  { frontBolt: 0, rearBolt: 0, neg20: -1.05, zero: -1.15, pos20: -1.25 },
  { frontBolt: 0, rearBolt: 3, neg20: -1.1, zero: -1.2, pos20: -1.3 },
  { frontBolt: 0, rearBolt: 6, neg20: -1.15, zero: -1.25, pos20: -1.35 },
  // Front 3
  { frontBolt: 3, rearBolt: -6, neg20: -1.0, zero: -1.1, pos20: -1.2 },
  { frontBolt: 3, rearBolt: -3, neg20: -1.1, zero: -1.2, pos20: -1.3 },
  { frontBolt: 3, rearBolt: 0, neg20: -1.15, zero: -1.25, pos20: -1.35 },
  { frontBolt: 3, rearBolt: 3, neg20: -1.2, zero: -1.3, pos20: -1.4 },
  { frontBolt: 3, rearBolt: 6, neg20: -1.25, zero: -1.35, pos20: -1.45 },
  // Front 6
  { frontBolt: 6, rearBolt: -6, neg20: -1.1, zero: -1.2, pos20: -1.3 },
  { frontBolt: 6, rearBolt: -3, neg20: -1.15, zero: -1.25, pos20: -1.35 },
  { frontBolt: 6, rearBolt: 0, neg20: -1.2, zero: -1.3, pos20: -1.4 },
  { frontBolt: 6, rearBolt: 3, neg20: -1.25, zero: -1.35, pos20: -1.45 },
  { frontBolt: 6, rearBolt: 6, neg20: -1.3, zero: -1.4, pos20: -1.5 },
];

/**
 * Sparse grid with boundary points
 * Measures only at corners and edges
 */
export const sparseGridBoundary = [
  // Corners
  { frontBolt: -6, rearBolt: -6, neg20: -0.7, zero: -0.8, pos20: -0.9 },
  { frontBolt: -6, rearBolt: 6, neg20: -0.9, zero: -1.0, pos20: -1.1 },
  { frontBolt: 6, rearBolt: -6, neg20: -1.1, zero: -1.2, pos20: -1.3 },
  { frontBolt: 6, rearBolt: 6, neg20: -1.3, zero: -1.4, pos20: -1.5 },
  // Edge midpoints
  { frontBolt: 0, rearBolt: -6, neg20: -0.9, zero: -1.0, pos20: -1.1 },
  { frontBolt: 0, rearBolt: 6, neg20: -1.15, zero: -1.25, pos20: -1.35 },
  { frontBolt: -6, rearBolt: 0, neg20: -0.8, zero: -0.9, pos20: -1.0 },
  { frontBolt: 6, rearBolt: 0, neg20: -1.2, zero: -1.3, pos20: -1.4 },
  // Center
  { frontBolt: 0, rearBolt: 0, neg20: -1.05, zero: -1.15, pos20: -1.25 },
];

/**
 * Sparse grid with cluster gaps
 * Measures two clusters with gap in middle
 */
export const sparseGridCluster = [
  // Front-left cluster (negative quadrant)
  { frontBolt: -6, rearBolt: -6, neg20: -0.8, zero: -0.9, pos20: -1.0 },
  { frontBolt: -4, rearBolt: -4, neg20: -0.9, zero: -1.0, pos20: -1.1 },
  { frontBolt: -2, rearBolt: -2, neg20: -1.0, zero: -1.1, pos20: -1.2 },
  // Gap in middle (no measurements)
  // Rear-right cluster (positive quadrant)
  { frontBolt: 2, rearBolt: 2, neg20: -1.2, zero: -1.3, pos20: -1.4 },
  { frontBolt: 4, rearBolt: 4, neg20: -1.3, zero: -1.4, pos20: -1.5 },
  { frontBolt: 6, rearBolt: 6, neg20: -1.4, zero: -1.5, pos20: -1.6 },
];

/**
 * Single point grid: Only one measured cell
 * Tests nearest-neighbor fallback for all other 168 cells
 */
export const singlePointGrid = [
  { frontBolt: 0, rearBolt: 0, neg20: -1.1, zero: -1.2, pos20: -1.3 },
];

/**
 * Single row: All measurements along front axis only
 * Tests interpolation with gaps in rear axis
 */
export const singleRowGrid = [
  { frontBolt: -6, rearBolt: 0, neg20: -0.8, zero: -0.9, pos20: -1.0 },
  { frontBolt: -3, rearBolt: 0, neg20: -0.95, zero: -1.05, pos20: -1.15 },
  { frontBolt: 0, rearBolt: 0, neg20: -1.05, zero: -1.15, pos20: -1.25 },
  { frontBolt: 3, rearBolt: 0, neg20: -1.15, zero: -1.25, pos20: -1.35 },
  { frontBolt: 6, rearBolt: 0, neg20: -1.25, zero: -1.35, pos20: -1.45 },
];

/**
 * Single column: All measurements along rear axis only
 * Tests interpolation with gaps in front axis
 */
export const singleColumnGrid = [
  { frontBolt: 0, rearBolt: -6, neg20: -0.9, zero: -1.0, pos20: -1.1 },
  { frontBolt: 0, rearBolt: -3, neg20: -1.0, zero: -1.1, pos20: -1.2 },
  { frontBolt: 0, rearBolt: 0, neg20: -1.05, zero: -1.15, pos20: -1.25 },
  { frontBolt: 0, rearBolt: 3, neg20: -1.1, zero: -1.2, pos20: -1.3 },
  { frontBolt: 0, rearBolt: 6, neg20: -1.15, zero: -1.25, pos20: -1.35 },
];

/**
 * Diagonal line: Measurements along diagonal from corner to corner
 * Tests interpolation perpendicular to measured line
 */
export const diagonalLineGrid = [
  { frontBolt: -6, rearBolt: -6, neg20: -0.7, zero: -0.8, pos20: -0.9 },
  { frontBolt: -4, rearBolt: -4, neg20: -0.85, zero: -0.95, pos20: -1.05 },
  { frontBolt: -2, rearBolt: -2, neg20: -1.0, zero: -1.1, pos20: -1.2 },
  { frontBolt: 0, rearBolt: 0, neg20: -1.15, zero: -1.25, pos20: -1.35 },
  { frontBolt: 2, rearBolt: 2, neg20: -1.3, zero: -1.4, pos20: -1.5 },
  { frontBolt: 4, rearBolt: 4, neg20: -1.45, zero: -1.55, pos20: -1.65 },
  { frontBolt: 6, rearBolt: 6, neg20: -1.6, zero: -1.7, pos20: -1.8 },
];

/**
 * Cross pattern: Measurements along front and rear axes through center
 * Tests interpolation in four quadrants
 */
export const crossPatternGrid = [
  // Front axis (rear = 0)
  { frontBolt: -6, rearBolt: 0, neg20: -0.8, zero: -0.9, pos20: -1.0 },
  { frontBolt: -3, rearBolt: 0, neg20: -0.95, zero: -1.05, pos20: -1.15 },
  { frontBolt: 0, rearBolt: 0, neg20: -1.05, zero: -1.15, pos20: -1.25 },
  { frontBolt: 3, rearBolt: 0, neg20: -1.15, zero: -1.25, pos20: -1.35 },
  { frontBolt: 6, rearBolt: 0, neg20: -1.3, zero: -1.4, pos20: -1.5 },
  // Rear axis (front = 0)
  { frontBolt: 0, rearBolt: -6, neg20: -0.9, zero: -1.0, pos20: -1.1 },
  { frontBolt: 0, rearBolt: -3, neg20: -1.0, zero: -1.1, pos20: -1.2 },
  // { frontBolt: 0, rearBolt: 0, ... } already listed above
  { frontBolt: 0, rearBolt: 3, neg20: -1.1, zero: -1.2, pos20: -1.3 },
  { frontBolt: 0, rearBolt: 6, neg20: -1.2, zero: -1.3, pos20: -1.4 },
];

/**
 * Empty grid: No measured data (edge case)
 * Tests graceful handling of completely empty input
 */
export const emptyGrid = [];
