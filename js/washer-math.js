/**
 * js/washer-math.js — Pure math functions for washer diagram calculations
 *
 * Extracted from washer-diagram.js for unit testability.
 * These functions are pure (no side effects, no DOM access).
 *
 * Physical reference (MX5 NC1):
 *   - Bolt positions: -6 to +6 (13 positions)
 *   - Position 0 = 6 o-clock (90°), +6 = 3 o-clock (0°), -6 = 9 o-clock (180°)
 *   - Spacing: 15° per position (360° ÷ 24 tick marks)
 */

/**
 * calculateRotationAngle(boltPosition)
 *
 * Converts an eccentric bolt position to its SVG rotation angle.
 *
 * @param {number} boltPosition - Position from -6 to +6
 * @returns {number} - Rotation angle in degrees (0-360)
 *
 * Formula:
 *   - Center at 6 o-clock (90°)
 *   - +6 is 3 o-clock (0°)
 *   - -6 is 9 o-clock (180°)
 *   - 15° per position step
 *   angle = 90 - (boltPosition * 15)
 *
 * Examples:
 *   calculateRotationAngle(-6) → 180
 *   calculateRotationAngle(0) → 90
 *   calculateRotationAngle(6) → 0
 */
export function calculateRotationAngle(boltPosition) {
  if (!Number.isInteger(boltPosition) || boltPosition < -6 || boltPosition > 6) {
    throw new Error(`Invalid bolt position: ${boltPosition}. Must be integer -6 to +6.`);
  }

  const centerAngle = 90; // 6 o-clock
  const anglePerStep = 15; // 360° ÷ 24 total positions
  const angle = centerAngle - boltPosition * anglePerStep;

  // Normalize to 0-360 range
  return ((angle % 360) + 360) % 360;
}

/**
 * calculateMarkerCoordinates(boltPosition, radius, centerX, centerY)
 *
 * Calculates SVG (x, y) coordinates for a bolt position marker on a washer diagram.
 *
 * @param {number} boltPosition - Position from -6 to +6
 * @param {number} radius - Distance from center to marker (pixels or units)
 * @param {number} centerX - X coordinate of diagram center
 * @param {number} centerY - Y coordinate of diagram center
 * @returns {{ x: number, y: number }} - Marker position in SVG canvas
 *
 * Formula (standard trigonometry with SVG y-axis adjustment):
 *   angle = calculateRotationAngle(boltPosition)
 *   x = centerX + radius * cos(angle * π/180)
 *   y = centerY - radius * sin(angle * π/180)
 *
 * Note: SVG y-axis increases downward; we add sin() (not subtract) because the
 *   angle mapping already places 90° at the bottom (6 o'clock), making +sin correct.
 *
 * Examples (100×100 canvas, center (50, 50), radius 50):
 *   Position 0 (90°) → (50, 100) — 6 o-clock (bottom)
 *   Position +6 (0°) → (100, 50) — 3 o-clock (right)
 *   Position -6 (180°) → (0, 50) — 9 o-clock (left)
 */
export function calculateMarkerCoordinates(boltPosition, radius, centerX, centerY) {
  const angle = calculateRotationAngle(boltPosition);
  const angleRad = (angle * Math.PI) / 180; // Convert to radians

  const x = centerX + radius * Math.cos(angleRad);
  const y = centerY + radius * Math.sin(angleRad);  // SVG Y increases downward, so ADD sin

  return {
    x: Math.round(x * 100) / 100, // Round to 2 decimal places
    y: Math.round(y * 100) / 100,
  };
}

/**
 * validateBoltPosition(boltPosition)
 *
 * Validates that a bolt position is in valid range and type.
 *
 * @param {*} boltPosition - Value to validate
 * @returns {boolean} - True if valid
 * @throws {Error} - If invalid
 */
export function validateBoltPosition(boltPosition) {
  if (!Number.isInteger(boltPosition)) {
    throw new Error(`Bolt position must be an integer, got ${typeof boltPosition}: ${boltPosition}`);
  }

  if (boltPosition < -6 || boltPosition > 6) {
    throw new Error(`Bolt position must be between -6 and +6, got ${boltPosition}`);
  }

  return true;
}

/**
 * getAllBoltPositions()
 *
 * Returns all valid bolt positions (-6 to +6).
 *
 * @returns {number[]} - Array of all 13 positions
 */
export function getAllBoltPositions() {
  const positions = [];
  for (let i = -6; i <= 6; i++) {
    positions.push(i);
  }
  return positions;
}

/**
 * generateWasherMarkers(radius = 50, centerX = 50, centerY = 50)
 *
 * Generates all 13 marker coordinates for a complete washer diagram.
 *
 * @param {number} radius - Distance from center (default 50)
 * @param {number} centerX - Center X coordinate (default 50)
 * @param {number} centerY - Center Y coordinate (default 50)
 * @returns {Array} - Array of { position, angle, x, y }
 */
export function generateWasherMarkers(radius = 50, centerX = 50, centerY = 50) {
  return getAllBoltPositions().map((position) => {
    const angle = calculateRotationAngle(position);
    const coords = calculateMarkerCoordinates(position, radius, centerX, centerY);

    return {
      position,
      angle,
      x: coords.x,
      y: coords.y,
    };
  });
}
