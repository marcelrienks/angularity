/**
 * json-io.js — JSON serialization for grid state.
 *
 * exportGridToJSON(gridState, toeState, settings) → JSON string
 * importGridFromJSON(text) → { gridState, toeState, settings } or throws
 */

/**
 * Serialize the full grid state and capture settings to a pretty-printed JSON string.
 *
 * @param {object} gridState   Per-wheel per-cell measurement data
 * @param {object} toeState    Per-wheel global toe values
 * @param {{ measurementMode: string, measurementDensity: number }} settings
 * @returns {string}
 */
export function exportGridToJSON(gridState, toeState, settings) {
  return JSON.stringify({ version: 1, settings, gridState, toeState }, null, 2);
}

/**
 * Parse and validate a JSON string produced by exportGridToJSON.
 *
 * @param {string} text  Raw JSON text
 * @returns {{ gridState: object, toeState: object, settings: object|null }}
 * @throws {Error}  Descriptive message on invalid format
 */
export function importGridFromJSON(text) {
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (e) {
    throw new Error(`Invalid JSON: ${e.message}`);
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('JSON root must be an object.');
  }
  if (!parsed.gridState || typeof parsed.gridState !== 'object') {
    throw new Error('Missing or invalid "gridState" key.');
  }
  if (!parsed.toeState || typeof parsed.toeState !== 'object') {
    throw new Error('Missing or invalid "toeState" key.');
  }

  const settings = (parsed.settings && typeof parsed.settings === 'object') ? parsed.settings : null;

  return { gridState: parsed.gridState, toeState: parsed.toeState, settings };
}
