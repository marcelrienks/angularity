/**
 * interpolation.js — Bilinear interpolation engine for the bolt grid.
 *
 * Takes a sparse set of actual measurements (up to 169) and fills in the
 * complete 13×13 grid using bilinear interpolation.  Applied independently
 * to each of the three readings (neg20, zero, pos20).
 *
 * Exported API:
 *   interpolateGrid(measuredRows) → GridCell[][]   (13×13, indexed by BOLT_POSITIONS)
 *
 * GridCell shape:
 *   { camberBolt, casterBolt, neg20, zero, pos20, isInterpolated: boolean }
 */

import { BOLT_POSITIONS } from './constants.js';

/**
 * @typedef {{ camberBolt:number, casterBolt:number, neg20:number, zero:number, pos20:number }} MeasuredRow
 * @typedef {{ camberBolt:number, casterBolt:number, neg20:number, zero:number, pos20:number, isInterpolated:boolean }} GridCell
 */

/**
 * Build a complete 13×13 grid of values from a sparse set of measured rows.
 *
 * @param {MeasuredRow[]} measuredRows
 * @returns {GridCell[][]}  Outer index = front bolt (BOLT_POSITIONS order),
 *                          Inner index = rear bolt (BOLT_POSITIONS order).
 */
export function interpolateGrid(measuredRows) {
  // Build a lookup map: measuredMap[frontBolt][rearBolt] = {neg20, zero, pos20}
  const measuredMap = _buildMap(measuredRows);

  // Get sorted numerical arrays of all camber/caster positions that have measurements
  const camberMeasured = _sortedUniq(measuredRows.map(r => r.camberBolt));
  const casterMeasured  = _sortedUniq(measuredRows.map(r => r.casterBolt));

  // Result: 13×13 grid
  const grid = [];

  for (let ci = 0; ci < BOLT_POSITIONS.length; ci++) {
    const c = BOLT_POSITIONS[ci];
    const row = [];

    for (let si = 0; si < BOLT_POSITIONS.length; si++) {
      const s = BOLT_POSITIONS[si];

      // Use measured value if available
      if (measuredMap[c]?.[s] !== undefined) {
        row.push({
          camberBolt: c,
          casterBolt:  s,
          ...measuredMap[c][s],
          isInterpolated: false,
        });
        continue;
      }

      // Interpolate independently for each reading channel
      const neg20 = _bilinear(c, s, 'neg20', measuredMap, camberMeasured, casterMeasured);
      const zero  = _bilinear(c, s, 'zero',  measuredMap, camberMeasured, casterMeasured);
      const pos20 = _bilinear(c, s, 'pos20', measuredMap, camberMeasured, casterMeasured);

      row.push({ camberBolt: c, casterBolt: s, neg20, zero, pos20, isInterpolated: true });
    }

    grid.push(row);
  }

  return grid;
}

// ── Bilinear interpolation ─────────────────────────────────────────────────

/**
 * Bilinear interpolation (or extrapolation) for one channel at position (c, s).
 *
 * Finds the two nearest measured camber-bolt values (above/below c) and the two
 * nearest measured caster-bolt values (above/below s), interpolates linearly on
 * each axis in turn.
 *
 * If c or s is outside the measured range, falls back to linear extrapolation
 * using the two nearest available points on that axis.
 *
 * @param {number} c           Target camber bolt position
 * @param {number} s           Target caster bolt position
 * @param {'neg20'|'zero'|'pos20'} channel
 * @param {Object} map         measuredMap[camber][caster] = {neg20, zero, pos20}
 * @param {number[]} cambers   Sorted array of measured camber bolt positions
 * @param {number[]} casters   Sorted array of measured caster bolt positions
 * @returns {number}
 */
function _bilinear(c, s, channel, map, cambers, casters) {
  // Which two camber bolt values bracket c?
  const [c0, c1] = _bracket(cambers, c);
  // Which two caster bolt values bracket s?
  const [s0, s1] = _bracket(casters, s);

  if (c0 === null || s0 === null) {
    // Only one measured position on an axis — return that value
    const sc = c0 ?? c1 ?? cambers[0];
    const ss = s0 ?? s1 ?? casters[0];
    return _get(map, sc, ss, channel, cambers, casters);
  }

  // Interpolate along caster axis at c0
  const v00 = _get(map, c0, s0, channel, cambers, casters);
  const v01 = _get(map, c0, s1, channel, cambers, casters);
  const atC0 = s0 === s1 ? v00 : _lerp(s0, v00, s1, v01, s);

  // Interpolate along caster axis at c1
  const v10 = _get(map, c1, s0, channel, cambers, casters);
  const v11 = _get(map, c1, s1, channel, cambers, casters);
  const atC1 = s0 === s1 ? v10 : _lerp(s0, v10, s1, v11, s);

  // Interpolate along camber axis
  return c0 === c1 ? atC0 : _lerp(c0, atC0, c1, atC1, c);
}

/**
 * Get a measurement value from the map.
 * If the exact position isn't measured, returns the nearest measured point
 * on each axis (fallback for partial-grid extrapolation edge cases).
 */
function _get(map, c, s, channel, cambers, casters) {
  if (map[c]?.[s] !== undefined) return map[c][s][channel];

  // Find closest measured camber row
  const cc = _nearest(cambers, c);
  // Find closest measured caster col
  const cs = _nearest(casters, s);

  return (map[cc]?.[cs] ?? {})[channel] ?? 0;
}

// ── Linear interpolation / extrapolation ──────────────────────────────────

/**
 * Linear interpolation (or extrapolation) from two known points.
 * Works for both interpolation and extrapolation.
 *
 * @param {number} x0  Known x position
 * @param {number} y0  Value at x0
 * @param {number} x1  Known x position
 * @param {number} y1  Value at x1
 * @param {number} x   Target x position
 */
function _lerp(x0, y0, x1, y1, x) {
  if (x0 === x1) return y0;
  const t = (x - x0) / (x1 - x0);
  return y0 + t * (y1 - y0);
}

// ── Bracket helpers ───────────────────────────────────────────────────────

/**
 * Find the two measured positions that bracket targetX.
 * Returns [below, above].
 * If targetX is below all measured positions → [first, second] (for extrapolation).
 * If targetX is above all measured positions → [last-1, last] (for extrapolation).
 * If only one measured position exists → [pos, null].
 */
function _bracket(sorted, targetX) {
  if (sorted.length === 0) return [null, null];
  if (sorted.length === 1) return [sorted[0], sorted[0]];

  // Find the position where sorted[i] <= targetX < sorted[i+1]
  for (let i = 0; i < sorted.length - 1; i++) {
    if (targetX >= sorted[i] && targetX <= sorted[i + 1]) {
      return [sorted[i], sorted[i + 1]];
    }
  }

  // Extrapolation: below range
  if (targetX < sorted[0]) return [sorted[0], sorted[1]];
  // Extrapolation: above range
  return [sorted[sorted.length - 2], sorted[sorted.length - 1]];
}

/**
 * Find the nearest value in a sorted array to target.
 */
function _nearest(sorted, target) {
  return sorted.reduce((best, v) =>
    Math.abs(v - target) < Math.abs(best - target) ? v : best
  );
}

// ── Utility ────────────────────────────────────────────────────────────────

function _buildMap(rows) {
  const map = {};
  for (const row of rows) {
    const { camberBolt: c, casterBolt: s, neg20, zero, pos20 } = row;
    if (!map[c]) map[c] = {};
    map[c][s] = { neg20, zero, pos20 };
  }
  return map;
}

function _sortedUniq(arr) {
  return [...new Set(arr)].sort((a, b) => a - b);
}
