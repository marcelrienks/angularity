/**
 * Math Utilities: Consolidated calculation functions
 * 
 * Consolidates repeated calculations across the codebase to:
 * - Eliminate code duplication
 * - Provide single source of truth for formulas
 * - Reduce bugs from inconsistent implementations
 * - Improve maintainability
 */

export const DEFAULT_STEERING_WHEEL_SWEEP_DEGREES = 360;
export const DEFAULT_STEERING_RATIO = 15;
export const DEFAULT_WHEEL_DEGREES = 24;

/**
 * Calculate effective road wheel steering angle from steering wheel sweep and ratio.
 * Example: 360° steering wheel sweep with 15:1 ratio -> 24° road wheel angle.
 *
 * @param {number} steeringRatio - Steering ratio in X:1 form (e.g. 15 for 15:1)
 * @param {number} steeringWheelSweepDegrees - Steering wheel sweep in degrees
 * @returns {number} Effective road wheel steering angle in degrees
 */
export function calculateEffectiveWheelAngle(steeringRatio, steeringWheelSweepDegrees = DEFAULT_STEERING_WHEEL_SWEEP_DEGREES) {
  const ratio = Number(steeringRatio);
  const sweep = Number(steeringWheelSweepDegrees);

  if (!Number.isFinite(ratio) || ratio <= 0) {
    throw new Error(`Invalid steering ratio: ${steeringRatio}`);
  }
  if (!Number.isFinite(sweep) || sweep <= 0) {
    throw new Error(`Invalid steering wheel sweep: ${steeringWheelSweepDegrees}`);
  }

  return sweep / ratio;
}

function _resolveWheelDegrees(options, legacySweepArg) {
  if (typeof options === 'number') {
    return calculateEffectiveWheelAngle(options, legacySweepArg);
  }

  if (options && typeof options === 'object') {
    if (Object.prototype.hasOwnProperty.call(options, 'wheelDegrees')) {
      const wheelDegrees = Number(options.wheelDegrees);
      if (!Number.isFinite(wheelDegrees) || wheelDegrees <= 0) {
        throw new Error(`Invalid wheel degrees: ${options.wheelDegrees}`);
      }
      return wheelDegrees;
    }

    const steeringRatio = Object.prototype.hasOwnProperty.call(options, 'steeringRatio')
      ? Number(options.steeringRatio)
      : DEFAULT_STEERING_RATIO;
    const steeringWheelSweepDegrees = Object.prototype.hasOwnProperty.call(options, 'steeringWheelSweepDegrees')
      ? Number(options.steeringWheelSweepDegrees)
      : DEFAULT_STEERING_WHEEL_SWEEP_DEGREES;
    return calculateEffectiveWheelAngle(steeringRatio, steeringWheelSweepDegrees);
  }

  return DEFAULT_WHEEL_DEGREES;
}

/**
 * Calculate caster multiplier for a known steering angle sweep.
 * Formula: multiplier = 1 / (2 * sin(theta)), where theta is wheel steer angle.
 *
 * @param {number|{steeringRatio?:number, steeringWheelSweepDegrees?:number, wheelDegrees?:number}} [options]
 * @param {number} [legacySweepArg] - Backward-compatible sweep argument when first arg is number ratio
 * @returns {number} Caster multiplier
 */
export function calculateCasterMultiplier(options = DEFAULT_STEERING_RATIO, legacySweepArg = DEFAULT_STEERING_WHEEL_SWEEP_DEGREES) {
  const thetaDegrees = _resolveWheelDegrees(options, legacySweepArg);
  const thetaRadians = thetaDegrees * (Math.PI / 180);
  const denominator = 2 * Math.sin(thetaRadians);

  if (Math.abs(denominator) < Number.EPSILON) {
    throw new Error('Effective wheel angle is too small for a stable caster calculation.');
  }

  return 1 / denominator;
}

/**
 * Calculate caster from camber sweep readings
 * Formula: Caster ≈ multiplier × |ΔCamber| where
 * multiplier = 1 / (2 * sin(theta)) and theta = effective wheel angle.
 * 
 * @param {number} camberAtAcwSweep - Camber reading at 360° anti-clockwise steering wheel sweep
 * @param {number} camberAtCwSweep - Camber reading at 360° clockwise steering wheel sweep
 * @param {number|{steeringRatio?:number, steeringWheelSweepDegrees?:number}} [options]
 * @returns {number} Calculated caster value
 */
export function calculateCaster(camberAtAcwSweep, camberAtCwSweep, options = {}) {
  const multiplier = calculateCasterMultiplier(options);
  return multiplier * Math.abs(camberAtCwSweep - camberAtAcwSweep);
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

/**
 * Convert per-wheel toe angle (degrees) to resultant linear offset (mm).
 * Uses wheel diameter and small-angle geometry: offset = D * tan(theta).
 *
 * @param {number} toeDegreesPerWheel - Toe angle in degrees for one wheel
 * @param {number} wheelDiameterMm - Wheel diameter in millimeters
 * @returns {number} Resultant linear offset in mm for one wheel
 */
export function toeDegreesToResultantMm(toeDegreesPerWheel, wheelDiameterMm) {
  const toeDeg = Number(toeDegreesPerWheel);
  const diameter = Number(wheelDiameterMm);

  if (!Number.isFinite(toeDeg) || !Number.isFinite(diameter) || diameter <= 0) {
    throw new Error('Invalid toe degrees or wheel diameter for toe conversion.');
  }

  const theta = toeDeg * (Math.PI / 180);
  return diameter * Math.tan(theta);
}
