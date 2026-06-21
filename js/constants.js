/**
 * constants.js — Shared configuration for the MX5-NC1 Alignment V2 site.
 * Imported as an ES module by all other JS files.
 */

// ── Helper: Get stored or default value ─────────────────────────────────
function getStoredOrDefault(key, defaultValue) {
  const stored = localStorage.getItem(key);
  return stored !== null ? parseFloat(stored) : defaultValue;
}

function getStoredOrDefaultWithFallback(primaryKey, fallbackKey, defaultValue) {
  const primary = localStorage.getItem(primaryKey);
  if (primary !== null) return parseFloat(primary);

  const fallback = localStorage.getItem(fallbackKey);
  return fallback !== null ? parseFloat(fallback) : defaultValue;
}

function getStoredStringOrDefault(key, defaultValue) {
  const stored = localStorage.getItem(key);
  return stored !== null ? stored : defaultValue;
}

// ── Alignment targets ──────────────────────────────────────────────────────
// Read from localStorage if available, otherwise use defaults
// Front
export const TARGET_CAMBER = getStoredOrDefault('alignment_target_camber', -1.1);   // degrees (front)
export const TARGET_CASTER = getStoredOrDefault('alignment_target_caster', 5.0);   // degrees (front)
export const TARGET_TOE_FRONT = getStoredOrDefault('alignment_target_toe_front', 0.07);   // degrees per wheel
export const TARGET_STEERING_RATIO = getStoredOrDefaultWithFallback('alignment_constant_steering_ratio', 'alignment_target_steering_ratio', 15);   // steering ratio (x:1)
export const TARGET_CASTER_INPUT_MODE = getStoredStringOrDefault('alignment_constant_caster_input_mode', 'steering-ratio');   // 'steering-ratio' | 'wheel-degrees'
export const TARGET_CASTER_WHEEL_DEGREES = getStoredOrDefault('alignment_constant_caster_wheel_degrees', 24);   // explicit wheel steering angle
export const TARGET_WHEEL_DIAMETER = getStoredOrDefault('alignment_constant_wheel_diameter', 469);   // mm
// Rear
export const TARGET_CAMBER_REAR = getStoredOrDefault('alignment_target_camber_rear', -1.5);   // degrees (rear)
export const TARGET_TOE_REAR = getStoredOrDefault('alignment_target_toe_rear', 0.07);   // degrees per wheel

// Caster formula uses 360° steering wheel sweep and vehicle steering ratio.
// Effective wheel steer angle theta = 360 / steering_ratio.
// multiplier = 1 / (2 * sin(theta))
const _effectiveWheelAngle = TARGET_CASTER_INPUT_MODE === 'wheel-degrees'
  ? TARGET_CASTER_WHEEL_DEGREES
  : (360 / TARGET_STEERING_RATIO);
const _effectiveWheelAngleRad = _effectiveWheelAngle * (Math.PI / 180);
export const CASTER_MULTIPLIER = 1 / (2 * Math.sin(_effectiveWheelAngleRad));

// Measurement density options: 3, 5, 7, 9, 11, or 13 points
const MEASUREMENT_DENSITY_OPTIONS = [3, 5, 7, 9, 11, 13];

/**
 * Get the current measurement range based on density.
 * density 3 → range is -1 to +1 (3 values)
 * density 5 → range is -2 to +2 (5 values)
 * density 7 → range is -3 to +3 (7 values)
 * ...
 * density 13 → range is -6 to +6 (13 values)
 * Formula: rangeValue = (density - 1) / 2
 * @param {number} pointCount - 3, 5, 7, 9, 11, or 13
 * @returns {number} - The maximum absolute value (range is -value to +value)
 */
function _getCurrentMeasurementRange(pointCount) {
  if (!MEASUREMENT_DENSITY_OPTIONS.includes(pointCount)) {
    console.warn(`Invalid pointCount ${pointCount}, defaulting to 5`);
    pointCount = 5;
  }
  return Math.floor((pointCount - 1) / 2);
}

/**
 * Generate all positions for a given measurement density.
 * For 3-11: generates all integers from -N to +N
 * For 13: special case, generates from -6 to +6
 *
 * @param {number} pointCount - 3, 5, 7, 9, 11, or 13
 * @returns {number[]} - All positions in the corrected range
 */
function _generatePositions(pointCount) {
  if (!MEASUREMENT_DENSITY_OPTIONS.includes(pointCount)) {
    console.warn(`Invalid pointCount ${pointCount}, defaulting to 5`);
    pointCount = 5;
  }
  
  const range = _getCurrentMeasurementRange(pointCount);
  const positions = [];
  for (let i = -range; i <= range; i++) {
    positions.push(i);
  }
  return positions;
}

/**
 * Get the dynamic BOLT_MIN and BOLT_MAX based on current measurement density.
 * @returns {Object} - { min: number, max: number }
 */
export function getBoltRange() {
  const density = _getCurrentMeasurementDensity();
  const range = _getCurrentMeasurementRange(density);
  return { min: -range, max: range };
}

/**
 * Get all available bolt positions based on current measurement density.
 * @returns {number[]} - Sorted array of all positions from -N to +N
 */
export function getBoltPositions() {
  const density = _getCurrentMeasurementDensity();
  return _generatePositions(density);
}

// Legacy constants - for backward compatibility, but use getBoltRange() instead
export const BOLT_MIN = -6;
export const BOLT_MAX = 6;
export const BOLT_POSITIONS = [-6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6];

/**
 * Get current measurement density from localStorage, default to 5.
 * @returns {number}
 */
function _getCurrentMeasurementDensity() {
  const stored = localStorage.getItem('alignment_measurement_density');
  const density = stored ? parseInt(stored, 10) : 5;
  return MEASUREMENT_DENSITY_OPTIONS.includes(density) ? density : 5;
}

