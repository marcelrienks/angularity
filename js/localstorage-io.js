/**
 * localstorage-io.js — Consolidated localStorage module.
 *
 * Merged responsibilities (originally 3 modules):
 *   1. Grid state persistence (wheel measurements from 13×13 grid)
 *   2. Target value persistence (camber, caster, toe targets)
 *   3. Wheel data processing (loading, caching, transformation)
 *
 * Data schemas:
 *   Grid: 'mx5-nc1-alignment-{wheel}' → { frontBolt: { rearBolt: { neg20, zero, pos20 } } }
 *   Targets: 'alignment_target_*' → individual target values
 *   Toe: 'mx5-nc1-alignment-toe-{wheel}' → toe measurement
 */

import { WHEELS, FRONT_WHEELS, REAR_WHEELS, TARGET_CAMBER, TARGET_CASTER,
         TARGET_CAMBER_REAR, TARGET_TOE_FRONT, TARGET_TOE_REAR } from './constants.js';
import { parseCSV } from './csv-io.js';
import { processWheel, symmetryAnalysis } from './report-engine.js';

/**
 * Get the localStorage key for a specific wheel.
 * Uses per-wheel keys so clearing or loading one wheel doesn't affect the other.
 *
 * @param {string} wheel - 'FL' or 'FR'
 * @returns {string}
 */
function _getStorageKey(wheel) {
  return `mx5-nc1-alignment-${wheel}`;
}

function _getToeStorageKey(wheel) {
  return `mx5-nc1-alignment-toe-${wheel}`;
}

/**
 * Load the complete grid state from localStorage (both wheels).
 * Returns null values for wheels not in storage.
 *
 * @returns {Object<string, object|null>}
 */
export function loadFullGridState() {
  try {
    const state = {};
    for (const wheel of WHEELS) {
      const raw = localStorage.getItem(_getStorageKey(wheel));
      state[wheel] = raw ? JSON.parse(raw) : null;
    }
    return state;
  } catch (_) {
    return Object.fromEntries(WHEELS.map(wheel => [wheel, null]));
  }
}

/**
 * Load a single wheel's grid state from localStorage.
 *
 * @param {string} wheel - Wheel identifier
 * @returns {object|null} Wheel's grid state or null
 */
export function loadWheelFromStorage(wheel) {
  try {
    const raw = localStorage.getItem(_getStorageKey(wheel));
    return raw ? JSON.parse(raw) : null;
  } catch (_) {
    return null;
  }
}

/**
 * Load a single wheel toe measurement from localStorage.
 *
 * @param {string} wheel - Wheel identifier
 * @returns {number|null} Toe in mm per side, or null when missing/invalid
 */
export function loadWheelToeFromStorage(wheel) {
  try {
    const raw = localStorage.getItem(_getToeStorageKey(wheel));
    if (raw == null || raw === '') return null;
    const value = parseFloat(raw);
    return Number.isFinite(value) ? value : null;
  } catch (_) {
    return null;
  }
}

/**
 * Count filled positions in the required 5×5 grid (±6, ±3, 0, +3, +6).
 * A position is "filled" if at least one of neg20, zero, pos20 has a value.
 *
 * @param {object} wheelState - Grid state for one wheel
 * @param {array} requiredPositions - Required bolt values array
 * @returns {number} Count of filled required positions
 */
function countFilledRequiredPositions(wheelState, requiredPositions) {
  let count = 0;

  for (const frontBolt of requiredPositions) {
    // JSON.parse converts numeric keys to strings
    const fKey = wheelState[frontBolt] !== undefined ? frontBolt : String(frontBolt);
    if (!wheelState[fKey]) continue;

    for (const rearBolt of requiredPositions) {
      // JSON.parse converts numeric keys to strings
      const rKey = wheelState[fKey][rearBolt] !== undefined ? rearBolt : String(rearBolt);
      const cell = wheelState[fKey]?.[rKey];
      if (!cell) continue;

      const neg20 = (cell.neg20 ?? '').trim();
      const zero = (cell.zero ?? '').trim();
      const pos20 = (cell.pos20 ?? '').trim();

      if (neg20 || zero || pos20) {
        count++;
      }
    }
  }

  return count;
}

