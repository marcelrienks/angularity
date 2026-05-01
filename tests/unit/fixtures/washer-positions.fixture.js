/**
 * washer-positions.fixture.js — Test data for washer diagram calculations
 *
 * Provides bolt positions, rotation angles, and marker coordinates for testing:
 * - Rotation angle calculations (position -> degrees)
 * - Marker coordinate calculations (position + radius -> x/y)
 * - Boundary conditions (corners, center)
 *
 * Physical Reference (MX5 NC1 washer diagram):
 *   - 0 = 6 o-clock (bottom)
 *   - +6 = 3 o-clock (right)
 *   - −6 = 9 o-clock (left)
 *   - Tick marks span bottom semicircle (180°)
 *   - 13 discrete positions = 15° per position step
 *
 * Accuracy: ±1° for angles (visual SVG rendering precision at 100px radius)
 */

/**
 * washerAngles — Bolt position to rotation angle mapping
 * Pattern: 15° per position step (360° ÷ 24 total tick marks)
 * Position -6 -> 180° (9 o-clock)
 * Position 0 -> 90° (6 o-clock)
 * Position +6 -> 0° (3 o-clock)
 */
export const washerAngles = {
  position_minus6: {
    boltPosition: -6,
    expectedAngle: 180,
    description: '9 o-clock (left)',
  },
  position_minus5: {
    boltPosition: -5,
    expectedAngle: 165,
    description: '15 degrees counterclockwise from left',
  },
  position_minus4: {
    boltPosition: -4,
    expectedAngle: 150,
    description: '30 degrees counterclockwise from left',
  },
  position_minus3: {
    boltPosition: -3,
    expectedAngle: 135,
    description: '45 degrees counterclockwise from left',
  },
  position_minus2: {
    boltPosition: -2,
    expectedAngle: 120,
    description: '60 degrees counterclockwise from left',
  },
  position_minus1: {
    boltPosition: -1,
    expectedAngle: 105,
    description: '75 degrees counterclockwise from left',
  },
  position_0: {
    boltPosition: 0,
    expectedAngle: 90,
    description: '6 o-clock (bottom/center)',
  },
  position_plus1: {
    boltPosition: 1,
    expectedAngle: 75,
    description: '75 degrees clockwise from bottom',
  },
  position_plus2: {
    boltPosition: 2,
    expectedAngle: 60,
    description: '60 degrees clockwise from bottom',
  },
  position_plus3: {
    boltPosition: 3,
    expectedAngle: 45,
    description: '45 degrees clockwise from bottom (between 3 o-clock and 6 o-clock)',
  },
  position_plus4: {
    boltPosition: 4,
    expectedAngle: 30,
    description: '30 degrees clockwise from bottom',
  },
  position_plus5: {
    boltPosition: 5,
    expectedAngle: 15,
    description: '15 degrees clockwise from bottom',
  },
  position_plus6: {
    boltPosition: 6,
    expectedAngle: 0,
    description: '3 o-clock (right)',
  },
};

/**
 * markerCoordinates — SVG (x, y) coordinates for bolt positions
 * Assumes 100x100 SVG canvas with center at (50, 50)
 * Radius = 50px (distance from center to tick mark)
 * Formula: x = centerX + radius * cos(angle), y = centerY - radius * sin(angle)
 *
 * Note: SVG y-axis increases downward; standard math uses upward.
 * Adjust: y = centerY - radius * sin(angle) converts properly.
 *
 * Accuracy: ±1 degree (visual SVG rendering limit, ±1.74px at 50px radius)
 */