/**
 * Get required positions based on current measurement density.
 * @returns {number[]}
 */
export function getRequiredPositions() {
  const density = _getCurrentMeasurementDensity();
  return _generatePositions(density);
}

/**
 * Get current measurement density.
 * @returns {number}
 */
export function getCurrentMeasurementDensity() {
  return _getCurrentMeasurementDensity();
}

/**
 * Set measurement density and save to localStorage.
 * @param {number} density - 3, 5, 7, 9, 11, or 13
 */
export function setMeasurementDensity(density) {
  if (MEASUREMENT_DENSITY_OPTIONS.includes(density)) {
    localStorage.setItem('alignment_measurement_density', String(density));
  } else {
    console.warn(`Invalid density ${density}, keeping current`);
  }
}

/**
 * Get all available measurement density options.
 * @returns {number[]}
 */
export function getMeasurementDensityOptions() {
  return MEASUREMENT_DENSITY_OPTIONS;
}

// Deprecated: REQUIRED_POSITIONS is now dynamic, but exported for backward compatibility
export const REQUIRED_POSITIONS = [-6, -3, 0, 3, 6];

// ── Wheel identifiers ──────────────────────────────────────────────────────
export const WHEELS = ['FL', 'FR', 'RL', 'RR'];

export const FRONT_WHEELS = ['FL', 'FR'];
export const REAR_WHEELS = ['RL', 'RR'];

export const AXLE_BY_WHEEL = {
  FL: 'front',
  FR: 'front',
  RL: 'rear',
  RR: 'rear',
};

export const WHEEL_LABELS = {
  FL: 'Front Left',
  FR: 'Front Right',
  RL: 'Rear Left',
  RR: 'Rear Right',
};

// ── Colour palette (matches shared.css CSS variables) ─────────────────────
export const COLOURS = {
  blue:         '#58a6ff',
  green:        '#3fb950',
  orange:       '#d29922',
  purple:       '#bc8cff',
  red:          '#f85149',
  muted:        '#8b949e',
  mutedStrong:  '#6e7681',
  text:         '#e6edf3',
  subtle:       '#c9d1d9',
  bg:           '#0d1117',
  panel:        '#161b22',
  panelAlt:     '#11161d',
  border:       '#30363d',
};

// ── Proximity thresholds for colour coding ─────────────────────────────────
// |camber − TARGET_CAMBER| ≤ threshold → colour tier
export const CAMBER_THRESHOLDS = {
  targetMet:  0.15,   // ≤ 0.15° → green
  nearTarget: 0.40,   // ≤ 0.40° → orange
  // else → red
};

// Individual threshold exports for tests
export const CAMBER_GREEN_THRESHOLD = CAMBER_THRESHOLDS.targetMet;
export const CAMBER_ORANGE_THRESHOLD = CAMBER_THRESHOLDS.nearTarget;

export const CASTER_THRESHOLDS = {
  targetMet:  0.25,   // ≤ 0.25° → green
  nearTarget: 0.60,   // ≤ 0.60° → orange
};

// Individual threshold exports for tests
export const CASTER_GREEN_THRESHOLD = CASTER_THRESHOLDS.targetMet;
export const CASTER_ORANGE_THRESHOLD = CASTER_THRESHOLDS.nearTarget;

export const TOE_THRESHOLDS = {
  targetMet:  0.012,   // ≤ 0.012° per wheel (~0.10 mm) → green
  nearTarget: 0.031,   // ≤ 0.031° per wheel (~0.25 mm) → orange
};

// ── Symmetry tolerance for left-right matching ──────────────────────────────
// Used in symmetry analysis: wheels considered symmetric if camber and caster
// values differ by ≤ this amount. Used throughout the system.
export const SYMMETRY_TOLERANCE = 0.3;   // ±0.3° for both camber and caster
export const TOE_SYMMETRY_TOLERANCE = 0.031;   // ±0.031° per wheel (~0.25 mm) for toe
export const TOE_TOLERANCE = TOE_SYMMETRY_TOLERANCE;   // Alias for test compatibility

// ── Heatmap colour scale stops ─────────────────────────────────────────────
// Used for OPT-1 (camber), OPT-2 (caster), OPT-3 (combined)
// Range to display: centred on target, ± this many degrees
export const HEATMAP_CAMBER_RANGE = 1.5;   // display from TARGET_CAMBER ± 1.5°
export const HEATMAP_CASTER_RANGE = 2.0;   // display from TARGET_CASTER ± 2.0°

// ── localStorage keys ─────────────────────────────────────────────────────
export const LS_PREFIX = 'mx5nc1_align_v2_';

export function lsKey(wheel) {
  return `${LS_PREFIX}${wheel}`;
}

// ── Alignment presets (Phase 4 feature) ────────────────────────────────────
export const ALIGNMENT_PRESETS = {
  'flyin-miata': {
    name: 'Flyin Miata',
    description: 'Sportier setup (lower camber, more toe)',
    front: { camber: -1.0, caster: 5.0, toe: 0.60, steeringRatio: 15 },
    rear: { camber: -1.5, toe: 0.60 }
  },
  'fast-road': {
    name: 'Fast Road',
    description: 'Road-focused setup (more camber for tire wear)',
    front: { camber: -1.2, caster: 5.0, toe: 0.53, steeringRatio: 15 },
    rear: { camber: -1.5, toe: 0.53 }
  },
  'consolidated': {
    name: 'Consolidated',
    description: 'Balanced setup (street & spirited driving)',
    front: { camber: -1.1, caster: 5.0, toe: 0.56, steeringRatio: 15 },
    rear: { camber: -1.5, toe: 0.56 }
  }
};

export const DEFAULT_PRESET = 'consolidated';
