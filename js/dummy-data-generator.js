/**
 * dummy-data-generator.js — Pure algorithm for generating synthetic alignment data
 *
 * Exports functions to generate measurement grids for sample data in the app
 * and test data for integration tests.
 *
 * The algorithm (opposing sweeps):
 * - Camber IMPROVES left-to-right: from -3.2° (front=-6) to -0.5° (front=+6)
 *   Crosses target (-1.1°) around front=+1
 * - Caster DEGRADES left-to-right: from ~7.0° (front=-6) to ~3.0° (front=+6)
 *   Crosses target (5.0°) around front=0
 * - Creates opposing trade-off sweep across the dataset
 * - Wheel-specific variations add realistic differences between FL/FR
 */

export const BOLT_POSITIONS = [-6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6];
export const DEFAULT_STEERING_RATIO = 15;
const _effectiveWheelAngleRadians = (360 / DEFAULT_STEERING_RATIO) * (Math.PI / 180);
export const CASTER_MULTIPLIER = 1 / (2 * Math.sin(_effectiveWheelAngleRadians));
export const TARGET_CAMBER = -1.1;
export const TARGET_CASTER = 5.0;

/**
 * Generate exponential camber values (at 0° steering).
 * Centered curve: targets cross in the middle of the data range
 * 
 * - Start: -2.37° at front=-6 (slightly too negative)
 * - Mid: -1.10° at front=0 (target met - centered!)
 * - End: ~+0.70° at front=+6 (slightly too positive)
 * 
 * Uses gentler power law (base 2) for shallower curve.
 */
function generateCamberCurve(frontBolt, wheel = 'FL') {
  const normalized = (frontBolt + 6) / 12; // 0 to 1
  const exponential = Math.pow(2, normalized) - 1; // ~0 to 1 (gentler than base 3)
  
  // Wheel-specific offsets for realistic asymmetry
  const wheelOffset = wheel === 'FR' ? -0.12 : 
                      wheel === 'RL' ? 0.08 : 
                      wheel === 'RR' ? 0.05 : 0;
  
  // Centered curve: -2.371 + exponential * 3.071
  // This puts -1.1° target exactly at front=0
  const camber = -2.371 + exponential * 3.071 + wheelOffset;
  return camber;
}

/**
 * Generate exponential steering angle variation (REVERSED/DEGRADING).
 * 
 * Creates opposing trade-off with camber:
 * - Start: ~4.8° steering difference at front=-6 (high caster ~7.0°)
 * - End: ~2.1° steering difference at front=+6 (low caster ~3.0°)
 * - Cross target (steeringDiff=3.42, caster=5.0°) around front=0
 * 
 * Uses power law decay: steeringDiff = 2.05 + 2.74 * multiplier^normalized
 * Wheel-specific multipliers create subtle FL/FR variations.
 */
function generateSteeringVariation(frontBolt, wheel = 'FL') {
  const normalized = (frontBolt + 6) / 12; // 0 to 1
  
  // Wheel-specific multipliers for power law decay (creates opposing sweep)
  // Lower multiplier = steeper decay = greater caster drop
  const multiplier = wheel === 'FR' ? 0.32 : 
                     wheel === 'RL' ? 0.28 : 
                     wheel === 'RR' ? 0.31 : 0.30;  // FL: 0.30
  
  // Power law decay: high at front=-6, low at front=+6
  // steeringDiff = 2.05 + 2.74 * multiplier^normalized
  const decayFactor = Math.pow(multiplier, normalized);
  const steeringDiff = 2.05 + 2.74 * decayFactor;
  
  return steeringDiff;
}

/**
 * Calculate camber at three steering angles given base camber and steering variation.
 */
function calculateSteeringAngles(camberBase, steeringDiff, rearBolt) {
  // Add small rear bolt variation (±0.15°)
  const rearInfluence = (rearBolt / 6) * 0.15;
  const camber0 = camberBase + rearInfluence;
  
  // Apply ±20° steering
  const half = steeringDiff / 2;
  const camberNeg20 = camber0 - half;
  const camberPos20 = camber0 + half;
  
  return { camber0, camberNeg20, camberPos20 };
}