/**
 * Check if a wheel has sufficient data (≥25 required positions filled).
 *
 * A "required position" is one of the 5×5 grid combinations:
 * frontBolt ∈ {-6, -3, 0, 3, 6}
 * rearBolt ∈ {-6, -3, 0, 3, 6}
 *
 * @param {object} wheelState - Grid state for one wheel
 * @param {array} requiredPositions - Array of required bolt values
 * @returns {boolean} True if ≥25 required positions have values
 */
export function hasSufficientData(wheelState, requiredPositions) {
  if (!wheelState) return false;
  const filled = countFilledRequiredPositions(wheelState, requiredPositions);
  return filled >= 25;
}

/**
 * Count total filled positions across both wheels.
 * Used for progress display.
 *
 * @param {object} gridState - Full grid state keyed by wheel
 * @param {array} requiredPositions - Required positions array
 * @returns {object} Counts keyed by wheel plus total
 */
export function countPositionsFilled(gridState, requiredPositions) {
  const counts = {};
  let total = 0;

  for (const wheel of WHEELS) {
    const count = gridState[wheel] ? countFilledRequiredPositions(gridState[wheel], requiredPositions) : 0;
    counts[wheel] = count;
    total += count;
  }

  counts.total = total;
  return counts;
}

/**
 * Clear all alignment wheel data from localStorage.
 */
export function clearStorage() {
  try {
    for (const wheel of WHEELS) {
      localStorage.removeItem(_getStorageKey(wheel));
    }
  } catch (_) {
    // localStorage unavailable — fail silently
  }
}

// ────────────────────────────────────────────────────────────────────────────
// TARGET STORAGE (merged from targets-manager.js)
// ────────────────────────────────────────────────────────────────────────────

export const DEFAULT_CAMBER = -1.1;
export const DEFAULT_CASTER = 5.0;
export const DEFAULT_TOE_FRONT = 0.07;
export const DEFAULT_CAMBER_REAR = -1.5;
export const DEFAULT_TOE_REAR = 0.07;
export const DEFAULT_STEERING_RATIO = 15;

const STORAGE_KEY_CAMBER = 'alignment_target_camber';
const STORAGE_KEY_CASTER = 'alignment_target_caster';
const STORAGE_KEY_TOE_FRONT = 'alignment_target_toe_front';
const STORAGE_KEY_CAMBER_REAR = 'alignment_target_camber_rear';
const STORAGE_KEY_TOE_REAR = 'alignment_target_toe_rear';
const STORAGE_KEY_STEERING_RATIO = 'alignment_constant_steering_ratio';
const STORAGE_KEY_STEERING_RATIO_LEGACY = 'alignment_target_steering_ratio';

/**
 * Get saved or default target values
 */
export function getSavedCamber() {
  const stored = localStorage.getItem(STORAGE_KEY_CAMBER);
  return stored !== null ? parseFloat(stored) : DEFAULT_CAMBER;
}

export function getSavedCaster() {
  const stored = localStorage.getItem(STORAGE_KEY_CASTER);
  return stored !== null ? parseFloat(stored) : DEFAULT_CASTER;
}

export function getSavedToeFront() {
  const stored = localStorage.getItem(STORAGE_KEY_TOE_FRONT);
  return stored !== null ? parseFloat(stored) : DEFAULT_TOE_FRONT;
}

export function getSavedCamberRear() {
  const stored = localStorage.getItem(STORAGE_KEY_CAMBER_REAR);
  return stored !== null ? parseFloat(stored) : DEFAULT_CAMBER_REAR;
}

export function getSavedToeRear() {
  const stored = localStorage.getItem(STORAGE_KEY_TOE_REAR);
  return stored !== null ? parseFloat(stored) : DEFAULT_TOE_REAR;
}

