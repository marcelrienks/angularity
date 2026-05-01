/**
 * dummy-data-generator.js — Pure algorithm for generating synthetic alignment data
 * 
 * Exports functions to generate measurement grids and individual measurements
 * for all wheel combinations (FL, FR, RL, RR).
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
export const CASTER_MULTIPLIER = 1.462;
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
 * Generate three-color test scenario data with clean diagonal slopes corner-to-corner.
 * 
 * Each wheel has DISTINCT camber values for wheel selection testing:
 * - FL Camber: top-left to bottom-right diagonal (high to low) — GREEN
 * - FL Caster: bottom-left to top-right diagonal (low to high) — opposite camber
 * - FR Camber: same slope as FL but offset -0.15° — verifies wheel switching shows different data
 * - FR Caster: reduced slope (ORANGE off-target)
 * - RL Camber: top-left to bottom-right diagonal, offset -0.10° — rear wheel variation
 * - RL Caster: consistent with camber pattern
 * - RR Camber: bottom-left to top-right diagonal with +0.20° offset — opposite RL, verifies wheel switching
 * - RR Caster: opposite sweep pattern
 * 
 * Used by "Load Sample Data" to demonstrate status indicators with clean chart slopes
 * AND allow validation that wheel selection properly switches between distinct datasets.
 */
export function generateThreeColorGrid(wheel = 'FL') {
  const BP = BOLT_POSITIONS;
  const gridData = {};
  
  // FL: GREEN camber (top-left to bottom-right), caster opposite (bottom-left to top-right)
  if (wheel === 'FL') {
    for (const f of BP) {
      gridData[f] = {};
      const nF = (f + 6) / 12; // 0 to 1
      
      // Camber diagonal: -3.2° (left) to +1.8° (right) — wider range, target -1.1° near center
      const camberBase = -3.2 + (5.0 * nF);
      
      // Steering diagonal OPPOSITE: 5.0 (left) to 1.5 (right) — creates bottom-left to top-right for caster
      const steeringDiff = 5.0 - (3.5 * nF);
      
      for (const r of BP) {
        const rearInfluence = (r / 6) * 0.12;
        const c0 = camberBase + rearInfluence;
        const half = steeringDiff / 2;
        
        gridData[f][r] = {
          neg20: String(+(c0 - half).toFixed(2)),
          zero: String(+(c0).toFixed(2)),
          pos20: String(+(c0 + half).toFixed(2))
        };
      }
    }
    return gridData;
  }
  
  // FR: GREEN camber (similar to FL but offset -0.15°), ORANGE caster (reduced/different slope)
  if (wheel === 'FR') {
    for (const f of BP) {
      gridData[f] = {};
      const nF = (f + 6) / 12;
      
      // Camber diagonal: offset -0.15° from FL — distinguishable during wheel selection testing
      const camberBase = -3.2 + (5.0 * nF) - 0.15;
      
      // Steering reduced: 3.8 (left) to 1.0 (right) — shallower slope = off-target (ORANGE)
      const steeringDiff = 3.8 - (2.8 * nF);
      
      for (const r of BP) {
        const rearInfluence = (r / 6) * 0.12;
        const c0 = camberBase + rearInfluence;
        const half = steeringDiff / 2;
        
        gridData[f][r] = {
          neg20: String(+(c0 - half).toFixed(2)),
          zero: String(+(c0).toFixed(2)),
          pos20: String(+(c0 + half).toFixed(2))
        };
      }
    }
    return gridData;
  }
  
  // RL: rear camber diagonal top-left to bottom-right with -0.10° offset for wheel selection testing
  if (wheel === 'RL') {
    for (const f of BP) {
      gridData[f] = {};
      const nF = (f + 6) / 12;
      
      // Camber diagonal: -3.5° (left) to +1.5° (right) — wider range, target near center, -0.10° offset for testing
      const camberBase = -3.5 + (5.0 * nF) - 0.10;
      
      // Steering for display (rear wheels show constant in input grid anyway)
      const steeringDiff = 5.2 - (3.2 * nF);
      
      for (const r of BP) {
        const rearInfluence = (r / 6) * 0.12;
        const c0 = camberBase + rearInfluence;
        const half = steeringDiff / 2;
        
        gridData[f][r] = {
          neg20: String(+(c0 - half).toFixed(2)),
          zero: String(+(c0).toFixed(2)),
          pos20: String(+(c0 + half).toFixed(2))
        };
      }
    }
    return gridData;
  }
  
  // RR: rear camber diagonal OPPOSITE with +0.20° offset for wheel selection testing
  if (wheel === 'RR') {
    for (const f of BP) {
      gridData[f] = {};
      const nF = (f + 6) / 12;
      
      // Camber diagonal OPPOSITE with offset: -1.2° (left) to +4.8° (right) — opposite slope, +0.20° offset from RL for testing
      const camberBase = -1.2 + (6.0 * nF) + 0.20;
      
      // Steering opposite slope: 1.8 (left) to 5.2 (right)
      const steeringDiff = 1.8 + (3.4 * nF);
      
      for (const r of BP) {
        const rearInfluence = (r / 6) * 0.12;
        const c0 = camberBase + rearInfluence;
        const half = steeringDiff / 2;
        
        gridData[f][r] = {
          neg20: String(+(c0 - half).toFixed(2)),
          zero: String(+(c0).toFixed(2)),
          pos20: String(+(c0 + half).toFixed(2))
        };
      }
    }
    return gridData;
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
 * Generate CSV rows (one row per measurement).
 * Returns array: [{ frontBolt, rearBolt, camberNeg20, camber0, camberPos20 }, ...]
 */
export function generateCSVRows(wheel = 'FL') {
  const measurements = generateMeasurements(wheel);
  return measurements.map(m => ({
    frontBolt: m.frontBolt,
    rearBolt: m.rearBolt,
    camberNeg20: m.camberNeg20,
    camber0: m.camber0,
    camberPos20: m.camberPos20
  }));
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
