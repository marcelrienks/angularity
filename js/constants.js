/**
 * constants.js — Shared configuration for the MX5-NC1 Alignment V2 site.
 * Imported as an ES module by all other JS files.
 */

// ── Helper: Get stored or default value ─────────────────────────────────
function getStoredOrDefault(key, defaultValue) {
  const stored = localStorage.getItem(key);
  return stored !== null ? parseFloat(stored) : defaultValue;
}

// ── Alignment targets ──────────────────────────────────────────────────────
// Read from localStorage if available, otherwise use defaults
// Front
export const TARGET_CAMBER = getStoredOrDefault('alignment_target_camber', -1.1);   // degrees (front)
export const TARGET_CASTER = getStoredOrDefault('alignment_target_caster', 5.0);   // degrees (front)
export const TARGET_TOE_FRONT = getStoredOrDefault('alignment_target_toe_front', 0.58);   // mm per side
// Rear
export const TARGET_CAMBER_REAR = getStoredOrDefault('alignment_target_camber_rear', -1.5);   // degrees (rear)
export const TARGET_TOE_REAR = getStoredOrDefault('alignment_target_toe_rear', 0.58);   // mm per side

// Caster formula: caster ≈ CASTER_MULTIPLIER × |C_+20 − C_−20|
// Derived for a ±20° steering sweep on the NC1.
export const CASTER_MULTIPLIER = 1.462;

// ── Eccentric bolt grid ────────────────────────────────────────────────────
export const BOLT_MIN = -6;
export const BOLT_MAX =  6;
export const BOLT_POSITIONS = [-6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6]; // 13 positions

// Required measurement positions per bolt axis (minimum 25 combinations = 5×5)
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
  targetMet:  0.10,   // ≤ 0.10 mm → green
  nearTarget: 0.25,   // ≤ 0.25 mm → orange
};

// ── Symmetry tolerance for left-right matching ──────────────────────────────
// Used in symmetry analysis: wheels considered symmetric if camber and caster
// values differ by ≤ this amount. Used throughout the system.
export const SYMMETRY_TOLERANCE = 0.3;   // ±0.3° for both camber and caster
export const TOE_SYMMETRY_TOLERANCE = 0.1;   // ±0.10 mm per side for toe
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
    front: { camber: -1.0, caster: 5.0, toe: 0.60 },
    rear: { camber: -1.5, toe: 0.60 }
  },
  'fast-road': {
    name: 'Fast Road',
    description: 'Road-focused setup (more camber for tire wear)',
    front: { camber: -1.2, caster: 5.0, toe: 0.53 },
    rear: { camber: -1.5, toe: 0.53 }
  },
  'consolidated': {
    name: 'Consolidated',
    description: 'Balanced setup (street & spirited driving)',
    front: { camber: -1.1, caster: 5.0, toe: 0.56 },
    rear: { camber: -1.5, toe: 0.56 }
  }
};

export const DEFAULT_PRESET = 'consolidated';