/**
 * Generate a complete 13×13 grid for a specific wheel.
 * Returns object: { [frontBolt]: { [rearBolt]: { neg20, zero, pos20 } } }
 */
export function generateGrid(wheel = 'FL') {
  const gridData = {};
  
  for (const frontBolt of BOLT_POSITIONS) {
    gridData[frontBolt] = {};
    const camberBase = generateCamberCurve(frontBolt, wheel);
    const steeringDiff = generateSteeringVariation(frontBolt, wheel);
    
    for (const rearBolt of BOLT_POSITIONS) {
      const { camber0, camberNeg20, camberPos20 } = calculateSteeringAngles(camberBase, steeringDiff, rearBolt);
      
      gridData[frontBolt][rearBolt] = {
        neg20: String(+(camberNeg20).toFixed(2)),
        zero:  String(+(camber0).toFixed(2)),
        pos20: String(+(camberPos20).toFixed(2))
      };
    }
  }
  
  return gridData;
}

/**
 * Generate realistic alignment data based on real FR measurement data.
 *
 * Model derived from real FR 5×5 alignment data:
 *   camber0 = base − 0.50·CmB + 0.12·CsB  (zero-steer camber, °)
 *   majorSwing = clamp(4.3 − 0.22·CmB + 0.30·CsB, 1.0, 8.0)
 *     — caster-induced camber gain when steered toward the outside of a turn
 *   minorSwing = clamp(1.9 − 0.27·CmB + 0.38·CsB, 0.3, 4.5)
 *     — caster-induced camber loss when steered toward the inside of a turn
 *
 * FR (right front): turning left puts FR on outside → large positive camber at neg20
 *   neg20 = camber0 + majorSwing,  pos20 = camber0 − minorSwing
 * FL (left front):  turning right puts FL on outside → large positive camber at pos20
 *   neg20 = camber0 − minorSwing,  pos20 = camber0 + majorSwing
 * RL/RR (rear):     no steering swing; camber follows bolt position; fixed toe per CsB.
 *
 * Each wheel has distinct base offsets so switching wheels shows different data.
 */
export function generateThreeColorGrid(wheel = 'FL', boltPositions = null) {
  const BP = boltPositions || BOLT_POSITIONS;
  const gridData = {};

  // Wheel-specific base camber at (CmB=0, CsB=0)
  const camber0Base = { FR: 0.0, FL: -0.10, RL: -0.55, RR: -0.50 }[wheel];
  // Slightly different CmB slope per wheel for realistic asymmetry
  const cmBRate    = { FR: -0.50, FL: -0.48, RL: -0.45, RR: -0.47 }[wheel];
  // Slightly different CsB slope per wheel
  const csBRate    = { FR:  0.12, FL:  0.13, RL:  0.10, RR:  0.11 }[wheel];

  const isRear = wheel === 'RL' || wheel === 'RR';

  for (const f of BP) {
    gridData[f] = {};
    for (const r of BP) {
      const camber0 = camber0Base + cmBRate * f + csBRate * r;

      if (isRear) {
        // Rear wheels: no steering swing — neg20/zero/pos20 all equal.
        // Toe-in varies with CsB: more positive CsB → slightly less toe-in.
        const toeBase = wheel === 'RL' ? 0.15 : 0.17;
        const toe = Math.max(0.05, toeBase - 0.015 * r).toFixed(2);
        const c0str = String(+camber0.toFixed(2));
        gridData[f][r] = { neg20: c0str, zero: c0str, pos20: c0str, toe };
      } else {
        // Front wheels: asymmetric caster-induced camber response at lock.
        // Wheel-specific scale factors produce distinct but similar FR/FL data.
        const mScale  = wheel === 'FL' ? 0.97 : 1.00;
        const miScale = wheel === 'FL' ? 1.02 : 1.00;

        const major = Math.min(8.0, Math.max(1.0, 4.3 - 0.22 * f + 0.30 * r)) * mScale;
        const minor = Math.min(4.5, Math.max(0.3, 1.9 - 0.27 * f + 0.38 * r)) * miScale;

        let neg20, pos20;
        if (wheel === 'FR') {
          // FR outside at left lock → big positive camber gain at neg20
          neg20 = camber0 + major;
          pos20 = camber0 - minor;
        } else {
          // FL outside at right lock → big positive camber gain at pos20
          neg20 = camber0 - minor;
          pos20 = camber0 + major;
        }

        gridData[f][r] = {
          neg20: String(+neg20.toFixed(2)),
          zero:  String(+camber0.toFixed(2)),
          pos20: String(+pos20.toFixed(2))
        };
      }
    }
  }

  return gridData;
}

