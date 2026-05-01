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
 *   { frontBolt, rearBolt, neg20, zero, pos20, isInterpolated: boolean }
 */

import { BOLT_POSITIONS } from './constants.js';

/**
 * @typedef {{ frontBolt:number, rearBolt:number, neg20:number, zero:number, pos20:number }} MeasuredRow
 * @typedef {{ frontBolt:number, rearBolt:number, neg20:number, zero:number, pos20:number, isInterpolated:boolean }} GridCell
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

  // Get sorted numerical arrays of all front/rear positions that have measurements
  const frontMeasured = _sortedUniq(measuredRows.map(r => r.frontBolt));
  const rearMeasured  = _sortedUniq(measuredRows.map(r => r.rearBolt));

  // Result: 13×13 grid
  const grid = [];

  for (let fi = 0; fi < BOLT_POSITIONS.length; fi++) {
    const f = BOLT_POSITIONS[fi];
    const row = [];

    for (let ri = 0; ri < BOLT_POSITIONS.length; ri++) {
      const r = BOLT_POSITIONS[ri];

      // Use measured value if available
      if (measuredMap[f]?.[r] !== undefined) {
        row.push({
          frontBolt: f,
          rearBolt:  r,
          ...measuredMap[f][r],
          isInterpolated: false,
        });
        continue;
      }

      // Interpolate independently for each reading channel
      const neg20 = _bilinear(f, r, 'neg20', measuredMap, frontMeasured, rearMeasured);
      const zero  = _bilinear(f, r, 'zero',  measuredMap, frontMeasured, rearMeasured);
      const pos20 = _bilinear(f, r, 'pos20', measuredMap, frontMeasured, rearMeasured);

      row.push({ frontBolt: f, rearBolt: r, neg20, zero, pos20, isInterpolated: true });
    }

    grid.push(row);
  }

  return grid;
}

// ── Bilinear interpolation ─────────────────────────────────────────────────

/**
 * Bilinear interpolation (or extrapolation) for one channel at position (f, r).
 *
 * Finds the two nearest measured front-bolt values (above/below f) and the two
 * nearest measured rear-bolt values (above/below r), interpolates linearly on
 * each axis in turn.
 *
 * If f or r is outside the measured range, falls back to linear extrapolation
 * using the two nearest available points on that axis.
 *
 * @param {number} f           Target front bolt position
 * @param {number} r           Target rear bolt position
 * @param {'neg20'|'zero'|'pos20'} channel
 * @param {Object} map         measuredMap[front][rear] = {neg20, zero, pos20}
 * @param {number[]} fronts    Sorted array of measured front bolt positions
 * @param {number[]} rears     Sorted array of measured rear bolt positions
 * @returns {number}
 */
function _bilinear(f, r, channel, map, fronts, rears) {
  // Which two front bolt values bracket f?
  const [f0, f1] = _bracket(fronts, f);
  // Which two rear bolt values bracket r?
  const [r0, r1] = _bracket(rears, r);

  if (f0 === null || r0 === null) {
    // Only one measured position on an axis — return that value
    const sf = f0 ?? f1 ?? fronts[0];
    const sr = r0 ?? r1 ?? rears[0];
    return _get(map, sf, sr, channel, fronts, rears);
  }

  // Interpolate along rear axis at f0
  const v00 = _get(map, f0, r0, channel, fronts, rears);
  const v01 = _get(map, f0, r1, channel, fronts, rears);
  const atF0 = r0 === r1 ? v00 : _lerp(r0, v00, r1, v01, r);

  // Interpolate along rear axis at f1
  const v10 = _get(map, f1, r0, channel, fronts, rears);
  const v11 = _get(map, f1, r1, channel, fronts, rears);
  const atF1 = r0 === r1 ? v10 : _lerp(r0, v10, r1, v11, r);

  // Interpolate along front axis
  return f0 === f1 ? atF0 : _lerp(f0, atF0, f1, atF1, f);
}

/**
 * Get a measurement value from the map.
 * If the exact position isn't measured, returns the nearest measured point
 * on each axis (fallback for partial-grid extrapolation edge cases).
 */
function _get(map, f, r, channel, fronts, rears) {
  if (map[f]?.[r] !== undefined) return map[f][r][channel];

  // Find closest measured front row
  const cf = _nearest(fronts, f);
  // Find closest measured rear col
  const cr = _nearest(rears, r);

  return (map[cf]?.[cr] ?? {})[channel] ?? 0;
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
    const { frontBolt: f, rearBolt: r, neg20, zero, pos20 } = row;
    if (!map[f]) map[f] = {};
    map[f][r] = { neg20, zero, pos20 };
  }
  return map;
}

function _sortedUniq(arr) {
  return [...new Set(arr)].sort((a, b) => a - b);
}
