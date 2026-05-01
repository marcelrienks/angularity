/**
 * Math Utilities: Consolidated calculation functions
 * 
 * Consolidates repeated calculations across the codebase to:
 * - Eliminate code duplication
 * - Provide single source of truth for formulas
 * - Reduce bugs from inconsistent implementations
 * - Improve maintainability
 */

export const CASTER_MULTIPLIER = 1.462;

/**
 * Calculate caster from camber sweep readings
 * Formula: Caster ≈ 1.462 × |ΔCamber| where ΔCamber = camber change over ±20° steering
 * 
 * @param {number} camberNeg20 - Camber reading at -20° steering angle
 * @param {number} camberPos20 - Camber reading at +20° steering angle
 * @returns {number} Calculated caster value
 */
export function calculateCaster(camberNeg20, camberPos20) {
  return CASTER_MULTIPLIER * Math.abs(camberPos20 - camberNeg20);
}

/**
 * Calculate both signed and absolute delta from a value and target
 * 
 * @param {number} value - Measured value
 * @param {number} target - Target/reference value
 * @returns {object} Object with delta (signed) and absDelta (absolute)
 */
export function calculateDeltas(value, target) {
  const delta = value - target;
  return {
    delta,
    absDelta: Math.abs(delta),
  };
}

/**
 * Determine color tier based on delta and metric type
 * Uses thresholds defined in STYLING.md
 * 
 * Camber tiers (TARGET_CAMBER = -1.1°):
 *   - GREEN: ±0.15° → [−1.25° to −0.95°]
 *   - ORANGE: ±0.40° → [−1.50° to −0.70°]
 *   - RED: > ±0.40°
 * 
 * Caster tiers (TARGET_CASTER = 5.0°):
 *   - GREEN: ±0.25° → [4.75° to 5.25°]
 *   - ORANGE: ±0.60° → [4.40° to 5.60°]
 *   - RED: > ±0.60°
 * 
 * @param {number} absDelta - Absolute value of (measured - target)
 * @param {string} metric - Metric type: 'camber', 'caster', or 'toe'
 * @returns {string} CSS class name: 'target-met', 'near-target', or 'off-target'
 */
export function getColorThreshold(absDelta, metric = 'camber') {
  let thresholds;
  
  switch (metric) {
    case 'camber':
      thresholds = { green: 0.15, orange: 0.40 };
      break;
    case 'caster':
      thresholds = { green: 0.25, orange: 0.60 };
      break;
    case 'toe':
      thresholds = { green: 0.10, orange: 0.20 };
      break;
    default:
      thresholds = { green: 0.15, orange: 0.40 };
  }
  
  if (absDelta <= thresholds.green) return 'target-met';
  if (absDelta <= thresholds.orange) return 'near-target';
  return 'off-target';
}

/**
 * Format angle value with degree symbol
 * 
 * @param {number} degrees - Angle in degrees
 * @param {number} precision - Number of decimal places (default 2)
 * @returns {string} Formatted angle string with degree symbol
 */
export function formatAngle(degrees, precision = 2) {
  return `${degrees.toFixed(precision)}°`;
}

/**
 * Format millimeters for toe measurements
 * 
 * @param {number} mm - Measurement in millimeters
 * @param {number} precision - Number of decimal places (default 2)
 * @returns {string} Formatted measurement with mm suffix
 */
export function formatMillimeters(mm, precision = 2) {
  return `${mm.toFixed(precision)} mm`;
}