/**
 * Generate a flat array of all measurements for a wheel.
 * Useful for sorting and analysis.
 */
export function generateMeasurements(wheel = 'FL') {
  const measurements = [];
  
  for (const frontBolt of BOLT_POSITIONS) {
    const camberBase = generateCamberCurve(frontBolt, wheel);
    const steeringDiff = generateSteeringVariation(frontBolt, wheel);
    
    for (const rearBolt of BOLT_POSITIONS) {
      const { camber0, camberNeg20, camberPos20 } = calculateSteeringAngles(camberBase, steeringDiff, rearBolt);
      const caster = CASTER_MULTIPLIER * Math.abs(camberPos20 - camberNeg20);
      
      measurements.push({
        frontBolt,
        rearBolt,
        camber0:     +(camber0).toFixed(2),
        camberNeg20: +(camberNeg20).toFixed(2),
        camberPos20: +(camberPos20).toFixed(2),
        caster:      +(caster).toFixed(3),
        camberDelta: Math.abs(camber0 - TARGET_CAMBER),
        casterDelta: Math.abs(caster - TARGET_CASTER)
      });
    }
  }
  
  return measurements;
}

/**
 * Test utility: Generate full 169-row dataset with derived caster values.
 * Used by integration tests to validate chart data.
 * 
 * Returns array of {frontBolt, rearBolt, camber, caster, camberDelta, casterDelta, score}
 */
export function generateTestRows169(wheel = 'FL') {
  const measurements = generateMeasurements(wheel);
  return measurements.map(m => ({
    frontBolt: m.frontBolt,
    rearBolt: m.rearBolt,
    camber: m.camber0,
    caster: m.caster,
    camberDelta: m.camberDelta,
    casterDelta: m.casterDelta,
    score: m.camberDelta + m.casterDelta
  }));
}

/**
 * Test utility: Aggregate rows by front bolt position.
 * Filters to rear bolt = 0 for each front bolt to show nominal curve.
 * Used by chart visualization to avoid jagging from mixed rear positions.
 * 
 * @param {Array} rows169 - Full measurement array from generateTestRows169
 * @returns {Array} Aggregated [{frontBolt, camber, caster}, ...]
 */
export function aggregateByFrontBolt(rows169) {
  const result = [];
  
  // Create a map for fast lookup: map[frontBolt][rearBolt] = row
  const map = {};
  for (const row of rows169) {
    if (!map[row.frontBolt]) map[row.frontBolt] = {};
    map[row.frontBolt][row.rearBolt] = row;
  }

  // For each front bolt position, get the row where rear bolt = 0
  const frontPositions = Object.keys(map).map(Number).sort((a, b) => a - b);
  
  for (const frontBolt of frontPositions) {
    const rearZeroRow = map[frontBolt][0];
    
    if (rearZeroRow) {
      result.push({
        frontBolt: rearZeroRow.frontBolt,
        camber: rearZeroRow.camber,
        caster: rearZeroRow.caster,
      });
    } else {
      // Fallback: if rear=0 not available, pick best available row for this front bolt
      const rowsForFront = Object.values(map[frontBolt]);
      if (rowsForFront.length > 0) {
        const bestRow = rowsForFront.reduce((best, row) => 
          row.score < best.score ? row : best
        );
        result.push({
          frontBolt: bestRow.frontBolt,
          camber: bestRow.camber,
          caster: bestRow.caster,
        });
      }
    }
  }

  return result;
}
