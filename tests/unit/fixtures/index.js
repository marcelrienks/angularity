/**
 * Fixture Index: Central export for all test fixtures
 * 
 * Imports all fixture variations from individual fixture files and re-exports
 * for convenient single-import usage in tests.
 * 
 * Usage:
 *   import { minimalGridFL, excellentCamberGoodCaster, allCorners, ... } from './index.js'
 */

// ── Grid Fixtures (13×13 interpolation test cases) ──────────────────────────
export {
  minimalGridSingleCenter,
  minimalGridDiagonal,
  minimalGridCluster3x3,
  minimalGridFL,
  minimalGridFR,
  denseGrid5x5,
  sparseGridBoundary,
  sparseGridCluster,
  singlePointGrid,
  singleRowGrid,
  singleColumnGrid,
  diagonalLineGrid,
  crossPatternGrid,
  emptyGrid,
} from './grids.fixture.js';

// ── Measurement Fixtures (specific test values for calculations) ────────────
export {
  excellentCamberGoodCaster,
  excellentCamberPoorCaster,
  poorCamberOrangeTier,
  veryPoorCamberRedTier,
  boundaryGreenOrangeCamber,
  boundaryOrangeRedCamber,
  nullToeValue,
  casterMetrics,
  positiveTargetDeltas,
  negativeTargetDeltas,
  sampleInterpolatedGrid,
  allZeroMeasurements,
  largePositiveValues,
  largeNegativeValues,
} from './measurements.fixture.js';

// ── Symmetry Fixtures (front-left/right and rear wheel pairs) ──────────────
export {
  flFrSymmetricCamber,
  flFrSymmetricCaster,
  flFrAsymmetricCamber,
  flFrAsymmetricCaster,
  rlRrSymmetricCamber,
  rlRrAsymmetricCamber,
  frontSymmetricRearSymmetric,
  frontAsymmetricRearSymmetric,
  frontSymmetricRearAsymmetric,
  frontOnlySymmetric,
  frontOnlyAsymmetric,
  allSymmetric,
  allAsymmetric,
} from './symmetry.fixture.js';

// ── Edge Case Fixtures (boundary conditions) ──────────────────────────────
export {
  boltPositionMin,
  boltPositionMax,
  boltPositionMixed1,
  boltPositionMixed2,
  allCorners,
  boundaryInterpolationFrontAxis,
  boundaryInterpolationRearAxis,
  extrapolationBelowFrontMin,
  extrapolationAboveFrontMax,
  valueRangeMinimum,
  valueRangeMaximum,
} from './edges.fixture.js';

// ── Null/Empty Fixtures (missing data handling) ────────────────────────────
export {
  allNullToe,
  partialNullToe,
  nullCasterRearWheel,
  emptyMeasurements,
  undefinedFields,
  nanValues,
  infinityValues,
} from './nulls.fixture.js';

// ── Other Fixtures (constants and edge cases) ──────────────────────────────
export {
  casterMultiplierTestCases,
  colorThresholdBoundaryCamber,
  colorThresholdBoundaryCaster,
  colorThresholdBoundaryToe,
  symmetryToleranceBoundaryCamber,
  symmetryToleranceBoundaryCaster,
  deltaMathNegative,
  deltaMathPositive,
  deltaMathZero,
  precisionTestCases,
} from './other.fixture.js';

// ── Legacy Washer Positions Fixtures ──────────────────────────────────────
export {
  washerAngles,
  markerCoordinates,
  positionDifferencePattern,
  circleValidation,
  angleRangeValidation,
} from './washer-positions.fixture.js';