export function getSavedSteeringRatio() {
  const stored = localStorage.getItem(STORAGE_KEY_STEERING_RATIO);
  if (stored !== null) return parseFloat(stored);

  const legacy = localStorage.getItem(STORAGE_KEY_STEERING_RATIO_LEGACY);
  return legacy !== null ? parseFloat(legacy) : DEFAULT_STEERING_RATIO;
}

/**
 * Save all targets to localStorage
 */
export function saveTargets(camber, caster, toeFront, camberRear, toeRear, steeringRatio = DEFAULT_STEERING_RATIO) {
  localStorage.setItem(STORAGE_KEY_CAMBER, camber.toString());
  localStorage.setItem(STORAGE_KEY_CASTER, caster.toString());
  localStorage.setItem(STORAGE_KEY_TOE_FRONT, toeFront.toString());
  localStorage.setItem(STORAGE_KEY_CAMBER_REAR, camberRear.toString());
  localStorage.setItem(STORAGE_KEY_TOE_REAR, toeRear.toString());
  localStorage.setItem(STORAGE_KEY_STEERING_RATIO, steeringRatio.toString());
  localStorage.setItem(STORAGE_KEY_STEERING_RATIO_LEGACY, steeringRatio.toString());
}

/**
 * Reset all targets to defaults
 */
export function resetTargets() {
  localStorage.removeItem(STORAGE_KEY_CAMBER);
  localStorage.removeItem(STORAGE_KEY_CASTER);
  localStorage.removeItem(STORAGE_KEY_TOE_FRONT);
  localStorage.removeItem(STORAGE_KEY_CAMBER_REAR);
  localStorage.removeItem(STORAGE_KEY_TOE_REAR);
  localStorage.removeItem(STORAGE_KEY_STEERING_RATIO);
  localStorage.removeItem(STORAGE_KEY_STEERING_RATIO_LEGACY);
}

// ────────────────────────────────────────────────────────────────────────────
// WHEEL DATA PROCESSING & CACHING (merged from report-data-layer.js)
// ────────────────────────────────────────────────────────────────────────────

/**
 * Cache for processed wheel results
 * @type {Object<string, object|null>}
 */
const resultsCache = Object.fromEntries(WHEELS.map(wheel => [wheel, null]));

/**
 * Get target values for a specific wheel
 * @param {string} wheel - Wheel ID (FL, FR, RL, RR)
 * @returns {object} { camber, caster, toe }
 */
export function getWheelTargets(wheel) {
  if (REAR_WHEELS.includes(wheel)) {
    return { camber: TARGET_CAMBER_REAR, caster: null, toe: TARGET_TOE_REAR };
  }
  return { camber: TARGET_CAMBER, caster: TARGET_CASTER, toe: TARGET_TOE_FRONT };
}

/**
 * Get processing options for a wheel
 * @param {string} wheel - Wheel ID
 * @returns {object} Processing options
 */
export function getWheelProcessingOptions(wheel) {
  const targets = getWheelTargets(wheel);
  return {
    gridSize: 13,
    interpolate: true,
    targetCamber: targets.camber,
    targetCaster: targets.caster,
    targetToe: targets.toe,
  };
}

/**
 * Get list of wheels that have data loaded
 * @returns {string[]} Array of wheel IDs with data
 */
export function getLoadedWheels() {
  return WHEELS.filter(wheel => resultsCache[wheel] !== null);
}

/**
 * Load all wheel data from localStorage
 * Tries to restore from localStorage; if insufficient, returns null for that wheel
 * @returns {Promise<void>}
 */
export async function loadFromLocalStorage() {
  for (const wheel of WHEELS) {
    try {
      const gridState = loadWheelFromStorage(wheel);
      const toeValue = loadWheelToeFromStorage(wheel);

      if (!gridState || !hasSufficientData(gridState)) {
        resultsCache[wheel] = null;
        continue;
      }

      // Convert grid state to rows for processing
      const rows = gridStateToRows(gridState, toeValue);
      const processedRows = convertRowsForProcessing(rows);

      // Process wheel data
      const options = getWheelProcessingOptions(wheel);
      const result = processWheel(processedRows, options);
      resultsCache[wheel] = result;
    } catch (err) {
      console.error(`Error loading wheel ${wheel} from storage:`, err);
      resultsCache[wheel] = null;
    }
  }
}