export const markerCoordinates = {
  radius50: {
    center: { x: 50, y: 50 },
    radius: 50,

    position_minus6: {
      boltPosition: -6,
      angle: 180,
      x: 0,     // 50 + 50*cos(180°) = 50 - 50 = 0
      y: 50,    // 50 - 50*sin(180°) = 50 - 0 = 50
      description: '9 o-clock (left)',
    },
    position_minus3: {
      boltPosition: -3,
      angle: 135,
      x: 15,    // 50 + 50*cos(135°) ≈ 50 - 35.4 ≈ 15
      y: 85,    // 50 - 50*sin(135°) ≈ 50 - 35.4 ≈ 85
      description: '45 degrees from center, upper left',
    },
    position_0: {
      boltPosition: 0,
      angle: 90,
      x: 50,    // 50 + 50*cos(90°) = 50 + 0 = 50
      y: 100,   // 50 - 50*sin(90°) = 50 - 50 = 0 (6 o-clock, bottom)
      description: '6 o-clock (bottom)',
    },
    position_plus3: {
      boltPosition: 3,
      angle: 45,
      x: 85,    // 50 + 50*cos(45°) ≈ 50 + 35.4 ≈ 85
      y: 85,    // 50 - 50*sin(45°) ≈ 50 - 35.4 ≈ 85
      description: '45 degrees from center, lower right',
    },
    position_plus6: {
      boltPosition: 6,
      angle: 0,
      x: 100,   // 50 + 50*cos(0°) = 50 + 50 = 100
      y: 50,    // 50 - 50*sin(0°) = 50 - 0 = 50
      description: '3 o-clock (right)',
    },
  },

  radius100: {
    center: { x: 50, y: 50 },
    radius: 100, // Alternative radius for larger diagrams

    position_0: {
      boltPosition: 0,
      angle: 90,
      x: 50,    // Center + 0 horizontal
      y: 150,   // Center - 100 vertical (6 o-clock, bottom edge)
      description: '6 o-clock (bottom)',
    },
    position_plus6: {
      boltPosition: 6,
      angle: 0,
      x: 150,   // Center + 100 horizontal (3 o-clock, right edge)
      y: 50,    // Center
      description: '3 o-clock (right)',
    },
    position_minus6: {
      boltPosition: -6,
      angle: 180,
      x: -50,   // Center - 100 horizontal (9 o-clock, left edge)
      y: 50,    // Center
      description: '9 o-clock (left)',
    },
  },
};

/**
 * positionDifferencePattern — Validate that all positions differ by 15 degrees
 * Tests: every adjacent position differs by exactly 15 degrees
 */
export const positionDifferencePattern = {
  positionStep: 1,         // position -6 to -5 to -4, etc.
  angleStep: 15,           // degrees between positions
  pattern: 'all_positions_differ_by_15_degrees',
  testCases: [
    { from: -6, to: -5, expectedDelta: 15 },
    { from: -5, to: -4, expectedDelta: 15 },
    { from: -4, to: -3, expectedDelta: 15 },
    { from: -3, to: -2, expectedDelta: 15 },
    { from: -2, to: -1, expectedDelta: 15 },
    { from: -1, to: 0, expectedDelta: 15 },
    { from: 0, to: 1, expectedDelta: 15 },
    { from: 1, to: 2, expectedDelta: 15 },
    { from: 2, to: 3, expectedDelta: 15 },
    { from: 3, to: 4, expectedDelta: 15 },
    { from: 4, to: 5, expectedDelta: 15 },
    { from: 5, to: 6, expectedDelta: 15 },
  ],
};

/**
 * circleValidation — Verify that marker coordinates form a circle
 * All points should be equidistant (radius) from center
 * Used to validate coordinate calculations
 */
export const circleValidation = {
  radius: 50,
  center: { x: 50, y: 50 },
  description: 'All marker coordinates should form a perfect circle around center',
  tolerance: 1,  // ±1px tolerance for rounding/rendering
};

/**
 * angleRangeValidation — Verify angles cover full 360 degree rotation
 * 13 positions * 15 degree spacing covers 180 degrees (bottom semicircle)
 * Full rotation: 360 degrees
 */
export const angleRangeValidation = {
  minAngle: 0,
  maxAngle: 180,
  totalCoverage: '180 degrees (semicircle from 9 o-clock to 3 o-clock)',
  description: 'Washer diagram spans from -6 (180°) to +6 (0°), centered at 6 o-clock (90°)',
};