/**
 * Set up auto-refresh when localStorage changes
 * @param {Function} onDataChange - Callback when data changes
 * @returns {void}
 */
export function setupAutoRefresh(onDataChange) {
  window.addEventListener('storage', (e) => {
    if (!e.key) return; // Ignore clear() calls
    if (!e.key.startsWith('mx5-nc1')) return; // Ignore non-alignment storage

    // Reload all data and trigger refresh
    loadFromLocalStorage().then(() => {
      if (onDataChange) onDataChange();
    });
  });
}

/**
 * Convert grid state from localStorage to array of rows with full camber/caster data
 * @param {object} wheelState - Grid state from localStorage
 * @param {number|null} toeValue - Toe measurement
 * @returns {array} Array of { frontBolt, rearBolt, camber_neg20, camber_0, camber_pos20, toe }
 */
function gridStateToRows(wheelState, toeValue) {
  const rows = [];

  for (const frontBolt in wheelState) {
    const rearMap = wheelState[frontBolt];
    for (const rearBolt in rearMap) {
      const { neg20, zero, pos20 } = rearMap[rearBolt];

      rows.push({
        frontBolt: Number(frontBolt),
        rearBolt: Number(rearBolt),
        camber_neg20: parseFloat(neg20) || 0,
        camber_0: parseFloat(zero) || 0,
        camber_pos20: parseFloat(pos20) || 0,
        toe: parseFloat(toeValue) || 0,
      });
    }
  }

  return rows;
}

/**
 * Convert rows to the format expected by report-engine.processWheel()
 * @param {array} rows - Array of row objects from gridStateToRows
 * @returns {array} Formatted for processWheel
 */
function convertRowsForProcessing(rows) {
  return rows.map(row => ({
    frontBolt: row.frontBolt,
    rearBolt: row.rearBolt,
    neg20: row.camber_neg20,
    zero: row.camber_0,
    pos20: row.camber_pos20,
    isInterpolated: false, // All from CSV are measurements
  }));
}

/**
 * Handle file upload for a wheel
 * @param {File} file - CSV file
 * @param {string} wheel - Wheel ID
 * @returns {Promise<object>} { success: boolean, message: string, rowCount?: number }
 */
export async function handleFileUpload(file, wheel) {
  try {
    const csvText = await file.text();
    const gridState = parseCSV(csvText);

    // Store in cache
    const options = getWheelProcessingOptions(wheel);
    const rows = gridStateToRows(gridState, '0');
    const processedRows = convertRowsForProcessing(rows);
    const result = processWheel(processedRows, options);
    resultsCache[wheel] = result;

    // Count non-empty cells
    let rowCount = 0;
    for (const frontVal of Object.values(gridState)) {
      for (const cell of Object.values(frontVal)) {
        if (cell.zero) rowCount++;
      }
    }

    return {
      success: true,
      message: `Loaded ${rowCount} measurements`,
      rowCount,
    };
  } catch (err) {
    return {
      success: false,
      message: `Failed to load CSV: ${err.message}`,
    };
  }
}

/**
 * Get cached result for a wheel
 * @param {string} wheel - Wheel ID
 * @returns {object|null}
 */
export function getWheelResult(wheel) {
  return resultsCache[wheel];
}

/**
 * Get symmetry analysis for front axle
 * @returns {object|null}
 */
export function getSymmetryAnalysis() {
  const flResult = resultsCache['FL'];
  const frResult = resultsCache['FR'];

  if (!flResult || !frResult) return null;

  return symmetryAnalysis(flResult, frResult);
}

/**
 * Clear all cached data
 * @returns {void}
 */
export function invalidateCache() {
  for (const wheel of WHEELS) {
    resultsCache[wheel] = null;
  }
}
